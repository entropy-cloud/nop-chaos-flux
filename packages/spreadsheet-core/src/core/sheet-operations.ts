import type {
  SpreadsheetDocument,
  SpreadsheetRange,
  WorksheetDocument,
  SheetProtectionOptions,
} from '../types.js';
import { ensureSheetCells } from './document-access.js';
import { applyCellStyleChange, applyMergeRange } from './cell-operations.js';

export function applyResizeRow(
  doc: SpreadsheetDocument,
  sheetId: string,
  row: number,
  height: number,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const rows = { ...sheet.rows };
  const key = String(row);
  rows[key] = { ...(rows[key] ?? { index: row }), index: row, height };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === sheetId ? { ...sheetDoc, rows } : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyResizeColumn(
  doc: SpreadsheetDocument,
  sheetId: string,
  col: number,
  width: number,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const columns = { ...sheet.columns };
  const key = String(col);
  columns[key] = { ...(columns[key] ?? { index: col }), index: col, width };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === sheetId ? { ...sheetDoc, columns } : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyHideRow(
  doc: SpreadsheetDocument,
  sheetId: string,
  row: number,
  hidden: boolean,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const rows = { ...sheet.rows };
  const key = String(row);
  rows[key] = { ...(rows[key] ?? { index: row }), index: row, hidden };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === sheetId ? { ...sheetDoc, rows } : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyHideColumn(
  doc: SpreadsheetDocument,
  sheetId: string,
  col: number,
  hidden: boolean,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const columns = { ...sheet.columns };
  const key = String(col);
  columns[key] = { ...(columns[key] ?? { index: col }), index: col, hidden };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === sheetId ? { ...sheetDoc, columns } : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function applyAddSheet(
  doc: SpreadsheetDocument,
  name?: string,
  index?: number,
): SpreadsheetDocument {
  const id = crypto.randomUUID();
  const sheetName = name ?? `Sheet${doc.workbook.sheets.length + 1}`;
  const newSheet: WorksheetDocument = {
    id,
    name: sheetName,
    order: index ?? doc.workbook.sheets.length,
  };
  const sheets = [...doc.workbook.sheets];
  if (index !== undefined && index >= 0 && index <= sheets.length) {
    sheets.splice(index, 0, newSheet);
  } else {
    sheets.push(newSheet);
  }
  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex++) {
    sheets[sheetIndex] = { ...sheets[sheetIndex], order: sheetIndex };
  }
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

export function applyRemoveSheet(doc: SpreadsheetDocument, sheetId: string): SpreadsheetDocument {
  if (doc.workbook.sheets.length <= 1) {
    throw new Error('Cannot remove the last sheet');
  }
  const sheets = doc.workbook.sheets.filter((sheet) => sheet.id !== sheetId);
  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex++) {
    sheets[sheetIndex] = { ...sheets[sheetIndex], order: sheetIndex };
  }
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

export function applyRenameSheet(doc: SpreadsheetDocument, sheetId: string, name: string): SpreadsheetDocument {
  const sheets = doc.workbook.sheets.map((sheet) =>
    sheet.id === sheetId ? { ...sheet, name } : sheet,
  );
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

export function applyMoveSheet(doc: SpreadsheetDocument, sheetId: string, targetIndex: number): SpreadsheetDocument {
  const sheets = [...doc.workbook.sheets];
  const fromIndex = sheets.findIndex((sheet) => sheet.id === sheetId);
  if (fromIndex === -1) {
    throw new Error(`Sheet not found: ${sheetId}`);
  }
  const [moved] = sheets.splice(fromIndex, 1);
  const insertIndex = Math.max(0, Math.min(targetIndex, sheets.length));
  sheets.splice(insertIndex, 0, moved);
  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex++) {
    sheets[sheetIndex] = { ...sheets[sheetIndex], order: sheetIndex };
  }
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

export function applyCopySheet(doc: SpreadsheetDocument, sheetId: string, name?: string): SpreadsheetDocument {
  const sourceSheet = doc.workbook.sheets.find((sheet) => sheet.id === sheetId);
  if (!sourceSheet) {
    throw new Error(`Sheet not found: ${sheetId}`);
  }
  const newSheet: WorksheetDocument = {
    ...JSON.parse(JSON.stringify(sourceSheet)),
    id: crypto.randomUUID(),
    name: name ?? `${sourceSheet.name} Copy`,
    order: doc.workbook.sheets.length,
  };
  const sheets = [...doc.workbook.sheets, newSheet];
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

export function applySetSheetTabColor(doc: SpreadsheetDocument, sheetId: string, color: string): SpreadsheetDocument {
  const sheets = doc.workbook.sheets.map((sheet) =>
    sheet.id === sheetId ? { ...sheet, tabColor: color } : sheet,
  );
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

export function applyHideSheet(doc: SpreadsheetDocument, sheetId: string, hidden: boolean): SpreadsheetDocument {
  const sheets = doc.workbook.sheets.map((sheet) =>
    sheet.id === sheetId ? { ...sheet, hidden } : sheet,
  );
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

export function applyProtectSheet(
  doc: SpreadsheetDocument,
  sheetId: string,
  password?: string,
  options?: SheetProtectionOptions,
): SpreadsheetDocument {
  void password;
  const sheets = doc.workbook.sheets.map((sheet) =>
    sheet.id === sheetId ? { ...sheet, protected: true, protectionOptions: options } : sheet,
  );
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

export function applyFreezePanes(doc: SpreadsheetDocument, sheetId: string, row?: number, col?: number): SpreadsheetDocument {
  const sheets = doc.workbook.sheets.map((sheet) =>
    sheet.id === sheetId ? { ...sheet, frozen: { row: row ?? 0, col: col ?? 0 } } : sheet,
  );
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

export function applyUnfreezePanes(doc: SpreadsheetDocument, sheetId: string): SpreadsheetDocument {
  const sheets = doc.workbook.sheets.map((sheet) =>
    sheet.id === sheetId ? { ...sheet, frozen: undefined } : sheet,
  );
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

export function applyMergeCellsCenter(doc: SpreadsheetDocument, range: SpreadsheetRange): SpreadsheetDocument {
  let result = applyMergeRange(doc, range);
  result = applyCellStyleChange(result, range, { textAlign: 'center', verticalAlign: 'middle' });
  return result;
}
