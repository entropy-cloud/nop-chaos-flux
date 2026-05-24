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

  const [localSelectedRowKeys, setLocalSelectedRowKeys] = useState<Set<string>>(
    new Set(schemaProps.rowSelection?.selectedRowKeys ?? []),
  );

  const controlledSelectedRowKeys = useMemo(
    () => new Set(toStringArray(schemaProps.rowSelection?.selectedRowKeys)),
    [schemaProps.rowSelection?.selectedRowKeys],
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

  const allSelected = useMemo(
    () =>
      normalizedRows.length > 0 && normalizedRows.every((row) => selectedRowKeys.has(row.rowKey)),
    [normalizedRows, selectedRowKeys],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      const nextKeys = checked
        ? new Set(normalizedRows.map((row) => row.rowKey))
        : new Set<string>();

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
    [helpers, normalizedRows, onSelectionChange, renderScope, selectionOwnership, selectionStatePath],
  );

  const isRadio = schemaProps.rowSelection?.type === 'radio';

  const handleSelectRow = useCallback(
    (rowKey: string, checked: boolean) => {
      const baseSet = selectionOwnership === 'local' ? localSelectedRowKeys : selectedRowKeys;

      let newSet: Set<string>;
      if (isRadio) {
        newSet = checked ? new Set([rowKey]) : new Set<string>();
      } else {
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
  };
}
