import { startTransition, useCallback, useMemo, useState } from 'react';
import { getIn, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas.js';
import type { SortState } from './types.js';

function toSortDirection(value: unknown): SortState['direction'] {
  return value === 'asc' || value === 'desc' ? value : null;
}

function toSortState(value: unknown): SortState {
  const record = value as { column?: unknown; field?: unknown; direction?: unknown; order?: unknown } | undefined;
  return {
    column:
      typeof record?.column === 'string'
        ? record.column
        : typeof record?.field === 'string'
          ? record.field
          : '',
    direction: toSortDirection(record?.direction ?? record?.order),
  };
}

export function useTableSort(
  schemaProps: TableSchema,
  onSortChange: RendererComponentProps<TableSchema>['events']['onSortChange'],
  columns: NonNullable<TableSchema['columns']>,
  helpers: RendererComponentProps<TableSchema>['helpers'],
) {
  const controlledSortInput = schemaProps as TableSchema & {
    sortColumn?: unknown;
    sortDirection?: unknown;
    sort?: {
      column?: unknown;
      direction?: unknown;
    };
  };
  const renderScope = useRenderScope();
  const sortOwnership = schemaProps.sortOwnership ?? 'local';
  const sortStatePath =
    typeof schemaProps.sortStatePath === 'string' ? schemaProps.sortStatePath : undefined;
  const [localSortState, setLocalSortState] = useState<SortState>({ column: '', direction: null });
  const controlledSortState = useMemo(
    () =>
      toSortState({
        column: controlledSortInput.sortColumn,
        field: controlledSortInput.sort?.column,
        direction: controlledSortInput.sortDirection,
        order: controlledSortInput.sort?.direction,
      }),
    [controlledSortInput],
  );

  const scopeSortState = useScopeSelector(
    (scopeData) => {
      if (sortOwnership !== 'scope' || !sortStatePath) {
        return undefined;
      }

      return toSortState(getIn(scopeData, sortStatePath));
    },
    (a, b) => a?.column === b?.column && a?.direction === b?.direction,
    { paths: sortStatePath ? [sortStatePath] : undefined },
  );

  const sortState = useMemo(
    () =>
      sortOwnership === 'controlled'
        ? controlledSortState
        : sortOwnership === 'scope'
        ? (scopeSortState ?? { column: '', direction: null })
        : localSortState,
    [controlledSortState, localSortState, scopeSortState, sortOwnership],
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
        } else if (sortOwnership === 'local') {
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
