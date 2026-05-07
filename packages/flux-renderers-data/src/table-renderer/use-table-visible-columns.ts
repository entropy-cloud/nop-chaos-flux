import { startTransition, useCallback, useMemo, useState } from 'react';
import { getIn } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas.js';
import { areStringArraysEqual, normalizeOrderedColumns } from './column-settings-state.js';
import { toStringArray } from './table-data.js';

export function useTableVisibleColumns(
  schemaProps: TableSchema,
  columns: NonNullable<TableSchema['columns']>,
) {
  const renderScope = useRenderScope();
  const toggledStatePath =
    typeof schemaProps.columnSettings?.toggledColumnsStatePath === 'string'
      ? schemaProps.columnSettings.toggledColumnsStatePath
      : undefined;
  const orderedStatePath =
    typeof schemaProps.columnSettings?.orderedColumnsStatePath === 'string'
      ? schemaProps.columnSettings.orderedColumnsStatePath
      : undefined;

  const defaultOrderedColumns = useMemo(
    () => columns.map((column, index) => column.name ?? `column-${index}`),
    [columns],
  );

  const defaultVisibleColumns = useMemo(
    () =>
      columns
        .filter((column) => column.hidden !== true)
        .map((column, index) => column.name ?? `column-${index}`),
    [columns],
  );

  const [localVisibleColumns, setLocalVisibleColumns] = useState<string[]>(defaultVisibleColumns);
  const [localOrderedColumns, setLocalOrderedColumns] = useState<string[]>(defaultOrderedColumns);
  const scopeVisibleColumns = useScopeSelector(
    (scopeData) =>
      toggledStatePath ? toStringArray(getIn(scopeData, toggledStatePath)) : undefined,
    areStringArraysEqual,
  );
  const scopeOrderedColumns = useScopeSelector(
    (scopeData) =>
      orderedStatePath ? toStringArray(getIn(scopeData, orderedStatePath)) : undefined,
    areStringArraysEqual,
  );

  const enabled = schemaProps.columnSettings?.enabled === true;
  const orderedColumns = useMemo(
    () =>
      normalizeOrderedColumns(
        orderedStatePath
          ? scopeOrderedColumns?.length
            ? scopeOrderedColumns
            : defaultOrderedColumns
          : localOrderedColumns,
        defaultOrderedColumns,
      ),
    [defaultOrderedColumns, localOrderedColumns, orderedStatePath, scopeOrderedColumns],
  );
  const visibleColumns = enabled
    ? toggledStatePath
      ? scopeVisibleColumns?.length
        ? scopeVisibleColumns
        : defaultVisibleColumns
      : localVisibleColumns
    : defaultVisibleColumns;

  const visibleColumnsSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const columnsByKey = useMemo(
    () =>
      new Map(columns.map((column, index) => [column.name ?? `column-${index}`, column] as const)),
    [columns],
  );

  const tableColumns = useMemo(
    () =>
      orderedColumns
        .filter((key) => visibleColumnsSet.has(key))
        .map((key) => columnsByKey.get(key))
        .filter((column): column is NonNullable<typeof column> => Boolean(column)),
    [columnsByKey, orderedColumns, visibleColumnsSet],
  );

  const toggleColumn = useCallback(
    (columnKey: string, visible: boolean) => {
      const next = visible
        ? Array.from(new Set([...visibleColumns, columnKey]))
        : visibleColumns.filter((value) => value !== columnKey);

      startTransition(() => {
        if (toggledStatePath) {
          renderScope.update(toggledStatePath, next);
        } else {
          setLocalVisibleColumns(next);
        }
      });
    },
    [renderScope, toggledStatePath, visibleColumns],
  );

  const moveColumn = useCallback(
    (columnKey: string, direction: 'up' | 'down') => {
      const currentIndex = orderedColumns.indexOf(columnKey);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedColumns.length) {
        return;
      }

      const next = [...orderedColumns];
      const [column] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, column);

      startTransition(() => {
        if (orderedStatePath) {
          renderScope.update(orderedStatePath, next);
        } else {
          setLocalOrderedColumns(next);
        }
      });
    },
    [orderedColumns, orderedStatePath, renderScope],
  );

  return {
    columnSettingsEnabled: enabled,
    visibleColumns,
    orderedColumns,
    tableColumns,
    toggleColumn,
    moveColumn,
  };
}
