import type { SpreadsheetRange, MergeRange } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetHostSnapshot } from '../bridge.js';

export const DEFAULT_ROW_HEIGHT = 24;
export const DEFAULT_COL_WIDTH = 80;
export const ROW_HEADER_WIDTH = 40;
export const OVERSCAN = 5;

export function computeRowOffsets(rows: number, rowHeights: Record<number, number>): number[] {
  const offsets = new Array<number>(rows + 1);
  offsets[0] = 0;
  for (let r = 0; r < rows; r++) {
    offsets[r + 1] = offsets[r] + (rowHeights[r] ?? DEFAULT_ROW_HEIGHT);
  }
  return offsets;
}

export function computeColOffsets(cols: number, colWidths: Record<number, number>): number[] {
  const offsets = new Array<number>(cols + 1);
  offsets[0] = 0;
  for (let c = 0; c < cols; c++) {
    offsets[c + 1] = offsets[c] + (colWidths[c] ?? DEFAULT_COL_WIDTH);
  }
  return offsets;
}

export function findFirstVisible(offsets: number[], scrollPos: number): number {
  let lo = 0;
  let hi = offsets.length - 2;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (offsets[mid + 1] <= scrollPos) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

export function isCellWithinSelection(
  selection: SpreadsheetHostSnapshot['selection'],
  row: number,
  col: number,
  sheetId: string,
) {
  if (selection.sheetId && selection.sheetId !== sheetId) {
    return false;
  }

  if (selection.kind === 'cell') {
    return selection.anchor?.row === row && selection.anchor?.col === col;
  }

  if (selection.kind === 'range' && selection.range) {
    return row >= selection.range.startRow
      && row <= selection.range.endRow
      && col >= selection.range.startCol
      && col <= selection.range.endCol;
  }

  if (selection.kind === 'row') {
    return selection.rows?.includes(row) ?? false;
  }

  if (selection.kind === 'column') {
    return selection.columns?.includes(col) ?? false;
  }

  if (selection.kind === 'sheet') {
    return true;
  }

  return false;
}

export function getAnchorCellFromSelection(selection: SpreadsheetHostSnapshot['selection']) {
  if (selection.kind === 'cell' && selection.anchor) {
    return { row: selection.anchor.row, col: selection.anchor.col };
  }

  if (selection.kind === 'range' && selection.range) {
    return { row: selection.range.startRow, col: selection.range.startCol };
  }

  if (selection.kind === 'row' && selection.rows?.length) {
    const row = [...selection.rows].sort((a, b) => a - b)[0]!;
    return { row, col: 0 };
  }

  if (selection.kind === 'column' && selection.columns?.length) {
    const col = [...selection.columns].sort((a, b) => a - b)[0]!;
    return { row: 0, col };
  }

  if (selection.kind === 'sheet') {
    return { row: 0, col: 0 };
  }

  return null;
}

export function getSelectedAxisInfo(selection: SpreadsheetHostSnapshot['selection'], axis: 'row' | 'column') {
  const values = axis === 'row' ? selection.rows : selection.columns;
  if (!values?.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const start = sorted[0]!;
  const end = sorted[sorted.length - 1]!;

  return {
    start,
    end,
    count: end - start + 1,
  };
}

export function rangesEqual(left: SpreadsheetRange, right: SpreadsheetRange | MergeRange) {
  return left.startRow === right.startRow
    && left.startCol === right.startCol
    && left.endRow === right.endRow
    && left.endCol === right.endCol;
}

export function expandSortRangeToUsedColumns(
  range: SpreadsheetRange,
  cells: Record<string, { row: number; col: number }> | undefined,
) {
  if (!cells) {
    return range;
  }

  let usedEndCol = range.endCol;
  for (const cell of Object.values(cells)) {
    if (cell.row < range.startRow || cell.row > range.endRow) {
      continue;
    }
    if (cell.col > usedEndCol) {
      usedEndCol = cell.col;
    }
  }

  return usedEndCol === range.endCol ? range : { ...range, endCol: usedEndCol };
}
