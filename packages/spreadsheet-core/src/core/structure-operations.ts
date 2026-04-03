import type { SpreadsheetDocument, CellDocument } from '../types.js';
import { cellAddress } from '../types.js';
import { ensureSheetCells } from './document-access.js';

export function applyInsertRow(doc: SpreadsheetDocument, sheetId: string, row: number, count: number): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const cells = { ...sheet.cells };
  const rows = { ...sheet.rows };
  const merges = [...(sheet.merges ?? [])];

  const newCells: Record<string, CellDocument> = {};
  for (const [key, cell] of Object.entries(cells)) {
    if (cell.row >= row) {
      const newKey = cellAddress(cell.row + count, cell.col);
      newCells[newKey] = { ...cell, row: cell.row + count, address: newKey };
    } else {
      newCells[key] = cell;
    }
  }

  const newRows: Record<string, typeof rows[string]> = {};
  for (const [key, rowDoc] of Object.entries(rows)) {
    if (rowDoc.index >= row) {
      newRows[String(rowDoc.index + count)] = { ...rowDoc, index: rowDoc.index + count };
    } else {
      newRows[key] = rowDoc;
    }
  }

  const newMerges = merges.map((merge) => ({
    ...merge,
    startRow: merge.startRow >= row ? merge.startRow + count : merge.startRow,
    endRow: merge.endRow >= row ? merge.endRow + count : merge.endRow,
  }));

  const newSheet = { ...sheet, cells: newCells, rows: newRows, merges: newMerges };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === sheetId ? newSheet : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyInsertColumn(doc: SpreadsheetDocument, sheetId: string, col: number, count: number): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const cells = { ...sheet.cells };
  const columns = { ...sheet.columns };
  const merges = [...(sheet.merges ?? [])];

  const newCells: Record<string, CellDocument> = {};
  for (const [key, cell] of Object.entries(cells)) {
    if (cell.col >= col) {
      const newKey = cellAddress(cell.row, cell.col + count);
      newCells[newKey] = { ...cell, col: cell.col + count, address: newKey };
    } else {
      newCells[key] = cell;
    }
  }

  const newColumns: Record<string, typeof columns[string]> = {};
  for (const [key, columnDoc] of Object.entries(columns)) {
    if (columnDoc.index >= col) {
      newColumns[String(columnDoc.index + count)] = { ...columnDoc, index: columnDoc.index + count };
    } else {
      newColumns[key] = columnDoc;
    }
  }

  const newMerges = merges.map((merge) => ({
    ...merge,
    startCol: merge.startCol >= col ? merge.startCol + count : merge.startCol,
    endCol: merge.endCol >= col ? merge.endCol + count : merge.endCol,
  }));

  const newSheet = { ...sheet, cells: newCells, columns: newColumns, merges: newMerges };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === sheetId ? newSheet : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyDeleteRow(doc: SpreadsheetDocument, sheetId: string, row: number, count: number): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const cells = { ...sheet.cells };
  const rows = { ...sheet.rows };
  const merges = [...(sheet.merges ?? [])];

  const newCells: Record<string, CellDocument> = {};
  for (const [key, cell] of Object.entries(cells)) {
    if (cell.row < row) {
      newCells[key] = cell;
    } else if (cell.row >= row + count) {
      const newKey = cellAddress(cell.row - count, cell.col);
      newCells[newKey] = { ...cell, row: cell.row - count, address: newKey };
    }
  }

  const newRows: Record<string, typeof rows[string]> = {};
  for (const [key, rowDoc] of Object.entries(rows)) {
    if (rowDoc.index < row) {
      newRows[key] = rowDoc;
    } else if (rowDoc.index >= row + count) {
      newRows[String(rowDoc.index - count)] = { ...rowDoc, index: rowDoc.index - count };
    }
  }

  const newMerges = merges
    .filter((merge) => merge.startRow < row || merge.startRow >= row + count)
    .map((merge) => ({
      ...merge,
      startRow: merge.startRow >= row + count ? merge.startRow - count : merge.startRow,
      endRow: merge.endRow >= row + count ? merge.endRow - count : merge.endRow,
    }));

  const newSheet = { ...sheet, cells: newCells, rows: newRows, merges: newMerges };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === sheetId ? newSheet : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyDeleteColumn(doc: SpreadsheetDocument, sheetId: string, col: number, count: number): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const cells = { ...sheet.cells };
  const columns = { ...sheet.columns };
  const merges = [...(sheet.merges ?? [])];

  const newCells: Record<string, CellDocument> = {};
  for (const [key, cell] of Object.entries(cells)) {
    if (cell.col < col) {
      newCells[key] = cell;
    } else if (cell.col >= col + count) {
      const newKey = cellAddress(cell.row, cell.col - count);
      newCells[newKey] = { ...cell, col: cell.col - count, address: newKey };
    }
  }

  const newColumns: Record<string, typeof columns[string]> = {};
  for (const [key, columnDoc] of Object.entries(columns)) {
    if (columnDoc.index < col) {
      newColumns[key] = columnDoc;
    } else if (columnDoc.index >= col + count) {
      newColumns[String(columnDoc.index - count)] = { ...columnDoc, index: columnDoc.index - count };
    }
  }

  const newMerges = merges
    .filter((merge) => merge.startCol < col || merge.startCol >= col + count)
    .map((merge) => ({
      ...merge,
      startCol: merge.startCol >= col + count ? merge.startCol - count : merge.startCol,
      endCol: merge.endCol >= col + count ? merge.endCol - count : merge.endCol,
    }));

  const newSheet = { ...sheet, cells: newCells, columns: newColumns, merges: newMerges };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === sheetId ? newSheet : sheetDoc,
  ) };
  return { ...updated, workbook };
}
