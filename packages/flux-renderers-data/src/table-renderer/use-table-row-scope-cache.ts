import { useMemo, useRef } from 'react';
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
  const rowScopeCache = useMemo(() => new Map<string, ScopeRef>(), []);
  const rowScopeSnapshotRef = useRef(new Map<string, { record: Record<string, any>; index: number }>());

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
        source: 'row'
      });
      rowScopeCache.set(entry.rowKey, createdScope);
      rowScopeSnapshotRef.current.set(entry.rowKey, payload);
      continue;
    }

    const previous = rowScopeSnapshotRef.current.get(entry.rowKey);
    syncRowScope(existingScope, payload, previous);
    rowScopeSnapshotRef.current.set(entry.rowKey, payload);
  }

  for (const key of Array.from(rowScopeCache.keys())) {
    if (nextVisibleKeys.has(key)) {
      continue;
    }
    rowScopeCache.delete(key);
    rowScopeSnapshotRef.current.delete(key);
  }

  return rowScopeCache;
}
