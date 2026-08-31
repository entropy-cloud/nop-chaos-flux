import type {
  ComponentCapabilityResult,
  RendererEventHandler,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import type { TabsItemSchema } from './schemas.js';
import { getItemValue, isDevTabsRuntime, resolveCandidateValue } from './tabs-utils.js';

export interface TabsViewOps {
  items: TabsItemSchema[];
  isControlledItems: boolean;
  runAddTab: (
    item: TabsItemSchema,
    index?: number,
  ) => { ok: boolean; value?: string; index?: number };
  runRemoveTab: (value: string) => { ok: boolean; nextActiveValue?: string };
  runRenameTab: (value: string, title: string) => { ok: boolean };
  runMoveTab: (value: string, toIndex: number) => { ok: boolean; toIndex?: number };
}

export interface TabsViewOpsInput {
  items: TabsItemSchema[];
  isControlledItems: boolean;
  scopeItemsActive: boolean;
  itemsStatePath?: string;
  renderScope: ScopeRef;
  seedManagedCollection: (
    next:
      | TabsItemSchema[]
      | ((prev: TabsItemSchema[] | null) => TabsItemSchema[]),
  ) => void;
  /** Schema-level base collection (fallback when the live state is unset). */
  readBaseCollection: () => TabsItemSchema[];
  getActiveValue: () => string;
  setActiveValue: (value: string) => void;
  events: Readonly<Partial<Record<'onTabAdd' | 'onTabClose' | 'onTabRename' | 'onTabMove', RendererEventHandler>>>;
  eventScope: ScopeRef;
  warnKey: string;
}

const removeLastWarnedKeys = new Set<string>();

// 13-03: monotonic generated-value counter — `Date.now()` collides when two
// addTab invokes land in the same tick (or the same millisecond).
let tabValueSequence = 0;

function createTabsViewOps(input: TabsViewOpsInput): TabsViewOps {
  const { items, isControlledItems, events, eventScope } = input;

  const eventDispatchCtx = <T extends { type: string }>(payload: T) => ({
    event: payload,
    evaluationBindings: payload,
    scope: eventScope,
  });

  const collectionHasValue = (collection: TabsItemSchema[], value: string) =>
    collection.some((item, i) => getItemValue(item, i) === value);

  const generateTabValue = (existing: TabsItemSchema[]): string => {
    let candidate: string;
    do {
      candidate = `tab-${++tabValueSequence}`;
    } while (collectionHasValue(existing, candidate));
    return candidate;
  };

  const warnRemoveLast = () => {
    if (!isDevTabsRuntime() || removeLastWarnedKeys.has(input.warnKey)) {
      return;
    }
    removeLastWarnedKeys.add(input.warnKey);
    console.warn(
      '[TabsRenderer] tabs-remove-last: the last remaining tab cannot be removed; an empty view collection would dangle the active pointer.',
    );
  };

  const warnAddDuplicate = (value: string) => {
    if (!isDevTabsRuntime()) {
      return;
    }
    console.warn(
      `[TabsRenderer] tabs-add-duplicate-value: addTab refused — value "${value}" already exists in the collection.`,
    );
  };

  // 13-03 (scope branch): read the collection truth from the scope at
  // invocation time instead of trusting a render-closure snapshot.
  const readScopeCollection = (): TabsItemSchema[] | undefined => {
    if (!input.scopeItemsActive || !input.itemsStatePath) {
      return undefined;
    }
    const snapshot = (input.renderScope.store?.getSnapshot() ??
      input.renderScope.readVisible()) as Record<string, unknown>;
    const found = getIn(snapshot, input.itemsStatePath);
    return Array.isArray(found) ? (found as TabsItemSchema[]) : undefined;
  };

  // 13-03: every mutation is expressed as (prev) => next and resolved against
  // the live collection at commit time — a render-closure snapshot committed
  // as an absolute value would drop same-tick sibling mutations.
  const commitCollection = (updater: (prev: TabsItemSchema[]) => TabsItemSchema[]) => {
    if (input.scopeItemsActive && input.itemsStatePath) {
      const prev = readScopeCollection() ?? input.readBaseCollection();
      const next = updater(prev);
      input.renderScope.update(input.itemsStatePath, next);
      return;
    }
    input.seedManagedCollection((prev) =>
      updater(Array.isArray(prev) ? prev : input.readBaseCollection()),
    );
  };

  const runAddTab = (
    item: TabsItemSchema,
    index?: number,
  ): { ok: boolean; value?: string; index?: number } => {
    if (isControlledItems || !item || typeof item !== 'object') {
      return { ok: false };
    }
    if (item.title == null && item.label == null) {
      return { ok: false };
    }
    const rawValue = item.value ?? item.key;
    const requestedValue = rawValue != null ? String(rawValue) : undefined;
    // 22-05: refuse a duplicate value up front (remove/rename guard precedent)
    // — duplicate React keys / duplicate trigger values break tab addressing.
    if (requestedValue !== undefined && collectionHasValue(items, requestedValue)) {
      warnAddDuplicate(requestedValue);
      return { ok: false };
    }
    const entryValue = requestedValue ?? generateTabValue(items);
    // 22-05 invariant (belt-and-braces for batched same-tick adds): if the
    // value still exists in the live prev, keep the collection unchanged.
    let outcome: { value: string; index: number } | null = null;
    commitCollection((prev) => {
      const base = prev.map((it) => ({ ...it }));
      if (collectionHasValue(base, entryValue)) {
        return prev;
      }
      const insertAt =
        typeof index === 'number' && Number.isFinite(index) && index >= 0 && index <= base.length
          ? Math.trunc(index)
          : base.length;
      base.splice(insertAt, 0, { ...item, value: entryValue });
      outcome = { value: entryValue, index: insertAt };
      return base;
    });
    const committed = outcome as { value: string; index: number } | null;
    if (!committed) {
      return { ok: false };
    }
    const entry: TabsItemSchema = { ...item, value: committed.value };
    const payload = { type: 'tabs:tab-add', item: entry, index: committed.index };
    void events.onTabAdd?.(payload, eventDispatchCtx(payload));
    return { ok: true, value: committed.value, index: committed.index };
  };

  const runRemoveTab = (value: string): { ok: boolean; nextActiveValue?: string } => {
    if (isControlledItems) {
      return { ok: false };
    }
    const source = items;
    const index = source.findIndex((item, i) => getItemValue(item, i) === value);
    if (index < 0) {
      return { ok: false };
    }
    if (source.length <= 1) {
      warnRemoveLast();
      return { ok: false };
    }
    const removed = source[index]!;
    const next = source.filter((_, i) => i !== index);
    const activeValue = input.getActiveValue();
    let nextActiveValue = activeValue;
    if (activeValue === value) {
      const candidate = resolveCandidateValue(next, value, source);
      if (candidate !== undefined && candidate !== activeValue) {
        input.setActiveValue(candidate);
        nextActiveValue = candidate;
      }
    }
    commitCollection(() => next);
    const closePayload = {
      type: 'tabs:tab-close',
      value,
      index,
      item: removed,
      nextActiveValue,
    };
    void events.onTabClose?.(closePayload, eventDispatchCtx(closePayload));
    return { ok: true, nextActiveValue };
  };

  const runRenameTab = (value: string, title: string): { ok: boolean } => {
    if (isControlledItems) {
      return { ok: false };
    }
    const source = items;
    const normalized = typeof title === 'string' ? title.trim() : '';
    const index = source.findIndex((item, i) => getItemValue(item, i) === value);
    if (index < 0 || normalized.length === 0) {
      return { ok: false };
    }
    const next = source.map((item, i) => (i === index ? { ...item, title: normalized } : item));
    commitCollection(() => next);
    const renamePayload = {
      type: 'tabs:tab-rename',
      value,
      index,
      title: normalized,
      item: next[index],
    };
    void events.onTabRename?.(renamePayload, eventDispatchCtx(renamePayload));
    return { ok: true };
  };

  const runMoveTab = (value: string, toIndex: number): { ok: boolean; toIndex?: number } => {
    if (isControlledItems) {
      return { ok: false };
    }
    const source = items;
    const fromIndex = source.findIndex((item, i) => getItemValue(item, i) === value);
    if (fromIndex < 0 || typeof toIndex !== 'number' || !Number.isFinite(toIndex)) {
      return { ok: false };
    }
    const clamped = Math.max(0, Math.min(source.length - 1, Math.trunc(toIndex)));
    const next = [...source];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(clamped, 0, moved!);
    commitCollection(() => next);
    const movePayload = { type: 'tabs:tab-move', value, fromIndex, toIndex: clamped };
    void events.onTabMove?.(movePayload, eventDispatchCtx(movePayload));
    return { ok: true, toIndex: clamped };
  };

  return {
    items,
    isControlledItems,
    runAddTab,
    runRemoveTab,
    runRenameTab,
    runMoveTab,
  };
}

interface TabsViewCapabilityInput {
  getOps: () => TabsViewOps | null;
  getActiveValue: () => string;
  setActiveValue: (value: string) => void;
  fallbackValue: string;
}

function createTabsViewCapabilities(input: TabsViewCapabilityInput): {
  invoke: (
    method: string,
    payload: Record<string, unknown> | undefined,
  ) => ComponentCapabilityResult;
  hasMethod: (method: string) => boolean;
  listMethods: () => readonly string[];
} {
  const refuse = (code: string): ComponentCapabilityResult => ({
    ok: false,
    error: new Error(code),
  });

  return {
    invoke(method, payload) {
      switch (method) {
        case 'setValue':
          input.setActiveValue(String(payload?.value ?? input.fallbackValue));
          return { ok: true, data: payload?.value };
        case 'getValue':
          return { ok: true, data: input.getActiveValue() };
        case 'addTab': {
          const ops = input.getOps();
          if (!ops) {
            return refuse('tabs-add-tab-refused');
          }
          const result = ops.runAddTab(
            (payload?.item ?? {}) as TabsItemSchema,
            typeof payload?.index === 'number' ? payload.index : undefined,
          );
          return result.ok
            ? { ok: true, data: { value: result.value, index: result.index } }
            : refuse('tabs-add-tab-refused');
        }
        case 'removeTab': {
          const ops = input.getOps();
          if (!ops) {
            return refuse('tabs-remove-tab-refused');
          }
          const result = ops.runRemoveTab(String(payload?.value ?? ''));
          return result.ok
            ? { ok: true, data: { nextActiveValue: result.nextActiveValue } }
            : refuse('tabs-remove-tab-refused');
        }
        case 'renameTab': {
          const ops = input.getOps();
          if (!ops) {
            return refuse('tabs-rename-tab-refused');
          }
          const result = ops.runRenameTab(String(payload?.value ?? ''), String(payload?.title ?? ''));
          return result.ok
            ? { ok: true, data: { value: String(payload?.value) } }
            : refuse('tabs-rename-tab-refused');
        }
        case 'moveTab': {
          const ops = input.getOps();
          if (!ops) {
            return refuse('tabs-move-tab-refused');
          }
          const result = ops.runMoveTab(String(payload?.value ?? ''), payload?.toIndex as number);
          return result.ok
            ? { ok: true, data: { toIndex: result.toIndex } }
            : refuse('tabs-move-tab-refused');
        }
        default:
          return refuse(`Unsupported tabs method: ${method}`);
      }
    },
    hasMethod(method) {
      return (
        method === 'setValue' ||
        method === 'getValue' ||
        method === 'addTab' ||
        method === 'removeTab' ||
        method === 'renameTab' ||
        method === 'moveTab'
      );
    },
    listMethods() {
      return ['setValue', 'getValue', 'addTab', 'removeTab', 'renameTab', 'moveTab'];
    },
  };
}

export { createTabsViewCapabilities, createTabsViewOps };
