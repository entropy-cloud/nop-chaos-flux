import type {
  SpreadsheetDocument,
  SpreadsheetCellRef,
  SpreadsheetRange,
  CellDocument,
  CellStyle,
} from '../types.js';
import { cellAddress, normalizeRange } from '../types.js';
import { ensureSheetCells, setCell, updateCellStyle } from './document-access.js';

export function applySetCellValue(
  doc: SpreadsheetDocument,
  cell: SpreadsheetCellRef,
  value: unknown,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  const newCell: CellDocument = {
    ...(existing ?? { address: key, row: cell.row, col: cell.col }),
    value,
    address: key,
    row: cell.row,
    col: cell.col,
  };
  const cells = { ...sheet.cells, [key]: newCell };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === cell.sheetId ? { ...sheetDoc, cells } : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applySetCellFormula(
  doc: SpreadsheetDocument,
  cell: SpreadsheetCellRef,
  formula: string | undefined,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  let newCell: CellDocument;
  if (formula === undefined) {
    const rest = { ...existing };
    delete rest.formula;
    newCell = rest as CellDocument;
  } else {
    newCell = {
      ...(existing ?? { address: key, row: cell.row, col: cell.col }),
      formula,
      address: key,
      row: cell.row,
      col: cell.col,
    };
  }
  const cells = { ...sheet.cells, [key]: newCell };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === cell.sheetId ? { ...sheetDoc, cells } : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applySetCellStyle(
  doc: SpreadsheetDocument,
  target: SpreadsheetCellRef | SpreadsheetRange,
  styleId: string,
): SpreadsheetDocument {
  if ('startRow' in target) {
    const range = normalizeRange(target as SpreadsheetRange);
    const { doc: updated, sheet } = ensureSheetCells(doc, range.sheetId);
    let newSheet = sheet;
    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startCol; col <= range.endCol; col++) {
        const key = cellAddress(row, col);
        const existing = newSheet.cells?.[key];
        newSheet = setCell(newSheet, row, col, {
          ...(existing ?? { address: key, row, col }),
          styleId,
          address: key,
          row,
          col,
        });
      }
    }
    const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
      sheetDoc.id === range.sheetId ? newSheet : sheetDoc,
    ) };
    return { ...updated, workbook };
  }

  const cell = target as SpreadsheetCellRef;
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  const newCell: CellDocument = {
    ...(existing ?? { address: key, row: cell.row, col: cell.col }),
    styleId,
    address: key,
    row: cell.row,
    col: cell.col,
  };
  const cells = { ...sheet.cells, [key]: newCell };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === cell.sheetId ? { ...sheetDoc, cells } : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyCellStyleChange(
  doc: SpreadsheetDocument,
  target: SpreadsheetCellRef | SpreadsheetRange,
  stylePatch: Partial<CellStyle>,
): SpreadsheetDocument {
  if ('startRow' in target) {
    const range = normalizeRange(target as SpreadsheetRange);
    const { doc: updated, sheet } = ensureSheetCells(doc, range.sheetId);
    let newSheet = sheet;
    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startCol; col <= range.endCol; col++) {
        newSheet = updateCellStyle(newSheet, row, col, stylePatch);
      }
    }
    const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
      sheetDoc.id === range.sheetId ? newSheet : sheetDoc,
    ) };
    return { ...updated, workbook };
  }

  const cell = target as SpreadsheetCellRef;
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const newSheet = updateCellStyle(sheet, cell.row, cell.col, stylePatch);
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === cell.sheetId ? newSheet : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyMergeRange(doc: SpreadsheetDocument, range: SpreadsheetRange): SpreadsheetDocument {
  const normalized = normalizeRange(range);
  const { doc: updated, sheet } = ensureSheetCells(doc, normalized.sheetId);
  const merges = [...(sheet.merges ?? [])];
  const exists = merges.some(
    (merge) =>
      merge.startRow === normalized.startRow &&
      merge.startCol === normalized.startCol &&
      merge.endRow === normalized.endRow &&
      merge.endCol === normalized.endCol,
  );
  if (!exists) {
    merges.push(normalized);
  }
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === normalized.sheetId ? { ...sheetDoc, merges } : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyUnmergeRange(doc: SpreadsheetDocument, range: SpreadsheetRange): SpreadsheetDocument {
  const normalized = normalizeRange(range);
  const { doc: updated, sheet } = ensureSheetCells(doc, normalized.sheetId);
  const merges = (sheet.merges ?? []).filter(
    (merge) => !(
      merge.startRow === normalized.startRow &&
      merge.startCol === normalized.startCol &&
      merge.endRow === normalized.endRow &&
      merge.endCol === normalized.endCol
    ),
  );
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === normalized.sheetId ? { ...sheetDoc, merges } : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyMergeCellsCenter(doc: SpreadsheetDocument, range: SpreadsheetRange): SpreadsheetDocument {
  let result = applyMergeRange(doc, range);
  result = applyCellStyleChange(result, range, { textAlign: 'center', verticalAlign: 'middle' });
  return result;
}

function incrementSeriesValue(value: unknown, step: number): unknown {
  if (typeof value === 'number') {
    return value + step;
  }
  const stringValue = String(value ?? '');
  if (stringValue === '') {
    return value;
  }
  const numericValue = Number(stringValue);
  if (!Number.isNaN(numericValue) && stringValue.trim() !== '') {
    return numericValue + step;
  }
  const match = stringValue.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const digits = match[2];
    const incremented = parseInt(digits, 10) + step;
    return prefix + incremented.toString().padStart(digits.length, '0');
  }
  return value;
}

export function applyFillSeries(
  doc: SpreadsheetDocument,
  range: SpreadsheetRange,
  direction: 'down' | 'right',
): SpreadsheetDocument {
  const normalized = normalizeRange(range);
  const { doc: updated, sheet } = ensureSheetCells(doc, normalized.sheetId);
  let newSheet = sheet;

  if (direction === 'down') {
    for (let col = normalized.startCol; col <= normalized.endCol; col++) {
      const sourceCell = newSheet.cells?.[cellAddress(normalized.startRow, col)];
      if (!sourceCell) {
        continue;
      }
      for (let row = normalized.startRow + 1; row <= normalized.endRow; row++) {
        const step = row - normalized.startRow;
        const newValue = incrementSeriesValue(sourceCell.value, step);
        const key = cellAddress(row, col);
        const existing = newSheet.cells?.[key];
        newSheet = setCell(newSheet, row, col, {
          ...(existing ?? { address: key, row, col }),
          value: newValue,
          style: sourceCell.style,
          address: key,
          row,
          col,
        });
      }
    }
  } else {
    for (let row = normalized.startRow; row <= normalized.endRow; row++) {
      const sourceCell = newSheet.cells?.[cellAddress(row, normalized.startCol)];
      if (!sourceCell) {
        continue;
      }
      for (let col = normalized.startCol + 1; col <= normalized.endCol; col++) {
        const step = col - normalized.startCol;
        const newValue = incrementSeriesValue(sourceCell.value, step);
        const key = cellAddress(row, col);
        const existing = newSheet.cells?.[key];
        newSheet = setCell(newSheet, row, col, {
          ...(existing ?? { address: key, row, col }),
          value: newValue,
          style: sourceCell.style,
          address: key,
          row,
          col,
        });
      }
    }
  }

  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === normalized.sheetId ? newSheet : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyFillDown(doc: SpreadsheetDocument, range: SpreadsheetRange): SpreadsheetDocument {
  const normalized = normalizeRange(range);
  const { doc: updated, sheet } = ensureSheetCells(doc, normalized.sheetId);
  let newSheet = sheet;
  for (let col = normalized.startCol; col <= normalized.endCol; col++) {
    const sourceCell = newSheet.cells?.[cellAddress(normalized.startRow, col)];
    if (!sourceCell) {
      continue;
    }
    for (let row = normalized.startRow + 1; row <= normalized.endRow; row++) {
      newSheet = setCell(newSheet, row, col, {
        ...sourceCell,
        address: cellAddress(row, col),
        row,
        col,
      });
    }
  }
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === normalized.sheetId ? newSheet : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyFillRight(doc: SpreadsheetDocument, range: SpreadsheetRange): SpreadsheetDocument {
  const normalized = normalizeRange(range);
  const { doc: updated, sheet } = ensureSheetCells(doc, normalized.sheetId);
  let newSheet = sheet;
  for (let row = normalized.startRow; row <= normalized.endRow; row++) {
    const sourceCell = newSheet.cells?.[cellAddress(row, normalized.startCol)];
    if (!sourceCell) {
      continue;
    }
    for (let col = normalized.startCol + 1; col <= normalized.endCol; col++) {
      newSheet = setCell(newSheet, row, col, {
        ...sourceCell,
        address: cellAddress(row, col),
        row,
        col,
      });
    }
  }
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === normalized.sheetId ? newSheet : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyAddComment(doc: SpreadsheetDocument, cell: SpreadsheetCellRef, text: string, author?: string): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  const newCell: CellDocument = {
    ...(existing ?? { address: key, row: cell.row, col: cell.col }),
    comment: { text, author, createdAt: new Date().toISOString() },
    address: key,
    row: cell.row,
    col: cell.col,
  };
  const cells = { ...sheet.cells, [key]: newCell };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === cell.sheetId ? { ...sheetDoc, cells } : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyEditComment(doc: SpreadsheetDocument, cell: SpreadsheetCellRef, text: string): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  if (!existing?.comment) {
    return doc;
  }
  const existingComment = typeof existing.comment === 'string'
    ? { text: existing.comment }
    : existing.comment;
  const newCell: CellDocument = {
    ...existing,
    comment: { ...existingComment, text },
  };
  const cells = { ...sheet.cells, [key]: newCell };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === cell.sheetId ? { ...sheetDoc, cells } : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyDeleteComment(doc: SpreadsheetDocument, cell: SpreadsheetCellRef): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  if (!existing) {
    return doc;
  }
  const newCell: CellDocument = { ...existing };
  delete newCell.comment;
  const cells = { ...sheet.cells, [key]: newCell };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === cell.sheetId ? { ...sheetDoc, cells } : sheetDoc,
  ) };
  return { ...updated, workbook };
}
