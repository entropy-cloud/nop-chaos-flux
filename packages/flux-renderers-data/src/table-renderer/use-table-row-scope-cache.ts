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
    const state = { cache: new Map<string, ScopeRef>() };
    const listeners = new Set<() => void>();

    return {
      getSnapshot: () => state.cache,
      mutate(updater: (cache: Map<string, ScopeRef>) => void) {
        const next = new Map(state.cache);
        updater(next);
        state.cache = next;
        listeners.forEach((listener) => listener());
      },
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }
    };
  }, []);

  const rowScopeCache = useSyncExternalStore(rowScopeCacheStore.subscribe, rowScopeCacheStore.getSnapshot);
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
