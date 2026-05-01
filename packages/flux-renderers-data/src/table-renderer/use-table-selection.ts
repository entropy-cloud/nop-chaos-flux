import { startTransition, useCallback, useMemo, useState } from 'react';
import { getIn, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas';
import { toStringArray } from './table-data';

export function useTableSelection(
  schemaProps: TableSchema,
  source: Array<Record<string, any>>,
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

  const allSelected = useMemo(
    () => source.length > 0 && source.every((r) => selectedRowKeys.has(String(r.id ?? ''))),
    [source, selectedRowKeys],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      const nextKeys = checked ? new Set(source.map((r) => String(r.id ?? ''))) : new Set<string>();

      startTransition(() => {
        if (selectionOwnership === 'local') {
          setLocalSelectedRowKeys(nextKeys);
        } else if (selectionOwnership === 'scope' && selectionStatePath) {
          renderScope.update(selectionStatePath, Array.from(nextKeys));
        }
      });

      onSelectionChange?.(null, {
        scope: helpers.createScope(
          { selectedRowKeys: Array.from(nextKeys) },
          { scopeKey: 'selection', pathSuffix: 'selection' },
        ),
      });
    },
    [selectionOwnership, selectionStatePath, source, onSelectionChange, helpers, renderScope],
  );

  const handleSelectRow = useCallback(
    (rowKey: string, checked: boolean) => {
      const baseSet = selectionOwnership === 'controlled' ? selectedRowKeys : localSelectedRowKeys;
      const newSet = new Set(baseSet);

      if (checked) {
        newSet.add(rowKey);
      } else {
        newSet.delete(rowKey);
      }

      startTransition(() => {
        if (selectionOwnership === 'local') {
          setLocalSelectedRowKeys(newSet);
        } else if (selectionOwnership === 'scope' && selectionStatePath) {
          renderScope.update(selectionStatePath, Array.from(newSet));
        }
      });

      onSelectionChange?.(null, {
        scope: helpers.createScope(
          { selectedRowKeys: Array.from(newSet) },
          { scopeKey: 'selection', pathSuffix: 'selection' },
        ),
      });
    },
    [
      helpers,
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
      onSelectionChange?.(null, {
        scope: helpers.createScope(
          { selectedRowKeys: Array.from(nextKeys) },
          { scopeKey: 'selection', pathSuffix: 'selection' },
        ),
      });
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
