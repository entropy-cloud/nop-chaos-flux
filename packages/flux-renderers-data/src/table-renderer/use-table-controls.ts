import { startTransition, useCallback, useMemo, useState } from 'react';
import { getIn } from '@nop-chaos/flux-core';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas';
import { toPositiveNumber, toStringArray } from './table-data';

export function useTablePagination(
  schemaProps: TableSchema,
  onPageChange: RendererComponentProps<TableSchema>['events']['onPageChange'],
  helpers: RendererComponentProps<TableSchema>['helpers']
) {
  const renderScope = useRenderScope();
  const paginationOwnership = schemaProps.paginationOwnership ?? 'local';
  const paginationStatePath = typeof schemaProps.paginationStatePath === 'string' ? schemaProps.paginationStatePath : undefined;
  const paginationEnabled = schemaProps.pagination?.enabled !== false;

  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(schemaProps.pagination?.pageSize ?? 10);

  const scopePaginationState = useScopeSelector(
    (scopeData) => paginationOwnership === 'scope' && paginationStatePath
      ? (getIn(scopeData, paginationStatePath) as Record<string, unknown> | undefined)
      : undefined
  );

  const currentPage = paginationOwnership === 'controlled'
    ? toPositiveNumber(schemaProps.pagination?.currentPage, 1)
    : paginationOwnership === 'scope'
      ? toPositiveNumber(scopePaginationState?.currentPage, toPositiveNumber(schemaProps.pagination?.currentPage, 1))
      : localCurrentPage;

  const pageSize = paginationOwnership === 'controlled'
    ? toPositiveNumber(schemaProps.pagination?.pageSize, 10)
    : paginationOwnership === 'scope'
      ? toPositiveNumber(scopePaginationState?.pageSize, toPositiveNumber(schemaProps.pagination?.pageSize, 10))
      : localPageSize;

  const handlePageChange = useCallback(
    (page: number) => {
      startTransition(() => {
        if (paginationOwnership === 'local') {
          setLocalCurrentPage(page);
        } else if (paginationOwnership === 'scope' && paginationStatePath) {
          renderScope.update(paginationStatePath, { currentPage: page, pageSize });
        }
      });
      onPageChange?.(null, {
        scope: helpers.createScope({ page, pageSize }, { scopeKey: 'pagination', pathSuffix: 'pagination' }),
      });
    },
    [paginationOwnership, paginationStatePath, pageSize, onPageChange, helpers, renderScope]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      startTransition(() => {
        if (paginationOwnership === 'local') {
          setLocalPageSize(newPageSize);
          setLocalCurrentPage(1);
        } else if (paginationOwnership === 'scope' && paginationStatePath) {
          renderScope.update(paginationStatePath, { currentPage: 1, pageSize: newPageSize });
        }
      });
      onPageChange?.(null, {
        scope: helpers.createScope({ page: 1, pageSize: newPageSize }, { scopeKey: 'pagination', pathSuffix: 'pagination' }),
      });
    },
    [paginationOwnership, paginationStatePath, onPageChange, helpers, renderScope]
  );

  return { paginationEnabled, currentPage, pageSize, handlePageChange, handlePageSizeChange };
}

export function useTableSelection(
  schemaProps: TableSchema,
  source: Array<Record<string, any>>,
  onSelectionChange: RendererComponentProps<TableSchema>['events']['onSelectionChange'],
  helpers: RendererComponentProps<TableSchema>['helpers']
) {
  const renderScope = useRenderScope();
  const selectionOwnership = schemaProps.selectionOwnership ?? 'local';
  const selectionStatePath = typeof schemaProps.selectionStatePath === 'string' ? schemaProps.selectionStatePath : undefined;

  const [localSelectedRowKeys, setLocalSelectedRowKeys] = useState<Set<string>>(
    new Set(schemaProps.rowSelection?.selectedRowKeys ?? [])
  );

  const controlledSelectedRowKeys = new Set(toStringArray(schemaProps.rowSelection?.selectedRowKeys));

  const scopeSelectedRowKeys = useScopeSelector(
    (scopeData) => selectionOwnership === 'scope' && selectionStatePath
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
    }
  );

  const selectedRowKeys = selectionOwnership === 'controlled'
    ? controlledSelectedRowKeys
    : selectionOwnership === 'scope'
      ? (scopeSelectedRowKeys ?? new Set<string>())
      : localSelectedRowKeys;

  const allSelected = useMemo(
    () => source.length > 0 && source.every((r) => selectedRowKeys.has(String(r.id ?? ''))),
    [source, selectedRowKeys]
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      const nextKeys = checked
        ? new Set(source.map((r) => String(r.id ?? '')))
        : new Set<string>();

      startTransition(() => {
        if (selectionOwnership === 'local') {
          setLocalSelectedRowKeys(nextKeys);
        } else if (selectionOwnership === 'scope' && selectionStatePath) {
          renderScope.update(selectionStatePath, Array.from(nextKeys));
        }
      });

      onSelectionChange?.(null, {
        scope: helpers.createScope({ selectedRowKeys: Array.from(nextKeys) }, { scopeKey: 'selection', pathSuffix: 'selection' }),
      });
    },
    [selectionOwnership, selectionStatePath, source, onSelectionChange, helpers, renderScope]
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
        scope: helpers.createScope({ selectedRowKeys: Array.from(newSet) }, { scopeKey: 'selection', pathSuffix: 'selection' }),
      });
    },
    [helpers, localSelectedRowKeys, onSelectionChange, renderScope, selectedRowKeys, selectionOwnership, selectionStatePath]
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
        scope: helpers.createScope({ selectedRowKeys: Array.from(nextKeys) }, { scopeKey: 'selection', pathSuffix: 'selection' }),
      });
    },
    [selectionOwnership, selectionStatePath, onSelectionChange, helpers, renderScope]
  );

  return {
    selectedRowKeys,
    allSelected,
    handleSelectAll,
    handleSelectRow,
    setSelectionExternal
  };
}

export function useTableSort(
  onSortChange: RendererComponentProps<TableSchema>['events']['onSortChange'],
  columns: NonNullable<TableSchema['columns']>,
  helpers: RendererComponentProps<TableSchema>['helpers']
) {
  const [sortState, setSortState] = useState<{ column: string; direction: 'asc' | 'desc' | null }>({ column: '', direction: null });

  const handleSort = useCallback(
    (columnName: string) => {
      if (!columnName || !columns.find((c) => c.name === columnName && c.sortable)) {
        return;
      }

      setSortState((prev) => {
        let newDirection: 'asc' | 'desc' | null;
        if (prev.column !== columnName) {
          newDirection = 'asc';
        } else if (prev.direction === 'asc') {
          newDirection = 'desc';
        } else if (prev.direction === 'desc') {
          newDirection = null;
        } else {
          newDirection = 'asc';
        }

        const newState = { column: columnName, direction: newDirection };
        onSortChange?.(null, {
          scope: helpers.createScope({ column: columnName, direction: newDirection }, { scopeKey: 'sort', pathSuffix: 'sort' }),
        });

        return newState;
      });
    },
    [columns, onSortChange, helpers]
  );

  return { sortState, handleSort };
}

export function useTableFilter(
  onFilterChange: RendererComponentProps<TableSchema>['events']['onFilterChange'],
  helpers: RendererComponentProps<TableSchema>['helpers']
) {
  const [filterState, setFilterState] = useState<Record<string, Set<string>>>({});

  const handleFilter = useCallback(
    (columnName: string, value: string, checked: boolean) => {
      setFilterState((prev) => {
        const newFilters = { ...prev };
        const currentFilters = newFilters[columnName] ?? new Set<string>();

        if (checked) {
          currentFilters.add(value);
        } else {
          currentFilters.delete(value);
        }

        if (currentFilters.size === 0) {
          delete newFilters[columnName];
        } else {
          newFilters[columnName] = currentFilters;
        }

        onFilterChange?.(null, {
          scope: helpers.createScope({ column: columnName, filters: Array.from(currentFilters) }, { scopeKey: 'filter', pathSuffix: 'filter' }),
        });

        return newFilters;
      });
    },
    [onFilterChange, helpers]
  );

  return { filterState, handleFilter };
}

export function useTableExpand(schemaProps: TableSchema) {
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(
    new Set(schemaProps.expandable?.expandedRowKeys ?? [])
  );

  const handleToggleExpand = useCallback((rowKey: string) => {
    setExpandedRowKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey);
      } else {
        newSet.add(rowKey);
      }
      return newSet;
    });
  }, []);

  return { expandedRowKeys, handleToggleExpand };
}
