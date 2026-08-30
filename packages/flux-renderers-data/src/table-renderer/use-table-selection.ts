import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getIn, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas.js';
import { toStringArray } from './table-data.js';
import { createTableEventContext } from './table-event-context.js';
import type { TableRowEntry } from './types.js';

/** Modifier keys captured at gesture time (mousedown/click) and handed to selection handlers. */
export interface RowSelectionModifiers {
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
}

export function useTableSelection(
  schemaProps: TableSchema,
  rows: TableRowEntry[],
  onSelectionChange: RendererComponentProps<TableSchema>['events']['onSelectionChange'],
  helpers: RendererComponentProps<TableSchema>['helpers'],
) {
  const renderScope = useRenderScope();
  const selectionOwnership = schemaProps.selectionOwnership ?? 'local';
  const selectionStatePath =
    typeof schemaProps.selectionStatePath === 'string' ? schemaProps.selectionStatePath : undefined;

  const rowSelection = schemaProps.rowSelection;
  const keepOnPageChange = rowSelection?.keepOnPageChange === true;
  const maxSelectionLength =
    typeof rowSelection?.maxSelectionLength === 'number' && rowSelection.maxSelectionLength > 0
      ? rowSelection.maxSelectionLength
      : undefined;
  const checkableWhen =
    typeof rowSelection?.checkableWhen === 'string' && rowSelection.checkableWhen.length > 0
      ? rowSelection.checkableWhen
      : undefined;
  const isRadio = rowSelection?.type === 'radio';
  // D1 G-B2 Decision 3: modifier-key selection gestures (shift range / meta
  // toggle / ⌘A select-all) — checkbox mode only, inert under radio.
  const modifierSelect = rowSelection?.modifierSelect === true && !isRadio;

  const [localSelectedRowKeys, setLocalSelectedRowKeys] = useState<Set<string>>(
    new Set(rowSelection?.selectedRowKeys ?? []),
  );
  // Range anchor for shift-click: moved by every UNMODIFIED selection change
  // (checkbox toggle / row toggle / header select-all); setSelectionExternal
  // never moves it. Only tracked when modifierSelect is on (flag-off behavior
  // stays byte-identical to the legacy path). A ref — never rendered from — so
  // the selection callbacks keep a stable identity (row memo locality, H10).
  const selectionAnchorRef = useRef<string | null>(null);
  // View-order rows for range resolution. Ref-mirrored for the same locality
  // reason: `rows` identity churns with data, and putting it in the selection
  // callbacks' deps would re-render every row on any table re-render.
  const rowsRef = useRef<TableRowEntry[]>(rows);
  useEffect(() => {
    rowsRef.current = rows;
  });

  const controlledSelectedRowKeys = useMemo(
    () => new Set(toStringArray(rowSelection?.selectedRowKeys)),
    [rowSelection?.selectedRowKeys],
  );

  const scopeSelectedRowKeys = useScopeSelector(
    (scopeData) =>
      selectionOwnership === 'scope' && selectionStatePath
        ? new Set(toStringArray(getIn(scopeData, selectionStatePath)))
        : undefined,
    (a, b) => {
      if (a === b) return true;
      if (!a || !b) return a === b;
      if (a.size !== b.size) return false;
      for (const key of a) {
        if (!b.has(key)) return false;
      }
      return true;
    },
    {
      enabled: selectionOwnership === 'scope' && !!selectionStatePath,
      paths: selectionStatePath ? [selectionStatePath] : undefined,
    },
  );

  const normalizedRows = rows;

  const currentRowKeySet = useMemo(
    () => new Set(normalizedRows.map((row) => row.rowKey)),
    [normalizedRows],
  );

  const selectedRowKeys = useMemo(() => {
    if (selectionOwnership === 'controlled') {
      return controlledSelectedRowKeys;
    }
    if (selectionOwnership === 'scope') {
      return scopeSelectedRowKeys ?? new Set<string>();
    }
    // Local ownership: prune dead keys at render time so selection tracks the
    // visible data (P1-7) without a setState-in-effect. When keepOnPageChange is
    // set, keys for rows on other pages are intentionally retained.
    if (keepOnPageChange || localSelectedRowKeys.size === 0) {
      return localSelectedRowKeys;
    }
    let changed = false;
    const pruned = new Set<string>();
    for (const key of localSelectedRowKeys) {
      if (currentRowKeySet.has(key)) {
        pruned.add(key);
      } else {
        changed = true;
      }
    }
    return changed ? pruned : localSelectedRowKeys;
  }, [
    selectionOwnership,
    controlledSelectedRowKeys,
    scopeSelectedRowKeys,
    localSelectedRowKeys,
    keepOnPageChange,
    currentRowKeySet,
  ]);

  const checkableRowKeys = useMemo(() => {
    if (!checkableWhen) {
      return null;
    }

    const checkable = new Set<string>();
    for (const row of normalizedRows) {
      let isCheckable = true;
      const rowScope = helpers.createScope({
        ...row.record,
        $slot: { record: row.record, index: row.sourceIndex },
      });
      try {
        const wrapped = `\${${checkableWhen}}`;
        const result = helpers.evaluate(wrapped, rowScope);
        isCheckable = Boolean(result);
      } catch {
        isCheckable = false;
      } finally {
        helpers.disposeScope(rowScope.id);
      }
      if (isCheckable) {
        checkable.add(row.rowKey);
      }
    }
    return checkable;
  }, [checkableWhen, normalizedRows, helpers]);

  const isRowCheckable = useCallback(
    (rowKey: string) => {
      if (!checkableRowKeys) {
        return true;
      }
      return checkableRowKeys.has(rowKey);
    },
    [checkableRowKeys],
  );

  const isAtMaxSelection = useMemo(() => {
    if (!maxSelectionLength || isRadio) {
      return false;
    }
    return selectedRowKeys.size >= maxSelectionLength;
  }, [maxSelectionLength, isRadio, selectedRowKeys.size]);

  const allSelected = useMemo(() => {
    const selectableRows = checkableRowKeys
      ? normalizedRows.filter((row) => checkableRowKeys.has(row.rowKey))
      : normalizedRows;
    return (
      selectableRows.length > 0 &&
      selectableRows.every((row) => selectedRowKeys.has(row.rowKey))
    );
  }, [normalizedRows, selectedRowKeys, checkableRowKeys]);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      const currentRowKeys = (
        checkableRowKeys
          ? normalizedRows.filter((row) => checkableRowKeys.has(row.rowKey))
          : normalizedRows
      ).map((row) => row.rowKey);

      let nextKeys: Set<string>;

      // H21: under keepOnPageChange, retained cross-page keys can include phantom
      // keys for rows that were since deleted. Prune those against the full known
      // dataset (currentRowKeySet) so they never survive into the payload, then
      // apply the add/remove of the current rows.
      const retainedKnown = keepOnPageChange
        ? new Set(Array.from(selectedRowKeys).filter((key) => currentRowKeySet.has(key)))
        : null;

      if (checked) {
        if (keepOnPageChange) {
          nextKeys = new Set(retainedKnown);
          for (const key of currentRowKeys) {
            if (maxSelectionLength && nextKeys.size >= maxSelectionLength) {
              break;
            }
            nextKeys.add(key);
          }
        } else {
          nextKeys = new Set<string>();
          for (const key of currentRowKeys) {
            if (maxSelectionLength && nextKeys.size >= maxSelectionLength) {
              break;
            }
            nextKeys.add(key);
          }
        }
      } else {
        if (keepOnPageChange) {
          const currentPageSet = new Set(currentRowKeys);
          nextKeys = new Set(
            Array.from(retainedKnown!).filter((key) => !currentPageSet.has(key)),
          );
        } else {
          nextKeys = new Set<string>();
        }
      }

      // Modifier-select anchor: select-all is an unmodified change — the acted
      // rows start at the first view-order row. Deselect keeps the anchor.
      if (modifierSelect && checked && currentRowKeys.length > 0) {
        selectionAnchorRef.current = currentRowKeys[0];
      }

      startTransition(() => {
        if (selectionOwnership === 'local') {
          setLocalSelectedRowKeys(nextKeys);
        } else if (selectionOwnership === 'scope' && selectionStatePath) {
          renderScope.update(selectionStatePath, Array.from(nextKeys));
        }
      });

      const nextSelectedRowKeys = Array.from(nextKeys);
      const payload = {
        type: 'table:selection-change',
        selectedRowKeys: nextSelectedRowKeys,
        selection: {
          selectedRowKeys: nextSelectedRowKeys,
        },
      };

      onSelectionChange?.(
        null,
        createTableEventContext(payload, {
          scope: renderScope,
          event: payload,
        }),
      );
    },
    [
      normalizedRows,
      onSelectionChange,
      renderScope,
      selectionOwnership,
      selectionStatePath,
      keepOnPageChange,
      maxSelectionLength,
      selectedRowKeys,
      checkableRowKeys,
      currentRowKeySet,
      modifierSelect,
    ],
  );

  const handleSelectRow = useCallback(
    (rowKey: string, checked: boolean, modifiers?: RowSelectionModifiers) => {
      if (checked && checkableRowKeys && !checkableRowKeys.has(rowKey)) {
        return;
      }

      // Build every payload from the already-pruned `selectedRowKeys`, never the
      // raw `localSelectedRowKeys`. This keeps the three observable channels
      // (display value / onSelectionChange payload / internal local state) in
      // sync after rows disappear: a deleted row's phantom key cannot leak back
      // into the payload, and the clean set is what gets written to local state
      // so subsequent renders stop allocating fresh Sets (M-01 / G7).
      const baseSet = selectedRowKeys;
      const shiftHeld = modifiers?.shiftKey === true;

      let newSet: Set<string>;
      if (isRadio) {
        newSet = checked ? new Set([rowKey]) : new Set<string>();
      } else if (modifierSelect && shiftHeld) {
        // D1 G-B2 Decision 3: ⇧click is an ADDITIVE range union — selection :=
        // current ∪ [anchor..clicked] over the current view order. Non-checkable
        // rows are skipped; maxSelectionLength truncates along view order
        // (select-all parity); shift never deselects. The anchor does not move.
        const viewRows = rowsRef.current;
        const anchor = selectionAnchorRef.current ?? rowKey;
        const anchorIndex = viewRows.findIndex((row) => row.rowKey === anchor);
        const targetIndex = viewRows.findIndex((row) => row.rowKey === rowKey);
        newSet = new Set(baseSet);
        if (anchorIndex >= 0 && targetIndex >= 0) {
          const [from, to] =
            anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
          for (let index = from; index <= to; index += 1) {
            const candidate = viewRows[index].rowKey;
            if (checkableRowKeys && !checkableRowKeys.has(candidate)) {
              continue;
            }
            if (maxSelectionLength && newSet.size >= maxSelectionLength) {
              break;
            }
            newSet.add(candidate);
          }
        } else {
          newSet.add(rowKey);
        }
      } else {
        if (checked && maxSelectionLength && baseSet.size >= maxSelectionLength) {
          return;
        }
        newSet = new Set(baseSet);
        if (checked) {
          newSet.add(rowKey);
        } else {
          newSet.delete(rowKey);
        }
      }

      // Anchor rule (modifierSelect on): every UNMODIFIED selection change moves
      // the anchor to the acted row; shift ranges and meta/ctrl toggles keep it.
      if (modifierSelect && !shiftHeld && !modifiers?.metaKey && !modifiers?.ctrlKey) {
        selectionAnchorRef.current = rowKey;
      }

      startTransition(() => {
        if (selectionOwnership === 'local') {
          setLocalSelectedRowKeys(newSet);
        } else if (selectionOwnership === 'scope' && selectionStatePath) {
          renderScope.update(selectionStatePath, Array.from(newSet));
        }
      });

      const nextSelectedRowKeys = Array.from(newSet);
      const payload = {
        type: 'table:selection-change',
        selectedRowKeys: nextSelectedRowKeys,
        selection: {
          selectedRowKeys: nextSelectedRowKeys,
        },
      };

      onSelectionChange?.(
        null,
        createTableEventContext(payload, {
          scope: renderScope,
          event: payload,
        }),
      );
    },
    [
      isRadio,
      onSelectionChange,
      renderScope,
      selectedRowKeys,
      selectionOwnership,
      selectionStatePath,
      checkableRowKeys,
      maxSelectionLength,
      modifierSelect,
    ],
  );

  const setSelectionExternal = useCallback(
    (nextKeys: Set<string>) => {
      startTransition(() => {
        if (selectionOwnership === 'local') {
          setLocalSelectedRowKeys(nextKeys);
        } else if (selectionOwnership === 'scope' && selectionStatePath) {
          renderScope.update(selectionStatePath, Array.from(nextKeys));
        }
      });

      const nextSelectedRowKeys = Array.from(nextKeys);
      const payload = {
        type: 'table:selection-change',
        selectedRowKeys: nextSelectedRowKeys,
        selection: {
          selectedRowKeys: nextSelectedRowKeys,
        },
      };

      onSelectionChange?.(
        null,
        createTableEventContext(payload, {
          scope: renderScope,
          event: payload,
        }),
      );
    },
    [selectionOwnership, selectionStatePath, onSelectionChange, renderScope],
  );

  return {
    selectedRowKeys,
    allSelected,
    handleSelectAll,
    handleSelectRow,
    setSelectionExternal,
    isRowCheckable,
    isAtMaxSelection,
    checkableRowKeys,
  };
}
