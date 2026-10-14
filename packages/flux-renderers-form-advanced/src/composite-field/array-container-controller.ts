import React from 'react';
import type {
  CompiledRuntimeValue,
  FormRuntime,
  InstanceFrame,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import {
  useCompositeFieldHandle,
  useCurrentFormState,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { shouldValidateOn } from '@nop-chaos/flux-renderers-form';
import { COMPOSITE_EDITOR_METHODS } from './composite-editor-capability-contracts.js';
import {
  buildStableObjectItemKeys,
  useCompatibilityItemKeys,
  type ObjectItemKeyResolution,
} from './composite-item-keys.js';
import { isRemoveBlockedByWhen, isRemoveWhenConfigured } from './remove-when-gating.js';
import { createItemScope } from './array-field-runtime.js';
import { writeFieldValue } from '../write-field-value.js';

/**
 * Shared repeatable-items container skeleton (CX-14, plan 592): the dual
 * form/scope subscription, stable item identity + itemEntries, the
 * add/remove/move handler set with result-code semantics, and the composite
 * capability handle block — absorbed from four hand-written copies
 * (combo / input-table / array-editor / key-value). Every per-container
 * divergence is a parameter; zero declared behavior change. array-field is
 * excluded (plan G3).
 *
 * Contracts:
 *  - only flat/primitive-stable inputs cross the hook boundary; the returned
 *    handlers are identity-stable per render snapshot so the row memo
 *    comparators (ComboItem / InputTableRow / KeyValueRow) keep hitting;
 *  - internal itemsRef / pendingFocusRef are synced via effects (or written
 *    inside event handlers), never during render;
 *  - capability results keep the PRE-ADD stale length semantics and the
 *    bounds → minItems → gate decision order.
 */

type ArrayContainerAddDepth = 'subtree' | 'field';
type ArrayContainerRemoveValidateGate = 'shouldValidateOn' | 'always';
type ArrayContainerMinItemsGuard = 'handler' | 'button-only';
type ArrayContainerRemoveGate = 'handler+capability' | 'capability-only' | 'none';
type ArrayContainerUiAddMechanics = 'snapshot-replace' | 'live-append';
type ArrayContainerHandlerReads = 'snapshot' | 'itemsRef';
type ArrayContainerUiMoveBounds = 'both-bounds' | 'to-bounds';
type ArrayContainerFocusTiming = 'none' | 'rAF' | 'microtask';
type ArrayContainerIdentityMode = 'object-key' | 'entry-id';

interface ArrayContainerFocusRestore {
  timing: ArrayContainerFocusTiming;
  on: Array<'add' | 'remove'>;
}

interface ArrayContainerEvents {
  onAdd?: () => void;
  onRemove?: () => void;
  onReorder?: () => void;
}

interface ArrayContainerIdentity<TEntry> {
  /** 'object-key' (combo / input-table) vs 'entry-id' (array-editor / key-value). */
  mode: ArrayContainerIdentityMode;
  /** Preferred data-derived key field for object-kind items ('itemKey' / 'rowKey'). */
  keyProp?: string | undefined;
  /** Compatibility id prefix ('combo-' | 'row-' | 'item-' | 'pair-'). */
  compatPrefix: string;
  /** Full repeated-template id for instance frames ('combo-item:<id>' / 'input-table-row:<id>'). */
  repeatedTemplateId?: string | undefined;
  /** Whether per-item instance frames are built (combo / input-table only). */
  buildItemInstancePath: boolean;
  parentInstancePath?: readonly InstanceFrame[] | undefined;
  /** Duplicate preferred-key warning (combo / input-table only); byte-exact per container. */
  onDuplicateKeys?: ((duplicates: string[]) => void) | undefined;
  /** Entry minted for a UI (button) add. */
  uiNewEntryFactory: (items: TEntry[]) => TEntry;
  /** Entry minted for a capability addItem payload. */
  newEntryFactory: (value: unknown, items: TEntry[]) => TEntry;
}

export interface UseArrayContainerControllerParams<TRaw, TEntry> {
  id: string;
  cid?: number;
  type: string;
  name: string;
  parentForm: FormRuntime | undefined;
  parentScope: ScopeRef;
  isInteractive: () => boolean;
  /** Raw array reader applied to the stored value (per-container normalizer). */
  readRawValue: (value: unknown) => TRaw[];
  rawValuesEqual: (a: TRaw[] | undefined, b: TRaw[] | undefined) => boolean;
  /** Display-entry derivation from raw entries (entry-id fill for array-editor / key-value). */
  deriveItems: (raw: TRaw[], compatKeyAt: (index: number) => string) => TEntry[];
  identity: ArrayContainerIdentity<TEntry>;
  minItemsDefault: 0 | 1;
  minItems?: number | undefined;
  maxItems?: number | undefined;
  minItemsGuard: ArrayContainerMinItemsGuard;
  validate: {
    uiAddDepth: ArrayContainerAddDepth;
    capabilityAddDepth: 'field';
    removeDepth: 'subtree';
    removeValidateGate: ArrayContainerRemoveValidateGate;
  };
  /** UI add write mechanics: snapshot replace (combo / input-table) vs live append. */
  uiAddMechanics: ArrayContainerUiAddMechanics;
  /** Whether mutation handlers read the render snapshot or the live items ref. */
  handlerReads: ArrayContainerHandlerReads;
  /** Whether mutation handlers mirror the next array into itemsRef synchronously. */
  syncRefOnMutate: boolean;
  /** UI move bounds style: both endpoints checked (combo / input-table) vs to-only. */
  uiMoveBounds: ArrayContainerUiMoveBounds;
  /** removeWhen gate placement (combo: handler+capability; input-table: capability-only). */
  removeGate: ArrayContainerRemoveGate;
  removeWhen?: {
    handle: CompiledRuntimeValue<unknown> | undefined;
    disabled: boolean;
    evaluateCompiled: (compiled: CompiledRuntimeValue<unknown>, scope: ScopeRef) => unknown;
  } | undefined;
  focusRestore: ArrayContainerFocusRestore;
  events: ArrayContainerEvents;
}

interface ArrayContainerItemEntry<TEntry> {
  item: TEntry;
  index: number;
  itemIdentity: string;
  itemInstancePath: readonly InstanceFrame[] | undefined;
}

interface UseArrayContainerControllerReturn<TEntry> {
  items: TEntry[];
  itemEntries: Array<ArrayContainerItemEntry<TEntry>>;
  atMaxItems: boolean;
  minItems: number;
  maxItems: number | undefined;
  itemsRef: React.RefObject<TEntry[]>;
  handleAdd: () => void;
  handleRemove: (index: number) => void;
  handleMove: (from: number, to: number) => void;
  handleMoveUp: (index: number) => void;
  handleMoveDown: (index: number) => void;
  isRemoveBlockedAt: (index: number) => boolean;
  /** Whole-array sync (row edits / scope fallback) — array-editor `syncItems` / key-value `syncField`. */
  syncAll: (next: TEntry[]) => void;
  /** rAF focus timing (array-editor): register per-item inputs + the add-button fallback ref. */
  registerItemInput: (itemIdentity: string, element: unknown) => void;
  addButtonRef: React.RefObject<HTMLButtonElement | null>;
  /** microtask focus timing (key-value): register per-index remove buttons. */
  registerRemoveButton: (index: number, button: HTMLButtonElement | null) => void;
}

function resolveFloor(value: number | undefined, fallback: 0 | 1): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

function resolveCap(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : undefined;
}

function spliceMoved<TEntry>(items: TEntry[], from: number, to: number): TEntry[] | undefined {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  if (!moved) {
    return undefined;
  }
  next.splice(to, 0, moved);
  return next;
}

export function useArrayContainerController<TRaw, TEntry>(
  params: UseArrayContainerControllerParams<TRaw, TEntry>,
): UseArrayContainerControllerReturn<TEntry> {
  const {
    id,
    cid,
    type,
    name,
    parentForm,
    parentScope,
    isInteractive,
    readRawValue,
    rawValuesEqual,
    deriveItems,
    identity,
    minItemsDefault,
    minItems: minItemsProp,
    maxItems: maxItemsProp,
    minItemsGuard,
    validate,
    uiAddMechanics,
    handlerReads,
    syncRefOnMutate,
    uiMoveBounds,
    removeGate,
    removeWhen,
    focusRestore,
    events,
  } = params;
  const { uiAddDepth, capabilityAddDepth, removeDepth, removeValidateGate } = validate;
  const { mode: identityMode, keyProp, compatPrefix, onDuplicateKeys } = identity;

  const hasName = name.length > 0;

  const formValue = useCurrentFormState(
    (state) => (parentForm && hasName ? readRawValue(getIn(state.values, name)) : undefined),
    rawValuesEqual,
    { enabled: Boolean(parentForm && hasName), path: hasName ? name : undefined },
  );
  const scopeValue = useScopeSelector(
    (scopeData) => (parentForm || !hasName ? undefined : readRawValue(getIn(scopeData, name))),
    rawValuesEqual,
    { enabled: Boolean(!parentForm && hasName), fallback: undefined, paths: hasName ? [name] : undefined },
  );
  const raw = parentForm ? formValue : scopeValue;
  const emptyItems = React.useMemo(() => [] as TRaw[], []);
  const rawItems: TRaw[] = raw ?? emptyItems;

  const minItems = resolveFloor(minItemsProp, minItemsDefault);
  const maxItems = resolveCap(maxItemsProp);

  const {
    keyAt: compatKeyAt,
    removeAt: compatRemoveAt,
    append: compatAppend,
    move: compatMove,
  } = useCompatibilityItemKeys(rawItems.length, compatPrefix);

  const items = React.useMemo<TEntry[]>(
    () => deriveItems(rawItems, compatKeyAt),
    [rawItems, compatKeyAt, deriveItems],
  );

  const itemsRef = React.useRef<TEntry[]>(items);
  const pendingFocusRef = React.useRef<{ kind: 'add' } | { kind: 'remove'; index: number } | null>(null);
  const inputRefs = React.useRef<Map<string, unknown>>(new Map());
  const addButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const removeButtonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const objectItemKeyResolution = React.useMemo<ObjectItemKeyResolution>(
    () => buildStableObjectItemKeys(items as unknown[], keyProp, compatKeyAt),
    [items, keyProp, compatKeyAt],
  );

  const itemEntries = React.useMemo(
    () =>
      items.map((item, index) => {
        const itemIdentity =
          identityMode === 'object-key'
            ? objectItemKeyResolution.itemKeys[index]
            : (item as { id?: string }).id ?? compatKeyAt(index);
        const itemInstancePath = identity.buildItemInstancePath
          ? [
              ...(identity.parentInstancePath ?? []),
              {
                repeatedTemplateId: identity.repeatedTemplateId ?? '',
                instanceKey: itemIdentity,
              },
            ]
          : undefined;
        return { item, index, itemIdentity, itemInstancePath };
      }),
    [items, identityMode, compatKeyAt, objectItemKeyResolution, identity],
  );

  React.useEffect(() => {
    if (identityMode !== 'object-key' || !onDuplicateKeys) {
      return;
    }
    if (objectItemKeyResolution.duplicatePreferredKeys.length === 0) {
      return;
    }
    onDuplicateKeys(objectItemKeyResolution.duplicatePreferredKeys);
  }, [identityMode, onDuplicateKeys, objectItemKeyResolution]);

  const removeBlockedByIndex = React.useMemo(() => {
    if (removeGate === 'none' || !isRemoveWhenConfigured(removeWhen?.handle)) {
      return null;
    }
    return items.map((_, index) => {
      const itemIdentity = objectItemKeyResolution.itemKeys[index];
      const itemScope = createItemScope(
        parentScope,
        name,
        index,
        'object',
        removeWhen?.disabled ?? false,
        itemIdentity,
      );
      return isRemoveBlockedByWhen({
        removeWhenHandle: removeWhen?.handle,
        itemScope,
        evaluateCompiled: (compiled, scope) => removeWhen?.evaluateCompiled(compiled, scope),
      });
    });
  }, [removeGate, removeWhen, items, objectItemKeyResolution, parentScope, name]);

  const isRemoveBlockedAt = React.useCallback(
    (index: number) => Boolean(removeBlockedByIndex?.[index]),
    [removeBlockedByIndex],
  );

  const atMaxItems = maxItems !== undefined && items.length >= maxItems;

  const readCurrent = React.useCallback(
    (): TEntry[] => (handlerReads === 'itemsRef' ? itemsRef.current : items),
    [handlerReads, items],
  );

  const syncAll = React.useCallback(
    (next: TEntry[]) => {
      itemsRef.current = next;

      if (parentForm && name) {
        if (!parentForm.isTouched(name)) {
          parentForm.touchField(name);
        }
        parentForm.setValue(name, next);
        if (uiAddDepth === 'subtree') {
          if (shouldValidateOn(name, parentForm, 'change')) {
            void parentForm.validateSubtree(name, 'change');
          }
        } else {
          writeFieldValue(parentForm, name, name, 'change');
        }
        return;
      }
      parentScope.update(name, next);
    },
    [parentForm, parentScope, name, uiAddDepth],
  );

  const focusRemoveMicrotask = focusRestore.timing === 'microtask' && focusRestore.on.includes('remove');
  const focusRemoveRAF = focusRestore.timing === 'rAF' && focusRestore.on.includes('remove');
  const focusAdd = focusRestore.timing === 'rAF' && focusRestore.on.includes('add');

  const runRemove = React.useCallback(
    (index: number): boolean => {
      const current = readCurrent();
      if (minItemsGuard === 'handler') {
        if (index < 0 || index >= current.length || current.length <= minItems) {
          return false;
        }
      }
      if (removeGate === 'handler+capability' && isRemoveBlockedAt(index)) {
        return false;
      }
      const next = current.filter((_, candidateIndex) => candidateIndex !== index);
      const nextFocusIndex = focusRemoveMicrotask ? Math.min(index, next.length - 1) : -1;
      if (focusRemoveRAF) {
        pendingFocusRef.current = { kind: 'remove', index };
      }
      if (syncRefOnMutate) {
        itemsRef.current = next;
      }
      compatRemoveAt(index);
      if (parentForm && name) {
        parentForm.removeValue(name, index);
        if (removeDepth === 'subtree') {
          if (removeValidateGate === 'always') {
            void parentForm.validateSubtree(name, 'change');
          } else if (shouldValidateOn(name, parentForm, 'change')) {
            void parentForm.validateSubtree(name, 'change');
          }
        }
      } else {
        syncAll(next);
      }
      if (focusRemoveMicrotask) {
        queueMicrotask(() => {
          if (nextFocusIndex >= 0) {
            removeButtonRefs.current[nextFocusIndex]?.focus();
          }
        });
      }
      return true;
    },
    [
      readCurrent,
      minItemsGuard,
      minItems,
      removeGate,
      isRemoveBlockedAt,
      focusRemoveMicrotask,
      focusRemoveRAF,
      syncRefOnMutate,
      compatRemoveAt,
      parentForm,
      name,
      removeDepth,
      removeValidateGate,
      syncAll,
    ],
  );

  const runMove = React.useCallback(
    (from: number, to: number): boolean => {
      const current = readCurrent();
      if (uiMoveBounds === 'both-bounds') {
        if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) {
          return false;
        }
      } else if (from === to || to < 0 || to >= current.length) {
        return false;
      }
      const next = spliceMoved(current, from, to);
      if (!next) {
        return false;
      }
      if (syncRefOnMutate) {
        itemsRef.current = next;
      }
      compatMove(from, to);
      if (parentForm && name) {
        parentForm.moveValue(name, from, to);
        writeFieldValue(parentForm, name, name, 'change');
      } else {
        syncAll(next);
      }
      return true;
    },
    [readCurrent, uiMoveBounds, syncRefOnMutate, compatMove, parentForm, name, syncAll],
  );

  const runLiveAppend = React.useCallback(
    (nextItem: TEntry, next: TEntry[]) => {
      if (syncRefOnMutate) {
        itemsRef.current = next;
      }
      compatAppend();
      if (focusAdd) {
        pendingFocusRef.current = { kind: 'add' };
      }
      if (parentForm && name) {
        parentForm.appendValue(name, nextItem);
        if (capabilityAddDepth === 'field') {
          writeFieldValue(parentForm, name, name, 'change');
        }
      } else {
        syncAll(next);
      }
    },
    [syncRefOnMutate, compatAppend, focusAdd, parentForm, name, capabilityAddDepth, syncAll],
  );

  const handleAdd = React.useCallback(() => {
    if (atMaxItems) {
      return;
    }
    if (uiAddMechanics === 'snapshot-replace') {
      compatAppend();
      syncAll([...items, identity.uiNewEntryFactory(items)]);
      events.onAdd?.();
      return;
    }
    const nextItem = identity.uiNewEntryFactory(items);
    runLiveAppend(nextItem, [...items, nextItem]);
  }, [atMaxItems, uiAddMechanics, compatAppend, items, identity, syncAll, events, runLiveAppend]);

  const handleRemove = React.useCallback(
    (index: number) => {
      if (runRemove(index)) {
        events.onRemove?.();
      }
    },
    [runRemove, events],
  );

  const handleMove = React.useCallback(
    (from: number, to: number) => {
      if (runMove(from, to)) {
        events.onReorder?.();
      }
    },
    [runMove, events],
  );

  const handleMoveUp = React.useCallback((index: number) => handleMove(index, index - 1), [handleMove]);
  const handleMoveDown = React.useCallback((index: number) => handleMove(index, index + 1), [handleMove]);

  const registerItemInput = React.useCallback((itemIdentity: string, element: unknown) => {
    if (element) {
      inputRefs.current.set(itemIdentity, element);
    } else {
      inputRefs.current.delete(itemIdentity);
    }
  }, []);

  const registerRemoveButton = React.useCallback((index: number, button: HTMLButtonElement | null) => {
    removeButtonRefs.current[index] = button;
  }, []);

  React.useEffect(() => {
    if (focusRestore.timing !== 'rAF') {
      return;
    }
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;

    requestAnimationFrame(() => {
      if (pending.kind === 'add') {
        const lastEntry = itemEntries[itemEntries.length - 1];
        if (lastEntry) {
          (inputRefs.current.get(lastEntry.itemIdentity) as HTMLInputElement | undefined)?.focus();
        }
      } else {
        const targetIndex = Math.min(pending.index, itemEntries.length - 1);
        const targetEntry = itemEntries[targetIndex];
        if (targetEntry) {
          (inputRefs.current.get(targetEntry.itemIdentity) as HTMLInputElement | undefined)?.focus();
        } else {
          addButtonRef.current?.focus();
        }
      }
    });
  }, [itemEntries, focusRestore.timing]);

  useCompositeFieldHandle({
    id,
    name: name || undefined,
    type,
    cid,
    methods: COMPOSITE_EDITOR_METHODS,
    isInteractive,
    addItem: (value) => {
      if (atMaxItems) {
        return { skipped: true };
      }
      const nextItem = identity.newEntryFactory(value, items);
      runLiveAppend(nextItem, [...items, nextItem]);
      events.onAdd?.();
      return { index: items.length };
    },
    removeItem: (index) => {
      const current = handlerReads === 'itemsRef' ? itemsRef.current : items;
      if (index < 0 || index >= current.length) {
        return { outOfBounds: true };
      }
      if (current.length <= minItems) {
        return { skipped: true };
      }
      if (removeGate !== 'none' && isRemoveBlockedAt(index)) {
        return { skipped: true };
      }
      if (runRemove(index)) {
        events.onRemove?.();
      }
      return {};
    },
    moveItem: (from, to) => {
      if (from < 0 || from >= items.length || to < 0 || to >= items.length) {
        return { outOfBounds: true };
      }
      if (runMove(from, to)) {
        events.onReorder?.();
      }
      return {};
    },
  });

  return {
    items,
    itemEntries,
    atMaxItems,
    minItems,
    maxItems,
    itemsRef,
    handleAdd,
    handleRemove,
    handleMove,
    handleMoveUp,
    handleMoveDown,
    isRemoveBlockedAt,
    syncAll,
    registerItemInput,
    addButtonRef,
    registerRemoveButton,
  };
}
