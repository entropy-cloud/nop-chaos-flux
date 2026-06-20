import type { TableColumnSchema } from '../schemas.js';

export function hasNestedColumns(columns: readonly TableColumnSchema[]): boolean {
  return columns.some((column) => Array.isArray(column.children) && column.children.length > 0);
}

export function extractLeafColumns(columns: readonly TableColumnSchema[]): TableColumnSchema[] {
  const leaves: TableColumnSchema[] = [];
  const walk = (list: readonly TableColumnSchema[]) => {
    for (const column of list) {
      if (Array.isArray(column.children) && column.children.length > 0) {
        walk(column.children);
      } else {
        leaves.push(column);
      }
    }
  };
  walk(columns);
  return leaves;
}

export interface HeaderTreeCell {
  column: TableColumnSchema;
  colSpan: number;
  rowSpan: number;
  depth: number;
  leafIndex: number;
}

export interface HeaderTreeRow {
  cells: HeaderTreeCell[];
}

function computeMaxDepth(columns: readonly TableColumnSchema[], currentDepth = 1): number {
  let max = currentDepth;
  for (const column of columns) {
    if (Array.isArray(column.children) && column.children.length > 0) {
      const childDepth = computeMaxDepth(column.children, currentDepth + 1);
      if (childDepth > max) max = childDepth;
    }
  }
  return max;
}

function countLeaves(column: TableColumnSchema): number {
  if (Array.isArray(column.children) && column.children.length > 0) {
    return column.children.reduce((sum, child) => sum + countLeaves(child), 0);
  }
  return 1;
}

export function computeHeaderRows(columns: readonly TableColumnSchema[]): HeaderTreeRow[] {
  if (!hasNestedColumns(columns)) {
    return [];
  }
  const maxDepth = computeMaxDepth(columns);
  const rows: HeaderTreeRow[] = Array.from({ length: maxDepth }, () => ({ cells: [] }));

  let leafIndex = 0;
  const walk = (list: readonly TableColumnSchema[], depth: number) => {
    for (const column of list) {
      const hasChildren = Array.isArray(column.children) && column.children.length > 0;
      const colSpan = countLeaves(column);
      const rowSpan = hasChildren ? 1 : maxDepth - depth + 1;
      const cell: HeaderTreeCell = {
        column,
        colSpan,
        rowSpan,
        depth,
        leafIndex: hasChildren ? -1 : leafIndex,
      };
      rows[depth - 1]!.cells.push(cell);
      if (hasChildren) {
        walk(column.children!, depth + 1);
      } else {
        leafIndex += 1;
      }
    }
  };
  walk(columns, 1);
  return rows;
}
