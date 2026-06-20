import { startTransition, useCallback, useMemo, useState } from 'react';
import { getIn, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas.js';
import { createTableEventContext } from './table-event-context.js';
import type { MultiSortState, SortEntry, SortState } from './types.js';

function toSortDirection(value: unknown): SortState['direction'] {
  return value === 'asc' || value === 'desc' ? value : null;
}

function toSingleSortState(value: unknown): SortState {
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

function toMultiSortState(value: unknown): MultiSortState {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const record = entry as { column?: unknown; field?: unknown; direction?: unknown; order?: unknown };
        const column =
          typeof record.column === 'string'
            ? record.column
            : typeof record.field === 'string'
              ? record.field
              : '';
        const direction = toSortDirection(record.direction ?? record.order);
        if (!column || !direction) return null;
        return { column, direction } satisfies SortEntry;
      })
      .filter((entry): entry is SortEntry => entry !== null);
  }
  const single = toSingleSortState(value);
  if (!single.column || !single.direction) return [];
  return [{ column: single.column, direction: single.direction }];
}

function singleToEntries(state: SortState): MultiSortState {
  if (!state.column || !state.direction) return [];
  return [{ column: state.column, direction: state.direction }];
}

function entriesToSingle(entries: MultiSortState): SortState {
  if (entries.length === 0) return { column: '', direction: null };
  const first = entries[0]!;
  return { column: first.column, direction: first.direction };
}

function entriesEqual(a: MultiSortState, b: MultiSortState): boolean {
  if (a.length !== b.length) return false;
  return a.every((entry, index) => {
    const other = b[index];
    return Boolean(other) && entry.column === other.column && entry.direction === other.direction;
  });
}

export interface UseTableSortApi {
  sortState: SortState;
  sortEntries: MultiSortState;
  handleSort: (columnName: string, multiKey?: boolean) => void;
}

export function useTableSort(
  schemaProps: TableSchema,
  onSortChange: RendererComponentProps<TableSchema>['events']['onSortChange'],
  columns: NonNullable<TableSchema['columns']>,
  helpers: RendererComponentProps<TableSchema>['helpers'],
): UseTableSortApi {
  const controlledSortInput = schemaProps as TableSchema & {
    sortColumn?: unknown;
    sortDirection?: unknown;
    sort?: unknown;
    sortEntries?: unknown;
  };
  const renderScope = useRenderScope();
  const sortOwnership = schemaProps.sortOwnership ?? 'local';
  const sortStatePath =
    typeof schemaProps.sortStatePath === 'string' ? schemaProps.sortStatePath : undefined;
  const multiSortEnabled = schemaProps.multiSort === true;

  const [localSingleSort, setLocalSingleSort] = useState<SortState>({ column: '', direction: null });
  const [localMultiEntries, setLocalMultiEntries] = useState<MultiSortState>([]);
  const [localMultiActive, setLocalMultiActive] = useState<boolean>(multiSortEnabled);

  const controlledSingleSort = useMemo<SortState>(() => {
    if (multiSortEnabled) {
      const entries = toMultiSortState(
        controlledSortInput.sortEntries ?? controlledSortInput.sort,
      );
      if (entries.length === 0) return { column: '', direction: null };
      return { column: entries[0]!.column, direction: entries[0]!.direction };
    }
    return toSingleSortState({
      column: controlledSortInput.sortColumn,
      field: (controlledSortInput.sort as { column?: unknown } | undefined)?.column,
      direction: controlledSortInput.sortDirection,
      order: (controlledSortInput.sort as { direction?: unknown } | undefined)?.direction,
    });
  }, [controlledSortInput, multiSortEnabled]);

  const controlledMultiEntries = useMemo<MultiSortState>(
    () =>
      multiSortEnabled
        ? toMultiSortState(controlledSortInput.sortEntries ?? controlledSortInput.sort)
        : singleToEntries(controlledSingleSort),
    [controlledSortInput.sort, controlledSortInput.sortEntries, controlledSingleSort, multiSortEnabled],
  );

  const scopeSingleSort = useScopeSelector(
    (scopeData) => {
      if (sortOwnership !== 'scope' || !sortStatePath || multiSortEnabled) {
        return undefined;
      }
      return toSingleSortState(getIn(scopeData, sortStatePath));
    },
    (a, b) => a?.column === b?.column && a?.direction === b?.direction,
    { paths: sortStatePath && !multiSortEnabled ? [sortStatePath] : undefined },
  );

  const scopeMultiEntries = useScopeSelector(
    (scopeData) => {
      if (sortOwnership !== 'scope' || !sortStatePath || !multiSortEnabled) {
        return undefined;
      }
      return toMultiSortState(getIn(scopeData, sortStatePath));
    },
    (a, b) => (a && b ? entriesEqual(a, b) : a === b),
    { paths: sortStatePath && multiSortEnabled ? [sortStatePath] : undefined },
  );

  const isMultiMode = multiSortEnabled || localMultiActive;

  const sortEntries = useMemo<MultiSortState>(() => {
    if (isMultiMode) {
      if (sortOwnership === 'controlled') {
        if (multiSortEnabled && controlledMultiEntries.length === 0) {
          const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
          if (importMeta.env?.DEV === true) {
            console.warn(
              '[TableRenderer] multiSort: true with sortOwnership: "controlled" but no sort state provided; falling back to empty (no active sort).',
            );
          }
        }
        return controlledMultiEntries;
      }
      if (sortOwnership === 'scope') return scopeMultiEntries ?? [];
      return localMultiEntries;
    }
    return singleToEntries(sortOwnership === 'controlled' ? controlledSingleSort : sortOwnership === 'scope' ? (scopeSingleSort ?? { column: '', direction: null }) : localSingleSort);
  }, [
    controlledMultiEntries,
    controlledSingleSort,
    isMultiMode,
    localMultiEntries,
    localSingleSort,
    multiSortEnabled,
    scopeMultiEntries,
    scopeSingleSort,
    sortOwnership,
  ]);

  const sortState = useMemo<SortState>(() => {
    if (isMultiMode) {
      if (sortOwnership === 'controlled') return controlledSingleSort;
      if (sortOwnership === 'scope') {
        const entries = scopeMultiEntries ?? [];
        return entries.length === 0
          ? { column: '', direction: null }
          : { column: entries[0]!.column, direction: entries[0]!.direction };
      }
      return entriesToSingle(localMultiEntries);
    }
    if (sortOwnership === 'controlled') return controlledSingleSort;
    if (sortOwnership === 'scope') return scopeSingleSort ?? { column: '', direction: null };
    return localSingleSort;
  }, [
    controlledSingleSort,
    isMultiMode,
    localMultiEntries,
    localSingleSort,
    scopeMultiEntries,
    scopeSingleSort,
    sortOwnership,
  ]);

  const handleSort = useCallback(
    (columnName: string, multiKey?: boolean) => {
      if (!columnName || !columns.find((c) => c.name === columnName && c.sortable)) {
        return;
      }

      const accumulate = multiSortEnabled || multiKey === true;

      if (accumulate) {
        const baseEntries = sortEntries;
        const current = baseEntries.find((entry) => entry.column === columnName);
        let nextDirection: 'asc' | 'desc' | null;
        if (!current) {
          nextDirection = 'asc';
        } else if (current.direction === 'asc') {
          nextDirection = 'desc';
        } else if (current.direction === 'desc') {
          nextDirection = null;
        } else {
          nextDirection = 'asc';
        }

        let nextEntries: MultiSortState;
        if (nextDirection === null) {
          nextEntries = baseEntries.filter((entry) => entry.column !== columnName);
        } else if (!current) {
          nextEntries = [...baseEntries, { column: columnName, direction: nextDirection }];
        } else {
          nextEntries = baseEntries.map((entry) =>
            entry.column === columnName ? { column: columnName, direction: nextDirection } : entry,
          );
        }

        startTransition(() => {
          if (sortOwnership === 'scope' && sortStatePath) {
            renderScope.update(sortStatePath, nextEntries);
          } else if (sortOwnership === 'local') {
            setLocalMultiEntries(nextEntries);
            setLocalMultiActive(true);
            const primary = nextEntries[0];
            setLocalSingleSort(
              primary
                ? { column: primary.column, direction: primary.direction }
                : { column: columnName, direction: null },
            );
          }
        });

        const payload = {
          type: 'table:sort-change' as const,
          column: columnName,
          direction: nextDirection,
          sort: nextEntries,
          sortEntries: nextEntries,
        };

        onSortChange?.(
          null,
          createTableEventContext(payload, {
            helpers,
            scopeKey: 'sort',
            pathSuffix: 'sort',
            event: payload,
          }),
        );
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
          setLocalSingleSort(newState);
          setLocalMultiActive(false);
          setLocalMultiEntries([]);
        }
      });

      const payload = {
        type: 'table:sort-change' as const,
        column: columnName,
        direction: newDirection,
        sort: newState,
      };

      onSortChange?.(
        null,
        createTableEventContext(payload, {
          helpers,
          scopeKey: 'sort',
          pathSuffix: 'sort',
          event: payload,
        }),
      );
    },
    [columns, helpers, multiSortEnabled, onSortChange, renderScope, sortEntries, sortOwnership, sortState, sortStatePath],
  );

  return { sortState, sortEntries, handleSort };
}
