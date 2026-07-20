import { useCallback, useMemo, useState } from 'react';
import type { TableSchema } from '../schemas.js';
import type { TableRowEntry } from './types.js';
import type { LazyChildrenState } from './use-table-lazy-children.js';

export interface TreeRowEntry extends TableRowEntry {
  level: number;
  hasChildren: boolean;
  parentRowKey?: string;
  treePath: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function readChildren(record: Record<string, unknown>, field: string): unknown[] | undefined {
  const value = record[field];
  if (Array.isArray(value) && value.length > 0) {
    return value;
  }
  return undefined;
}

export function isDevRuntime() {
  const importMeta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return importMeta.env?.DEV === true;
}

export interface FlattenTreeRowsOptions {
  rowChildrenField: string;
  expandedTreeRowKeys: Set<string>;
  defaultExpanded?: boolean;
  maxDepth?: number;
  lazyChildrenMap?: ReadonlyMap<string, LazyChildrenState>;
  hasChildrenSource?: boolean;
}

export function flattenTreeRows(
  rows: readonly TableRowEntry[],
  options: FlattenTreeRowsOptions,
): TreeRowEntry[] {
  const { rowChildrenField, expandedTreeRowKeys, defaultExpanded = false, maxDepth, lazyChildrenMap, hasChildrenSource } = options;
  const result: TreeRowEntry[] = [];
  const visited = new Set<string>();

  const walk = (
    entries: readonly TableRowEntry[],
    level: number,
    parentRowKey: string | undefined,
    parentPath: readonly string[],
  ) => {
    for (const entry of entries) {
      const rowKey = entry.cacheKey ?? entry.rowKey;
      if (visited.has(rowKey)) {
        if (isDevRuntime()) {
          console.warn(
            `[TableRenderer] Tree table cycle detected at rowKey "${rowKey}"; truncating this branch.`,
          );
        }
        continue;
      }
      visited.add(rowKey);

      const syncChildren = readChildren(entry.record, rowChildrenField);
      const lazyState = lazyChildrenMap?.get(rowKey);
      const lazyChildren = lazyState?.children;
      const children = syncChildren ?? lazyChildren;
      const hasChildren = Boolean(children) || Boolean(lazyChildrenMap?.has(rowKey) && lazyState !== undefined && lazyState.loading) || Boolean(hasChildrenSource);
      const treePath: string[] = [...parentPath, rowKey];
      const isRoot = level === 0;

      const treeRow: TreeRowEntry = {
        ...entry,
        level,
        hasChildren,
        parentRowKey,
        treePath,
      };
      result.push(treeRow);

      const isExpanded = isRoot
        ? defaultExpanded || expandedTreeRowKeys.has(rowKey)
        : expandedTreeRowKeys.has(rowKey);

      if (children && isExpanded && (maxDepth === undefined || level + 1 <= maxDepth)) {
        const childEntries: TableRowEntry[] = children.map((child, index) => {
          if (isRecord(child)) {
            const childRowKey = String(
              child.__rowKey ?? child.id ?? `${rowKey}::child:${index}`,
            );
            return {
              rowKey: childRowKey,
              cacheKey: childRowKey,
              sourceIndex: entry.sourceIndex,
              record: child,
            } satisfies TableRowEntry;
          }
          return {
            rowKey: `${rowKey}::child:${index}`,
            cacheKey: `${rowKey}::child:${index}`,
            sourceIndex: entry.sourceIndex,
            record: {},
          } satisfies TableRowEntry;
        });
        walk(childEntries, level + 1, rowKey, treePath);
      }

      visited.delete(rowKey);
    }
  };

  walk(rows, 0, undefined, []);
  return result;
}

export interface UseTableTreeApi {
  treeMode: boolean;
  treeRows: TreeRowEntry[];
  expandedTreeRowKeys: Set<string>;
  handleToggleTreeExpand: (rowKey: string) => void;
}

export function useTableTree(
  schemaProps: TableSchema,
  processedData: TableRowEntry[],
  lazyChildrenMap?: ReadonlyMap<string, LazyChildrenState>,
): UseTableTreeApi {
  const rowChildrenField = schemaProps.rowChildrenField;
  const treeMode = typeof rowChildrenField === 'string' && rowChildrenField.length > 0;
  const hasChildrenSource = treeMode && Boolean(schemaProps.childrenSource);
  const [expandedTreeRowKeys, setExpandedTreeRowKeys] = useState<Set<string>>(new Set());

  const handleToggleTreeExpand = useCallback((rowKey: string) => {
    setExpandedTreeRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  }, []);

  const treeRows = useMemo<TreeRowEntry[]>(() => {
    if (!treeMode) {
      return processedData as TreeRowEntry[];
    }
    return flattenTreeRows(processedData, {
      rowChildrenField: rowChildrenField!,
      expandedTreeRowKeys,
      lazyChildrenMap: treeMode ? lazyChildrenMap : undefined,
      hasChildrenSource,
    });
  }, [processedData, treeMode, rowChildrenField, expandedTreeRowKeys, lazyChildrenMap, hasChildrenSource]);

  return {
    treeMode,
    treeRows,
    expandedTreeRowKeys,
    handleToggleTreeExpand,
  };
}
