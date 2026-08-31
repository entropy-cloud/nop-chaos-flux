import type {
  ComponentCapabilityResult,
  RendererEventHandler,
  ScopeRef,
} from '@nop-chaos/flux-core';
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
  seedManagedCollection: (next: TabsItemSchema[]) => void;
  getActiveValue: () => string;
  setActiveValue: (value: string) => void;
  events: Readonly<Partial<Record<'onTabAdd' | 'onTabClose' | 'onTabRename' | 'onTabMove', RendererEventHandler>>>;
  eventScope: ScopeRef;
  warnKey: string;
}

const removeLastWarnedKeys = new Set<string>();

function createTabsViewOps(input: TabsViewOpsInput): TabsViewOps {
  const { items, isControlledItems, events, eventScope } = input;

  const eventDispatchCtx = <T extends { type: string }>(payload: T) => ({
    event: payload,
    evaluationBindings: payload,
    scope: eventScope,
  });

  const commitCollection = (next: TabsItemSchema[]) => {
    if (input.scopeItemsActive && input.itemsStatePath) {
      input.renderScope.update(input.itemsStatePath, next);
      return;
    }
    input.seedManagedCollection(next);
  };

  const generateTabValue = (): string => `tab-${Date.now()}`;

  const warnRemoveLast = () => {
    if (!isDevTabsRuntime() || removeLastWarnedKeys.has(input.warnKey)) {
      return;
    }
    removeLastWarnedKeys.add(input.warnKey);
    console.warn(
      '[TabsRenderer] tabs-remove-last: the last remaining tab cannot be removed; an empty view collection would dangle the active pointer.',
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
    const source = items;
    const rawValue = item.value ?? item.key;
    const value = rawValue != null ? String(rawValue) : generateTabValue();
    const entry: TabsItemSchema = { ...item, value };
    const insertAt =
      typeof index === 'number' && Number.isFinite(index) && index >= 0 && index <= source.length
        ? Math.trunc(index)
        : source.length;
    const next = [...source.map((it) => ({ ...it }))];
    next.splice(insertAt, 0, entry);
    commitCollection(next);
    const payload = { type: 'tabs:tab-add', item: entry, index: insertAt };
    void events.onTabAdd?.(payload, eventDispatchCtx(payload));
    return { ok: true, value, index: insertAt };
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
    commitCollection(next);
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
    commitCollection(next);
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
    commitCollection(next);
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
