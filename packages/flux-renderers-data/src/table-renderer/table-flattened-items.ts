import type { InstanceFrame, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import type { TableSchema, TableColumnSchema } from '../schemas.js';
import type { TableRowEntry } from './types.js';

export interface FlattenedRow {
  kind: 'data';
  entry: TableRowEntry;
  rowScope: ScopeRef;
  rowKey: string;
  rowInstancePath: InstanceFrame[];
  isExpanded: boolean;
  isSelected: boolean;
  isEven: boolean;
}

export interface FlattenedExpandedRow {
  kind: 'expanded';
  rowKey: string;
  columnCount: number;
}

export type FlattenedItem = FlattenedRow | FlattenedExpandedRow;

export function buildFlattenedItems(
  processedData: TableRowEntry[],
  rowScopeCache: Map<string, ScopeRef>,
  expandedRowKeys: Set<string>,
  selectedRowKeys: Set<string>,
  columnCount: number,
  parentProps: RendererComponentProps<TableSchema>,
  rowRepeatedTemplateId: string,
): FlattenedItem[] {
  const items: FlattenedItem[] = [];

  for (const entry of processedData) {
    const cacheKey = entry.cacheKey ?? entry.rowKey;
    const rowScope = rowScopeCache.get(cacheKey);
    if (!rowScope) continue;

    const rowKey = cacheKey;
    const rowInstancePath: InstanceFrame[] = [
      ...(parentProps.node.instancePath ?? []),
      { repeatedTemplateId: rowRepeatedTemplateId, instanceKey: rowKey },
    ];
    const isExpanded = expandedRowKeys.has(rowKey);

    items.push({
      kind: 'data',
      entry,
      rowScope,
      rowKey,
      rowInstancePath,
      isExpanded,
      isSelected: selectedRowKeys.has(rowKey),
      isEven: entry.sourceIndex % 2 === 0,
    });

    if (isExpanded) {
      items.push({ kind: 'expanded', rowKey, columnCount });
    }
  }

  return items;
}

export function areColumnsRenderEquivalent(
  prev: TableColumnSchema[],
  next: TableColumnSchema[],
) {
  if (prev === next) {
    return true;
  }

  if (prev.length !== next.length) {
    return false;
  }

  return prev.every((column, index) => {
    const nextColumn = next[index];
    if (!nextColumn) {
      return false;
    }

    return (
      column === nextColumn ||
      (column.name === nextColumn.name &&
        column.type === nextColumn.type &&
        column.width === nextColumn.width &&
        column.fixed === nextColumn.fixed &&
        column.cellRegionKey === nextColumn.cellRegionKey &&
        column.buttonsRegionKey === nextColumn.buttonsRegionKey &&
        column.labelRegionKey === nextColumn.labelRegionKey &&
        column.popOver === nextColumn.popOver &&
        // G6: these fields drive cell chrome (quick-edit control, copy button).
        // Omitting them left the comparator blind to schema changes that only
        // toggled edit/copy, so MemoizedDataRow skipped re-rendering and the
        // chrome went stale.
        column.quickEdit === nextColumn.quickEdit &&
        column.quickEditBodyRegionKey === nextColumn.quickEditBodyRegionKey &&
        column.copyable === nextColumn.copyable)
    );
  });
}
