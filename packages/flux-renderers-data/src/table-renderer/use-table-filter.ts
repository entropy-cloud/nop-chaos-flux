import { startTransition, useCallback, useMemo, useState } from 'react';
import { getIn, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas.js';
import { createTableEventContext } from './table-event-context.js';
import type { FilterState } from './types.js';

export function useTableFilter(
  schemaProps: TableSchema,
  onFilterChange: RendererComponentProps<TableSchema>['events']['onFilterChange'],
  onFilterStateChange?: (nextState: FilterState) => void,
) {
  const renderScope = useRenderScope();
  const filterOwnership = schemaProps.filterOwnership ?? 'local';
  const filterStatePath =
    typeof schemaProps.filterStatePath === 'string' ? schemaProps.filterStatePath : undefined;
  const [localFilterState, setLocalFilterState] = useState<FilterState>({});

  const toFilterState = useCallback((value: unknown): FilterState => {
    const record = value as
      | Record<string, { filters?: string[]; keyword?: string } | undefined>
      | undefined;
    const next: FilterState = {};
    Object.entries(record ?? {}).forEach(([key, entry]) => {
      next[key] = {
        values: new Set(Array.isArray(entry?.filters) ? entry.filters : []),
        keyword: typeof entry?.keyword === 'string' ? entry.keyword : undefined,
      };
    });
    return next;
  }, []);

  const controlledFilterState = useMemo(
    () => toFilterState((schemaProps as Record<string, unknown>).filters),
    [schemaProps, toFilterState],
  );

  const scopeFilterState = useScopeSelector(
    (scopeData) => {
      if (filterOwnership !== 'scope' || !filterStatePath) {
        return undefined;
      }

      return toFilterState(getIn(scopeData, filterStatePath));
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
    },
    {
      enabled: filterOwnership === 'scope' && !!filterStatePath,
      paths: filterStatePath ? [filterStatePath] : undefined,
    },
  );

  const filterState = useMemo(
    () =>
      filterOwnership === 'controlled'
        ? controlledFilterState
        : filterOwnership === 'scope'
          ? (scopeFilterState ?? {})
          : localFilterState,
    [controlledFilterState, filterOwnership, localFilterState, scopeFilterState],
  );

  // Shared commit pipeline (cq-3 Phase 4): scope/local write + event dispatch +
  // state-change notification — previously three verbatim copies across
  // handleFilter/handleSearch/clearFilters.
  const commitFilters = useCallback(
    (
      newFilters: FilterState,
      payload: {
        type: 'table:filter-change';
        column: string;
        filters: string[];
        keyword: string;
        filter: { column: string; filters: string[]; keyword: string };
      },
    ) => {
      startTransition(() => {
        if (filterOwnership === 'scope' && filterStatePath) {
          renderScope.update(
            filterStatePath,
            Object.fromEntries(
              Object.entries(newFilters).map(([key, entry]) => [
                key,
                { filters: Array.from(entry.values), keyword: entry.keyword },
              ]),
            ),
          );
        } else {
          setLocalFilterState(newFilters);
        }
      });

      onFilterChange?.(
        null,
        createTableEventContext(payload, {
          scope: renderScope,
          event: payload,
        }),
      );
      onFilterStateChange?.(newFilters);
    },
    [filterOwnership, filterStatePath, onFilterChange, onFilterStateChange, renderScope],
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

      const filters = Array.from(currentFilters);
      commitFilters(newFilters, {
        type: 'table:filter-change',
        column: columnName,
        filters,
        keyword: current.keyword ?? '',
        filter: {
          column: columnName,
          filters,
          keyword: current.keyword ?? '',
        },
      });
    },
    [commitFilters, filterState],
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

      const filters = Array.from(current.values);
      commitFilters(newFilters, {
        type: 'table:filter-change',
        column: columnName,
        filters,
        keyword,
        filter: {
          column: columnName,
          filters,
          keyword,
        },
      });
    },
    [commitFilters, filterState],
  );


  const clearFilters = useCallback(
    (columnName: string) => {
      if (!filterState[columnName]) {
        return;
      }

      const newFilters: FilterState = { ...filterState };
      delete newFilters[columnName];

      commitFilters(newFilters, {
        type: 'table:filter-change',
        column: columnName,
        filters: [],
        keyword: '',
        filter: {
          column: columnName,
          filters: [],
          keyword: '',
        },
      });
    },
    [commitFilters, filterState],
  );


  return useMemo(
    () => ({ filterState, handleFilter, handleSearch, clearFilters }),
    [clearFilters, filterState, handleFilter, handleSearch],
  );
}
