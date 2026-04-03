import type {
  SpreadsheetDocument,
  SpreadsheetRange,
  SpreadsheetCellRef,
  ClipboardData,
  ClipboardCell,
  CellDocument,
} from '../types.js';
import { cellAddress, normalizeRange } from '../types.js';
import { ensureSheetCells, setCell } from './document-access.js';

export function copyRangeToClipboard(
  doc: SpreadsheetDocument,
  sheetId: string,
  range: SpreadsheetRange,
  type: 'copy' | 'cut',
): ClipboardData {
  const sheet = doc.workbook.sheets.find((sheetDoc) => sheetDoc.id === sheetId);
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetId}`);
  }
  const normalized = normalizeRange(range);
  const rowCount = normalized.endRow - normalized.startRow + 1;
  const colCount = normalized.endCol - normalized.startCol + 1;
  const cells: ClipboardCell[][] = [];
  for (let rowOffset = 0; rowOffset < rowCount; rowOffset++) {
    const row: ClipboardCell[] = [];
    for (let colOffset = 0; colOffset < colCount; colOffset++) {
      const sourceCell = sheet.cells?.[cellAddress(normalized.startRow + rowOffset, normalized.startCol + colOffset)];
      row.push({
        value: sourceCell?.value,
        formula: sourceCell?.formula,
        style: sourceCell?.style,
        comment: sourceCell?.comment,
        linkUrl: sourceCell?.linkUrl,
        numberFormat: sourceCell?.numberFormat,
      });
    }
    cells.push(row);
  }
  return { type, sourceSheetId: sheetId, range: normalized, cells, timestamp: Date.now() };
}

export function applyPasteCells(
  doc: SpreadsheetDocument,
  clipboard: ClipboardData,
  target: SpreadsheetCellRef,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, target.sheetId);
  let newSheet = sheet;
  for (let rowOffset = 0; rowOffset < clipboard.cells.length; rowOffset++) {
    for (let colOffset = 0; colOffset < clipboard.cells[rowOffset].length; colOffset++) {
      const targetRow = target.row + rowOffset;
      const targetCol = target.col + colOffset;
      const sourceCell = clipboard.cells[rowOffset][colOffset];
      const key = cellAddress(targetRow, targetCol);
      const existing = newSheet.cells?.[key];
      newSheet = setCell(newSheet, targetRow, targetCol, {
        ...(existing ?? { address: key, row: targetRow, col: targetCol }),
        value: sourceCell.value,
        formula: sourceCell.formula,
        style: sourceCell.style,
        comment: sourceCell.comment,
        linkUrl: sourceCell.linkUrl,
        numberFormat: sourceCell.numberFormat,
        address: key,
        row: targetRow,
        col: targetCol,
      });
    }
  }

  if (clipboard.type === 'cut') {
    const sourceSheetId = clipboard.sourceSheetId;
    const isSameSheet = sourceSheetId === target.sheetId;
    if (isSameSheet) {
      for (let row = clipboard.range.startRow; row <= clipboard.range.endRow; row++) {
        for (let col = clipboard.range.startCol; col <= clipboard.range.endCol; col++) {
          const key = cellAddress(row, col);
          const pasteEndRow = target.row + clipboard.cells.length - 1;
          const pasteEndCol = target.col + (clipboard.cells[0]?.length ?? 1) - 1;
          if (row < target.row || row > pasteEndRow || col < target.col || col > pasteEndCol) {
            if (newSheet.cells?.[key]) {
              const cells = { ...newSheet.cells };
              delete cells[key];
              newSheet = { ...newSheet, cells };
            }
          }
        }
      }
    } else {
      const sourceSheet = updated.workbook.sheets.find((sheetDoc) => sheetDoc.id === sourceSheetId);
      if (sourceSheet) {
        let clearedSheet = sourceSheet;
        for (let row = clipboard.range.startRow; row <= clipboard.range.endRow; row++) {
          for (let col = clipboard.range.startCol; col <= clipboard.range.endCol; col++) {
            const key = cellAddress(row, col);
            if (clearedSheet.cells?.[key]) {
              const cells = { ...clearedSheet.cells };
              delete cells[key];
              clearedSheet = { ...clearedSheet, cells };
            }
          }
        }
        const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
          sheetDoc.id === sourceSheetId ? clearedSheet : sheetDoc.id === target.sheetId ? newSheet : sheetDoc,
        ) };
        return { ...updated, workbook };
      }
    }
  }

  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === target.sheetId ? newSheet : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyClearCells(
  doc: SpreadsheetDocument,
  target: SpreadsheetCellRef | SpreadsheetRange,
  clearValues: boolean,
  clearFormats: boolean,
  clearComments: boolean,
): SpreadsheetDocument {
  if ('startRow' in target) {
    const range = normalizeRange(target as SpreadsheetRange);
    const { doc: updated, sheet } = ensureSheetCells(doc, range.sheetId);
    let newSheet = sheet;
    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startCol; col <= range.endCol; col++) {
        const key = cellAddress(row, col);
        const existing = newSheet.cells?.[key];
        if (!existing) {
          continue;
        }
        const cleared: CellDocument = { address: key, row, col };
        if (!clearValues) {
          cleared.value = existing.value;
          cleared.formula = existing.formula;
        }
        if (!clearFormats) {
          cleared.style = existing.style;
          cleared.styleId = existing.styleId;
        }
        if (!clearComments) {
          cleared.comment = existing.comment;
        }
        newSheet = setCell(newSheet, row, col, cleared);
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
  if (!existing) {
    return doc;
  }
  const cleared: CellDocument = { address: key, row: cell.row, col: cell.col };
  if (!clearValues) {
    cleared.value = existing.value;
    cleared.formula = existing.formula;
  }
  if (!clearFormats) {
    cleared.style = existing.style;
    cleared.styleId = existing.styleId;
  }
  if (!clearComments) {
    cleared.comment = existing.comment;
  }
  const newSheet = setCell(sheet, cell.row, cell.col, cleared);
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === cell.sheetId ? newSheet : sheetDoc,
  ) };
  return { ...updated, workbook };
}
