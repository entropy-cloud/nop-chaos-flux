import { useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import type { TableSchema } from '../schemas';
import type { TableRowEntry } from './types';
import { createRowScopeId, createRowScopePath } from './table-data';

interface RowScopePayload {
  record: Record<string, any>;
  index: number;
}

interface RowScopeCacheState {
  scopes: Map<string, ScopeRef>;
  snapshots: Map<string, RowScopePayload>;
  version: number;
  listeners: Set<() => void>;
}

const tableRowScopeCaches = new Map<string, RowScopeCacheState>();

export function __getTableRowScopeCacheSizeForTests() {
  return tableRowScopeCaches.size;
}

export function __hasTableRowScopeCacheForTests(cacheKey: string) {
  return tableRowScopeCaches.has(cacheKey);
}

function createRowScopeCacheState(): RowScopeCacheState {
  return {
    scopes: new Map<string, ScopeRef>(),
    snapshots: new Map<string, RowScopePayload>(),
    version: 0,
    listeners: new Set(),
  };
}

function notifyListeners(state: RowScopeCacheState) {
  state.version += 1;
  for (const listener of state.listeners) {
    listener();
  }
}

function subscribeToCache(state: RowScopeCacheState, listener: () => void) {
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
}

function publishRowScopePayload(
  scope: ScopeRef,
  payload: RowScopePayload,
  previous: RowScopePayload | undefined,
): void {
  const changedRoots: Partial<RowScopePayload> = {};

  if (!previous || previous.record !== payload.record) {
    changedRoots.record = payload.record;
  }

  if (!previous || previous.index !== payload.index) {
    changedRoots.index = payload.index;
  }

  if (Object.keys(changedRoots).length === 0) {
    return;
  }

  scope.merge(changedRoots);
}

export function useTableRowScopeCache(
  processedData: TableRowEntry[],
  ownerKey: string,
  helpers: RendererComponentProps<TableSchema>['helpers'],
  path: RendererComponentProps<TableSchema>['path'],
) {
  const cacheKey = `${ownerKey}::${path}`;

  const [cacheState] = useState(() => {
    const existing = tableRowScopeCaches.get(cacheKey);
    if (existing) return existing;
    const created = createRowScopeCacheState();
    tableRowScopeCaches.set(cacheKey, created);
    return created;
  });

  const rowScopeCache = cacheState.scopes;
  const rowScopeSnapshots = cacheState.snapshots;

  const version = useSyncExternalStore(
    (listener) => subscribeToCache(cacheState, listener),
    () => cacheState.version,
  );

  const entries = useMemo(
    () =>
      processedData.map((entry) => ({
        rowKey: entry.rowKey,
        payload: { record: entry.record, index: entry.sourceIndex },
      })),
    [processedData],
  );

  const visibleKeys = useMemo(
    () => new Set(processedData.map((entry) => entry.rowKey)),
    [processedData],
  );

  useLayoutEffect(() => {
    return () => {
      if (tableRowScopeCaches.get(cacheKey) === cacheState) {
        rowScopeCache.clear();
        rowScopeSnapshots.clear();
        tableRowScopeCaches.delete(cacheKey);
      }
    };
  }, [cacheKey, cacheState, rowScopeCache, rowScopeSnapshots]);

  useLayoutEffect(() => {
    let changed = false;

    for (const { rowKey, payload } of entries) {
      const existingScope = rowScopeCache.get(rowKey);

      if (!existingScope) {
        const createdScope = helpers.createScope(payload, {
          scopeKey: createRowScopeId(ownerKey, rowKey),
          pathSuffix: createRowScopePath(path, rowKey),
          isolate: true,
          source: 'row',
        });
        rowScopeCache.set(rowKey, createdScope);
        rowScopeSnapshots.set(rowKey, payload);
        changed = true;
        continue;
      }

      const previous = rowScopeSnapshots.get(rowKey);
      const payloadChanged = !previous || previous.record !== payload.record || previous.index !== payload.index;
      publishRowScopePayload(existingScope, payload, previous);
      rowScopeSnapshots.set(rowKey, payload);
      changed = changed || payloadChanged;
    }

    for (const key of Array.from(rowScopeCache.keys())) {
      if (visibleKeys.has(key)) {
        continue;
      }

      rowScopeCache.delete(key);
      rowScopeSnapshots.delete(key);
      changed = true;
    }

    if (changed) {
      notifyListeners(cacheState);
    }
  }, [cacheState, entries, helpers, ownerKey, path, rowScopeCache, rowScopeSnapshots, visibleKeys]);

  void version;

  return useMemo(() => new Map(rowScopeCache), [version]);
}
