import { startTransition, useCallback, useMemo, useState } from 'react';
import { getIn, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas.js';
import type { FilterState } from './types.js';

export function useTableFilter(
  schemaProps: TableSchema,
  onFilterChange: RendererComponentProps<TableSchema>['events']['onFilterChange'],
  helpers: RendererComponentProps<TableSchema>['helpers'],
) {
  const renderScope = useRenderScope();
  const filterOwnership = schemaProps.filterOwnership ?? 'local';
  const filterStatePath =
    typeof schemaProps.filterStatePath === 'string' ? schemaProps.filterStatePath : undefined;
  const [localFilterState, setLocalFilterState] = useState<FilterState>({});

  const scopeFilterState = useScopeSelector(
    (scopeData) => {
      if (filterOwnership !== 'scope' || !filterStatePath) {
        return undefined;
      }

      const value = getIn(scopeData, filterStatePath) as
        | Record<string, { filters?: string[]; keyword?: string } | undefined>
        | undefined;
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
    },
  );

  const filterState = useMemo(
    () => (filterOwnership === 'scope' ? (scopeFilterState ?? {}) : localFilterState),
    [filterOwnership, localFilterState, scopeFilterState],
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

      onFilterChange?.(null, {
        scope: helpers.createScope(
          { column: columnName, filters: Array.from(currentFilters), keyword: current.keyword },
          { scopeKey: 'filter', pathSuffix: 'filter' },
        ),
      });
    },
    [filterOwnership, filterState, filterStatePath, helpers, onFilterChange, renderScope],
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

      onFilterChange?.(null, {
        scope: helpers.createScope(
          { column: columnName, filters: Array.from(current.values), keyword },
          { scopeKey: 'filter', pathSuffix: 'filter' },
        ),
      });
    },
    [filterOwnership, filterState, filterStatePath, helpers, onFilterChange, renderScope],
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

      onFilterChange?.(null, {
        scope: helpers.createScope(
          { column: columnName, filters: [], keyword: '' },
          { scopeKey: 'filter', pathSuffix: 'filter' },
        ),
      });
    },
    [filterOwnership, filterState, filterStatePath, helpers, onFilterChange, renderScope],
  );

  return { filterState, handleFilter, handleSearch, clearFilters };
}
