import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import type { TableSchema } from '../schemas.js';
import type { TableRowEntry } from './types.js';
import { createRowScopeId, createRowScopePath } from './table-data.js';

interface RowScopePayload {
  record: TableRowEntry['record'];
  index: number;
}

interface RowScopeCacheState {
  scopes: Map<string, ScopeRef>;
  snapshots: Map<string, RowScopePayload>;
}

const tableRowScopeCaches = new Map<string, RowScopeCacheState>();
const tableRowScopeVersions = new Map<string, number>();
const tableRowScopeListeners = new Map<string, Set<() => void>>();

export function __getTableRowScopeCacheSizeForTests() {
  return tableRowScopeCaches.size;
}

export function __hasTableRowScopeCacheForTests(cacheKey: string) {
  return tableRowScopeCaches.has(cacheKey);
}

export function __resetTableRowScopeCachesForTests() {
  tableRowScopeCaches.clear();
}

function createRowScopeCacheState(): RowScopeCacheState {
  return {
    scopes: new Map<string, ScopeRef>(),
    snapshots: new Map<string, RowScopePayload>(),
  };
}

function notifyListeners(cacheKey: string) {
  for (const listener of tableRowScopeListeners.get(cacheKey) ?? []) {
    listener();
  }
}

function subscribeToCache(cacheKey: string, listener: () => void) {
  let listeners = tableRowScopeListeners.get(cacheKey);
  if (!listeners) {
    listeners = new Set();
    tableRowScopeListeners.set(cacheKey, listeners);
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      tableRowScopeListeners.delete(cacheKey);
    }
  };
}

function getCacheVersion(cacheKey: string) {
  return tableRowScopeVersions.get(cacheKey) ?? 0;
}

function bumpCacheVersion(cacheKey: string) {
  tableRowScopeVersions.set(cacheKey, getCacheVersion(cacheKey) + 1);
  notifyListeners(cacheKey);
}

function createRowScopeCacheSnapshot(
  rowScopeCache: Map<string, ScopeRef>,
  _structureVersion: number,
): Map<string, ScopeRef> {
  return new Map(rowScopeCache);
}

function disposeRowScope(disposeScope: (scopeId: string) => void, scope: ScopeRef | undefined) {
  if (!scope) {
    return;
  }

  disposeScope(scope.id);
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
  const duplicateRowKeysRef = useRef<Set<string>>(new Set());
  const createScopeRef = useRef(helpers.createScope);
  const disposeScopeRef = useRef(helpers.disposeScope);

  const structureVersion = useSyncExternalStore(
    (listener) => subscribeToCache(cacheKey, listener),
    () => getCacheVersion(cacheKey),
  );

  useLayoutEffect(() => {
    createScopeRef.current = helpers.createScope;
    disposeScopeRef.current = helpers.disposeScope;
  }, [helpers.createScope, helpers.disposeScope]);

  useLayoutEffect(() => {
    tableRowScopeCaches.set(cacheKey, cacheState);

    return () => {
      if (tableRowScopeCaches.get(cacheKey) === cacheState) {
        for (const scope of rowScopeCache.values()) {
          disposeRowScope(disposeScopeRef.current, scope);
        }
        rowScopeCache.clear();
        rowScopeSnapshots.clear();
        duplicateRowKeysRef.current.clear();
        tableRowScopeCaches.delete(cacheKey);
        tableRowScopeVersions.delete(cacheKey);
      }
    };
  }, [cacheKey, cacheState, rowScopeCache, rowScopeSnapshots]);

  useLayoutEffect(() => {
    let structureChanged = false;
    const visibleKeys = new Set<string>();
    const duplicateRowKeys = new Set<string>();
    const seenRowKeys = new Set<string>();

    for (const entry of processedData) {
      const payload = { record: entry.record, index: entry.sourceIndex };
      const cacheEntryKey = entry.cacheKey ?? entry.rowKey;
      visibleKeys.add(cacheEntryKey);

      if (seenRowKeys.has(entry.rowKey)) {
        duplicateRowKeys.add(entry.rowKey);
      } else {
        seenRowKeys.add(entry.rowKey);
      }

      const existingScope = rowScopeCache.get(cacheEntryKey);

      if (!existingScope) {
        const createdScope = createScopeRef.current(payload, {
          scopeKey: createRowScopeId(ownerKey, cacheEntryKey),
          pathSuffix: createRowScopePath(path, cacheEntryKey),
          isolate: true,
          source: 'row',
        });
        rowScopeCache.set(cacheEntryKey, createdScope);
        rowScopeSnapshots.set(cacheEntryKey, payload);
        structureChanged = true;
        continue;
      }

      const previous = rowScopeSnapshots.get(cacheEntryKey);
      publishRowScopePayload(existingScope, payload, previous);
      rowScopeSnapshots.set(cacheEntryKey, payload);
    }

    for (const key of Array.from(rowScopeCache.keys())) {
      if (visibleKeys.has(key)) {
        continue;
      }

      disposeRowScope(disposeScopeRef.current, rowScopeCache.get(key));
      rowScopeCache.delete(key);
      rowScopeSnapshots.delete(key);
      structureChanged = true;
    }

    const duplicatesChanged =
      duplicateRowKeys.size !== duplicateRowKeysRef.current.size ||
      Array.from(duplicateRowKeys).some((key) => !duplicateRowKeysRef.current.has(key));

    if (duplicatesChanged) {
      duplicateRowKeysRef.current = duplicateRowKeys;
      structureChanged = true;
    }

    if (structureChanged) {
      bumpCacheVersion(cacheKey);
    }
  }, [cacheKey, cacheState, ownerKey, path, processedData, rowScopeCache, rowScopeSnapshots]);

  return createRowScopeCacheSnapshot(rowScopeCache, structureVersion);
}
