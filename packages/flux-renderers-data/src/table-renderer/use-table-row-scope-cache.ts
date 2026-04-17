import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import type { TableSchema } from '../schemas';
import type { TableRowEntry } from './types';
import { createRowScopeId, createRowScopePath } from './table-data';

function syncRowScope(
  scope: ScopeRef,
  payload: { record: Record<string, any>; index: number },
  previous: { record: Record<string, any>; index: number } | undefined
): void {
  if (!previous || previous.record !== payload.record) {
    scope.merge({ record: payload.record });
  }
  if (!previous || previous.index !== payload.index) {
    scope.merge({ index: payload.index });
  }
}

export function useTableRowScopeCache(
  processedData: TableRowEntry[],
  ownerKey: string,
  helpers: RendererComponentProps<TableSchema>['helpers'],
  path: RendererComponentProps<TableSchema>['path']
) {
  const rowScopeCacheStore = useMemo(() => {
    const state = {
      cache: new Map<string, ScopeRef>(),
      generation: 0,
      snapshot: {
        cache: new Map<string, ScopeRef>(),
        generation: 0
      },
      listeners: new Set<() => void>()
    };

    state.snapshot = {
      cache: state.cache,
      generation: state.generation
    };

    return {
      getSnapshot: () => state.snapshot,
      getCache: () => state.cache,
      mutate(updater: (cache: Map<string, ScopeRef>) => void) {
        updater(state.cache);
        state.generation += 1;
        state.snapshot = { cache: state.cache, generation: state.generation };
        state.listeners.forEach((listener) => listener());
      },
      subscribe(listener: () => void) {
        state.listeners.add(listener);
        return () => {
          state.listeners.delete(listener);
        };
      }
    };
  }, []);

  const rowScopeSnapshot = useSyncExternalStore(rowScopeCacheStore.subscribe, rowScopeCacheStore.getSnapshot);
  const rowScopeCache = rowScopeSnapshot.cache;
  const rowScopeSnapshotRef = useRef(new Map<string, { record: Record<string, any>; index: number }>());

  useLayoutEffect(() => {
    rowScopeCacheStore.mutate((next) => {
      const nextVisibleKeys = new Set<string>();

      for (const entry of processedData) {
        nextVisibleKeys.add(entry.rowKey);
        const existingScope = next.get(entry.rowKey);
        const payload = { record: entry.record, index: entry.sourceIndex };

        if (!existingScope) {
          const createdScope = helpers.createScope(payload, {
            scopeKey: createRowScopeId(ownerKey, entry.rowKey),
            pathSuffix: createRowScopePath(path, entry.rowKey),
            isolate: true,
            source: 'row'
          });
          next.set(entry.rowKey, createdScope);
          rowScopeSnapshotRef.current.set(entry.rowKey, payload);
          continue;
        }

        const previous = rowScopeSnapshotRef.current.get(entry.rowKey);
        syncRowScope(existingScope, payload, previous);
        rowScopeSnapshotRef.current.set(entry.rowKey, payload);
      }

      for (const key of Array.from(next.keys())) {
        if (nextVisibleKeys.has(key)) {
          continue;
        }
        next.delete(key);
        rowScopeSnapshotRef.current.delete(key);
      }
    });
  }, [processedData, ownerKey, helpers, path, rowScopeCacheStore]);

  return rowScopeCache;
}
