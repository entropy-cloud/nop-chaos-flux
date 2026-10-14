import { useEffect, useRef } from 'react';
import type { RendererHelpers } from '@nop-chaos/flux-core';
import type { TableSchema } from '../schemas.js';
import type { TableRowEntry } from './types.js';
import { useTableLazyChildren } from './use-table-lazy-children.js';
import { readChildren, useTableTree } from './use-table-tree.js';

export function useTableTreeData(
  tableSchemaProps: TableSchema,
  filteredData: TableRowEntry[],
  helpers: RendererHelpers,
) {
  // Lazy children loading for tree table (T11): when a tree node with
  // childrenSource is expanded, trigger an action dispatch to fetch children.
  const { lazyChildrenMap, loadChildren, refreshNode } = useTableLazyChildren({
    childrenSource: tableSchemaProps.childrenSource,
    helpers,
  });
  // Flatten the tree BEFORE building selection so selection's row-key set covers
  // expanded nested children (G2). Previously selection consumed the top-level
  // filteredData, so currentRowKeySet lacked child keys and the render-time
  // prune snapped a just-checked child back to unchecked. In non-tree mode
  // useTableTree returns its input unchanged, so this is a no-op for flat tables.
  const {
    treeMode,
    treeRows: treeFlattenedData,
    expandedTreeRowKeys,
    handleToggleTreeExpand,
  } = useTableTree(tableSchemaProps, filteredData, lazyChildrenMap);
  // Auto-trigger lazy children load when a tree node is expanded.
  const prevExpandedRef = useRef(expandedTreeRowKeys);
  useEffect(() => {
    if (!treeMode || !tableSchemaProps.childrenSource) return;
    const prev = prevExpandedRef.current;
    const next = expandedTreeRowKeys;
    for (const key of next) {
      // P1-3: re-load when the node has no cached children OR the cache holds a
      // failed state (error) — a stale error must not permanently block reloads.
      const cached = lazyChildrenMap.get(key);
      if (!prev.has(key) && (!cached || cached.error)) {
        const row = filteredData.find((r) => (r.cacheKey ?? r.rowKey) === key);
        if (row && row.record && !readChildren(row.record, tableSchemaProps.rowChildrenField!)) {
          loadChildren(key, row.record);
        }
      }
    }
    for (const key of prev) {
      if (!next.has(key)) {
        // Node collapsed — keep cached children for next expand
      }
    }
    prevExpandedRef.current = next;
  }, [
    treeMode,
    tableSchemaProps,
    expandedTreeRowKeys,
    lazyChildrenMap,
    filteredData,
    loadChildren,
  ]);

  // P1-3: retry path for a failed lazy load. refreshNode clears the error state
  // (so the auto-trigger effect above can re-run) and loadChildren re-fetches
  // with the same row scope; used by the error-state tree toggle.
  const handleRetryTreeLoad = (rowKey: string) => {
    const row = filteredData.find((r) => (r.cacheKey ?? r.rowKey) === rowKey);
    if (!row || !row.record) return;
    refreshNode(rowKey);
    loadChildren(rowKey, row.record);
  };

  return {
    treeMode,
    treeFlattenedData,
    expandedTreeRowKeys,
    handleToggleTreeExpand,
    lazyChildrenMap,
    handleRetryTreeLoad,
  };
}
