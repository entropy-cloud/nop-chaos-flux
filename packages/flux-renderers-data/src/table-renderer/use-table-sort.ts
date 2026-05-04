import { startTransition, useCallback, useMemo, useState } from 'react';
import { getIn, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas';
import type { SortState } from './types';

export function useTableSort(
  schemaProps: TableSchema,
  onSortChange: RendererComponentProps<TableSchema>['events']['onSortChange'],
  columns: NonNullable<TableSchema['columns']>,
  helpers: RendererComponentProps<TableSchema>['helpers'],
) {
  const renderScope = useRenderScope();
  const sortOwnership = schemaProps.sortOwnership ?? 'local';
  const sortStatePath =
    typeof schemaProps.sortStatePath === 'string' ? schemaProps.sortStatePath : undefined;
  const [localSortState, setLocalSortState] = useState<SortState>({ column: '', direction: null });

  const scopeSortState = useScopeSelector(
    (scopeData) => {
      if (sortOwnership !== 'scope' || !sortStatePath) {
        return undefined;
      }

      const value = getIn(scopeData, sortStatePath) as Record<string, unknown> | undefined;
      return {
        column: typeof value?.column === 'string' ? value.column : '',
        direction:
          value?.direction === 'asc' || value?.direction === 'desc' ? value.direction : null,
      } satisfies SortState;
    },
    (a, b) => a?.column === b?.column && a?.direction === b?.direction,
  );

  const sortState = useMemo(
    () =>
      sortOwnership === 'scope'
        ? (scopeSortState ?? { column: '', direction: null })
        : localSortState,
    [localSortState, scopeSortState, sortOwnership],
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
        scope: helpers.createScope(
          { column: columnName, direction: newDirection },
          { scopeKey: 'sort', pathSuffix: 'sort' },
        ),
      });
    },
    [columns, helpers, onSortChange, renderScope, sortOwnership, sortState, sortStatePath],
  );

  return { sortState, handleSort };
}
