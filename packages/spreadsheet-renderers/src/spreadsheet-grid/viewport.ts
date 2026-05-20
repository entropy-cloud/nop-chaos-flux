import {
  OVERSCAN,
  computeColOffsets,
  computeRowOffsets,
  findFirstVisible,
} from './constants.js';
import { cellAddress } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetGridViewportModel } from './types.js';

export interface SpreadsheetGridViewportState {
  rowOffsets: number[];
  colOffsets: number[];
  totalHeight: number;
  totalWidth: number;
  frozenRows: number;
  frozenCols: number;
  visibleRowIndices: number[];
  visibleColIndices: number[];
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  leftSpacerWidth: number;
  rightSpacerWidth: number;
  mountedSelectedCellId?: string;
}

export interface SpreadsheetGridOffsetsCache {
  rowOffsets: number[];
  colOffsets: number[];
}

export interface SpreadsheetGridOffsetsInput {
  rows: number;
  cols: number;
  rowHeights: SpreadsheetGridViewportModel['rowHeights'];
  columnWidths: SpreadsheetGridViewportModel['columnWidths'];
}

export function buildSpreadsheetGridOffsets(
  input: SpreadsheetGridOffsetsInput,
): SpreadsheetGridOffsetsCache {
  return {
    rowOffsets: computeRowOffsets(input.rows, input.rowHeights),
    colOffsets: computeColOffsets(input.cols, input.columnWidths),
  };
}

export function buildSpreadsheetGridViewport(
  model: SpreadsheetGridViewportModel,
  offsets: SpreadsheetGridOffsetsCache = buildSpreadsheetGridOffsets(model),
): SpreadsheetGridViewportState {
  const { rowOffsets, colOffsets } = offsets;
  const totalHeight = rowOffsets[model.rows] ?? 0;
  const totalWidth = colOffsets[model.cols] ?? 0;

  const frozenRows = model.frozen?.row ?? 0;
  const frozenCols = model.frozen?.col ?? 0;
  const frozenRowHeight = frozenRows > 0 ? rowOffsets[frozenRows] : 0;
  const frozenColWidth = frozenCols > 0 ? colOffsets[frozenCols] : 0;

  const visStartRow = Math.max(
    frozenRows,
    findFirstVisible(rowOffsets, model.scrollTop + frozenRowHeight) - OVERSCAN,
  );
  const visEndRow = Math.min(
    model.rows - 1,
    findFirstVisible(rowOffsets, model.scrollTop + frozenRowHeight + model.viewportHeight) + OVERSCAN,
  );
  const visStartCol = Math.max(
    frozenCols,
    findFirstVisible(colOffsets, model.scrollLeft + frozenColWidth) - OVERSCAN,
  );
  const visEndCol = Math.min(
    model.cols - 1,
    findFirstVisible(colOffsets, model.scrollLeft + frozenColWidth + model.viewportWidth) + OVERSCAN,
  );

  const topSpacerHeight =
    frozenRows < visStartRow ? rowOffsets[visStartRow] - rowOffsets[frozenRows] : 0;
  const bottomSpacerHeight =
    visEndRow < model.rows - 1 ? rowOffsets[model.rows] - rowOffsets[visEndRow + 1] : 0;
  const leftSpacerWidth =
    frozenCols < visStartCol ? colOffsets[visStartCol] - colOffsets[frozenCols] : 0;
  const rightSpacerWidth =
    visEndCol < model.cols - 1 ? colOffsets[model.cols] - colOffsets[visEndCol + 1] : 0;

  const visibleColIndices: number[] = [];
  for (let c = 0; c < frozenCols; c++) visibleColIndices.push(c);
  for (let c = visStartCol; c <= visEndCol; c++) visibleColIndices.push(c);

  const visibleRowIndices: number[] = [];
  for (let r = 0; r < frozenRows; r++) {
    if (!model.snapshot.activeSheet?.rows?.[String(r)]?.filteredOut) visibleRowIndices.push(r);
  }
  for (let r = visStartRow; r <= visEndRow; r++) {
    if (!model.snapshot.activeSheet?.rows?.[String(r)]?.filteredOut) visibleRowIndices.push(r);
  }

  const mountedSelectedCellId =
    model.selectedCell &&
    visibleRowIndices.includes(model.selectedCell.row) &&
    visibleColIndices.includes(model.selectedCell.col)
      ? `spreadsheet-cell-${cellAddress(model.selectedCell.row, model.selectedCell.col)}`
      : undefined;

  return {
    rowOffsets,
    colOffsets,
    totalHeight,
    totalWidth,
    frozenRows,
    frozenCols,
    visibleRowIndices,
    visibleColIndices,
    topSpacerHeight,
    bottomSpacerHeight,
    leftSpacerWidth,
    rightSpacerWidth,
    mountedSelectedCellId,
  };
}
