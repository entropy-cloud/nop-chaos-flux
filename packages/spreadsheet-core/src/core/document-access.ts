import type {
  SpreadsheetDocument,
  WorksheetDocument,
  CellDocument,
  CellStyle,
} from '../types.js';
import { cellAddress } from '../types.js';

export function ensureSheetCells(
  doc: SpreadsheetDocument,
  sheetId: string,
): { doc: SpreadsheetDocument; sheet: WorksheetDocument; sheetIdx: number } {
  const workbook = { ...doc.workbook, sheets: [...doc.workbook.sheets] };
  const idx = workbook.sheets.findIndex((sheet) => sheet.id === sheetId);
  if (idx === -1) {
    throw new Error(`Sheet not found: ${sheetId}`);
  }

  let sheet = workbook.sheets[idx];
  if (!sheet.cells) {
    sheet = { ...sheet, cells: {} };
    workbook.sheets[idx] = sheet;
  }
  if (!sheet.rows) {
    sheet = { ...sheet, rows: {} };
    workbook.sheets[idx] = sheet;
  }
  if (!sheet.columns) {
    sheet = { ...sheet, columns: {} };
    workbook.sheets[idx] = sheet;
  }

  return { doc: { ...doc, workbook }, sheet, sheetIdx: idx };
}

export function getCell(sheet: WorksheetDocument, row: number, col: number): CellDocument | undefined {
  return sheet.cells?.[cellAddress(row, col)];
}

export function setCell(sheet: WorksheetDocument, row: number, col: number, cell: CellDocument): WorksheetDocument {
  const cells = { ...sheet.cells, [cellAddress(row, col)]: cell };
  return { ...sheet, cells };
}

export function updateCellStyle(
  sheet: WorksheetDocument,
  row: number,
  col: number,
  stylePatch: Partial<CellStyle>,
): WorksheetDocument {
  const existing = getCell(sheet, row, col) ?? { address: cellAddress(row, col), row, col };
  const mergedStyle = { ...(existing.style ?? {}), ...stylePatch };
  return setCell(sheet, row, col, { ...existing, style: mergedStyle });
}
