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
}

const tableRowScopeCaches = new Map<string, RowScopeCacheState>();

function getRowScopeCacheState(cacheKey: string): RowScopeCacheState {
  let state = tableRowScopeCaches.get(cacheKey);
  if (!state) {
    state = {
      scopes: new Map<string, ScopeRef>(),
      snapshots: new Map<string, RowScopePayload>(),
    };
    tableRowScopeCaches.set(cacheKey, state);
  }
  return state;
}

function syncRowScope(
  scope: ScopeRef,
  payload: RowScopePayload,
  previous: RowScopePayload | undefined,
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
  path: RendererComponentProps<TableSchema>['path'],
) {
  const cacheState = getRowScopeCacheState(`${ownerKey}::${path}`);
  const rowScopeCache = cacheState.scopes;
  const rowScopeSnapshots = cacheState.snapshots;

  const nextVisibleKeys = new Set<string>();

  for (const entry of processedData) {
    nextVisibleKeys.add(entry.rowKey);
    const existingScope = rowScopeCache.get(entry.rowKey);
    const payload = { record: entry.record, index: entry.sourceIndex };

    if (!existingScope) {
      const createdScope = helpers.createScope(payload, {
        scopeKey: createRowScopeId(ownerKey, entry.rowKey),
        pathSuffix: createRowScopePath(path, entry.rowKey),
        isolate: true,
        source: 'row',
      });
      rowScopeCache.set(entry.rowKey, createdScope);
      rowScopeSnapshots.set(entry.rowKey, payload);
      continue;
    }

    const previous = rowScopeSnapshots.get(entry.rowKey);
    syncRowScope(existingScope, payload, previous);
    rowScopeSnapshots.set(entry.rowKey, payload);
  }

  for (const key of Array.from(rowScopeCache.keys())) {
    if (nextVisibleKeys.has(key)) {
      continue;
    }
    rowScopeCache.delete(key);
    rowScopeSnapshots.delete(key);
  }

  return rowScopeCache;
}
