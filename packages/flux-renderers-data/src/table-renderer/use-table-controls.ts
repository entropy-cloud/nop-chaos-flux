import { startTransition, useCallback, useMemo, useState } from 'react';
import { getIn } from '@nop-chaos/flux-core';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas';
import { toPositiveNumber, toStringArray } from './table-data';
import type { FilterState, SortState } from './types';
export { useTableVisibleColumns } from './use-table-visible-columns';

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

  const controlledSelectedRowKeys = useMemo(
    () => new Set(toStringArray(schemaProps.rowSelection?.selectedRowKeys)),
    [schemaProps.rowSelection?.selectedRowKeys]
  );

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

  const selectedRowKeys = useMemo(
    () =>
      selectionOwnership === 'controlled'
        ? controlledSelectedRowKeys
        : selectionOwnership === 'scope'
          ? (scopeSelectedRowKeys ?? new Set<string>())
          : localSelectedRowKeys,
    [selectionOwnership, controlledSelectedRowKeys, scopeSelectedRowKeys, localSelectedRowKeys]
  );

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
  schemaProps: TableSchema,
  onSortChange: RendererComponentProps<TableSchema>['events']['onSortChange'],
  columns: NonNullable<TableSchema['columns']>,
  helpers: RendererComponentProps<TableSchema>['helpers']
) {
  const renderScope = useRenderScope();
  const sortOwnership = schemaProps.sortOwnership ?? 'local';
  const sortStatePath = typeof schemaProps.sortStatePath === 'string' ? schemaProps.sortStatePath : undefined;
  const [localSortState, setLocalSortState] = useState<SortState>({ column: '', direction: null });

  const scopeSortState = useScopeSelector(
    (scopeData) => {
      if (sortOwnership !== 'scope' || !sortStatePath) {
        return undefined;
      }

      const value = getIn(scopeData, sortStatePath) as Record<string, unknown> | undefined;
      return {
        column: typeof value?.column === 'string' ? value.column : '',
        direction: value?.direction === 'asc' || value?.direction === 'desc' ? value.direction : null,
      } satisfies SortState;
    },
    (a, b) => a?.column === b?.column && a?.direction === b?.direction
  );

  const sortState = useMemo(
    () => (sortOwnership === 'scope' ? (scopeSortState ?? { column: '', direction: null }) : localSortState),
    [localSortState, scopeSortState, sortOwnership]
  );

  const handleSort = useCallback(
    (columnName: string) => {
      if (!columnName || !columns.find((c) => c.name === columnName && c.sortable)) {
        return;
      }

      const prev = sortState;
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

        const newState = { column: columnName, direction: newDirection } satisfies SortState;
        startTransition(() => {
          if (sortOwnership === 'scope' && sortStatePath) {
            renderScope.update(sortStatePath, newState);
          } else {
            setLocalSortState(newState);
          }
        });

        onSortChange?.(null, {
          scope: helpers.createScope({ column: columnName, direction: newDirection }, { scopeKey: 'sort', pathSuffix: 'sort' }),
        });
    },
    [columns, helpers, onSortChange, renderScope, sortOwnership, sortState, sortStatePath]
  );

  return { sortState, handleSort };
}

export function useTableFilter(
  schemaProps: TableSchema,
  onFilterChange: RendererComponentProps<TableSchema>['events']['onFilterChange'],
  helpers: RendererComponentProps<TableSchema>['helpers']
) {
  const renderScope = useRenderScope();
  const filterOwnership = schemaProps.filterOwnership ?? 'local';
  const filterStatePath = typeof schemaProps.filterStatePath === 'string' ? schemaProps.filterStatePath : undefined;
  const [localFilterState, setLocalFilterState] = useState<FilterState>({});

  const scopeFilterState = useScopeSelector(
    (scopeData) => {
      if (filterOwnership !== 'scope' || !filterStatePath) {
        return undefined;
      }

      const value = getIn(scopeData, filterStatePath) as Record<string, { filters?: string[]; keyword?: string } | undefined> | undefined;
      const next: FilterState = {};
      Object.entries(value ?? {}).forEach(([key, entry]) => {
        next[key] = {
          values: new Set(Array.isArray(entry?.filters) ? entry.filters : []),
          keyword: typeof entry?.keyword === 'string' ? entry.keyword : undefined,
        };
      });
      return next;
    },
    (a, b) => {
      if (a === b) return true;
      const aKeys = Object.keys(a ?? {});
      const bKeys = Object.keys(b ?? {});
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every((key) => {
        const left = a?.[key];
        const right = b?.[key];
        if (!left || !right) return left === right;
        if (left.keyword !== right.keyword) return false;
        if (left.values.size !== right.values.size) return false;
        for (const value of left.values) {
          if (!right.values.has(value)) return false;
        }
        return true;
      });
    }
  );

  const filterState = useMemo(
    () => (filterOwnership === 'scope' ? (scopeFilterState ?? {}) : localFilterState),
    [filterOwnership, localFilterState, scopeFilterState]
  );

  const handleFilter = useCallback(
    (columnName: string, value: string, checked: boolean) => {
      const prev = filterState;
      const newFilters: FilterState = { ...prev };
      const current = newFilters[columnName] ?? { values: new Set<string>(), keyword: undefined };
      const currentFilters = new Set(current.values);

      if (checked) {
        currentFilters.add(value);
      } else {
        currentFilters.delete(value);
      }

      if (currentFilters.size === 0 && !current.keyword) {
        delete newFilters[columnName];
      } else {
        newFilters[columnName] = { values: currentFilters, keyword: current.keyword };
      }

      startTransition(() => {
        if (filterOwnership === 'scope' && filterStatePath) {
          renderScope.update(filterStatePath, Object.fromEntries(Object.entries(newFilters).map(([key, entry]) => [key, { filters: Array.from(entry.values), keyword: entry.keyword }])));
        } else {
          setLocalFilterState(newFilters);
        }
      });

      onFilterChange?.(null, {
        scope: helpers.createScope({ column: columnName, filters: Array.from(currentFilters), keyword: current.keyword }, { scopeKey: 'filter', pathSuffix: 'filter' }),
      });
    },
    [filterOwnership, filterState, filterStatePath, helpers, onFilterChange, renderScope]
  );

  const handleSearch = useCallback(
    (columnName: string, keyword: string) => {
      const prev = filterState;
      const newFilters: FilterState = { ...prev };
      const current = newFilters[columnName] ?? { values: new Set<string>(), keyword: undefined };

      if (!keyword && current.values.size === 0) {
        delete newFilters[columnName];
      } else {
        newFilters[columnName] = { values: new Set(current.values), keyword: keyword || undefined };
      }

      startTransition(() => {
        if (filterOwnership === 'scope' && filterStatePath) {
          renderScope.update(filterStatePath, Object.fromEntries(Object.entries(newFilters).map(([key, entry]) => [key, { filters: Array.from(entry.values), keyword: entry.keyword }])));
        } else {
          setLocalFilterState(newFilters);
        }
      });

      onFilterChange?.(null, {
        scope: helpers.createScope({ column: columnName, filters: Array.from(current.values), keyword }, { scopeKey: 'filter', pathSuffix: 'filter' }),
      });
    },
    [filterOwnership, filterState, filterStatePath, helpers, onFilterChange, renderScope]
  );

  const clearFilters = useCallback(
    (columnName: string) => {
      if (!filterState[columnName]) {
        return;
      }

      const newFilters: FilterState = { ...filterState };
      delete newFilters[columnName];

      startTransition(() => {
        if (filterOwnership === 'scope' && filterStatePath) {
          renderScope.update(filterStatePath, Object.fromEntries(Object.entries(newFilters).map(([key, entry]) => [key, { filters: Array.from(entry.values), keyword: entry.keyword }])));
        } else {
          setLocalFilterState(newFilters);
        }
      });

      onFilterChange?.(null, {
        scope: helpers.createScope({ column: columnName, filters: [], keyword: '' }, { scopeKey: 'filter', pathSuffix: 'filter' }),
      });
    },
    [filterOwnership, filterState, filterStatePath, helpers, onFilterChange, renderScope]
  );

  return { filterState, handleFilter, handleSearch, clearFilters };
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
