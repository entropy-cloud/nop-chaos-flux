import { startTransition, useCallback, useMemo, useState } from 'react';
import { getIn, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas.js';
import { buildTableRowEntries, toStringArray } from './table-data.js';
import { createTableEventContext } from './table-event-context.js';
import type { TableRowEntry } from './types.js';

export function useTableSelection(
  schemaProps: TableSchema,
  source: TableRowEntry['record'][],
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

  const [localSelectedRowKeys, setLocalSelectedRowKeys] = useState<Set<string>>(
    new Set(rowSelection?.selectedRowKeys ?? []),
  );

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
    { paths: selectionStatePath ? [selectionStatePath] : undefined },
  );

  const selectedRowKeys = useMemo(
    () =>
      selectionOwnership === 'controlled'
        ? controlledSelectedRowKeys
        : selectionOwnership === 'scope'
          ? (scopeSelectedRowKeys ?? new Set<string>())
          : localSelectedRowKeys,
    [selectionOwnership, controlledSelectedRowKeys, scopeSelectedRowKeys, localSelectedRowKeys],
  );

  const normalizedRows = useMemo(
    () => buildTableRowEntries(source, schemaProps.rowKey),
    [schemaProps.rowKey, source],
  );

  const checkableRowKeys = useMemo(() => {
    if (!checkableWhen) {
      return null;
    }

    const checkable = new Set<string>();
    for (const row of normalizedRows) {
      let isCheckable = true;
      try {
        const rowScope = helpers.createScope({
          record: row.record,
          index: row.sourceIndex,
        });
        const wrapped = `\${${checkableWhen}}`;
        const result = helpers.evaluate(wrapped, rowScope);
        isCheckable = Boolean(result);
      } catch {
        isCheckable = false;
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

      if (checked) {
        if (keepOnPageChange) {
          nextKeys = new Set(selectedRowKeys);
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
            Array.from(selectedRowKeys).filter((key) => !currentPageSet.has(key)),
          );
        } else {
          nextKeys = new Set<string>();
        }
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
          helpers,
          scopeKey: 'selection',
          pathSuffix: 'selection',
          event: payload,
        }),
      );
    },
    [
      helpers,
      normalizedRows,
      onSelectionChange,
      renderScope,
      selectionOwnership,
      selectionStatePath,
      keepOnPageChange,
      maxSelectionLength,
      selectedRowKeys,
      checkableRowKeys,
    ],
  );

  const handleSelectRow = useCallback(
    (rowKey: string, checked: boolean) => {
      if (checked && checkableRowKeys && !checkableRowKeys.has(rowKey)) {
        return;
      }

      const baseSet = selectionOwnership === 'local' ? localSelectedRowKeys : selectedRowKeys;

      let newSet: Set<string>;
      if (isRadio) {
        newSet = checked ? new Set([rowKey]) : new Set<string>();
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
          helpers,
          scopeKey: 'selection',
          pathSuffix: 'selection',
          event: payload,
        }),
      );
    },
    [
      helpers,
      isRadio,
      localSelectedRowKeys,
      onSelectionChange,
      renderScope,
      selectedRowKeys,
      selectionOwnership,
      selectionStatePath,
      checkableRowKeys,
      maxSelectionLength,
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
          helpers,
          scopeKey: 'selection',
          pathSuffix: 'selection',
          event: payload,
        }),
      );
    },
    [selectionOwnership, selectionStatePath, onSelectionChange, helpers, renderScope],
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
