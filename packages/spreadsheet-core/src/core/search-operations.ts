import type { SpreadsheetDocument, SpreadsheetCellRef } from '../types.js';
import { cellAddress } from '../types.js';
import type { FindResult } from '../commands.js';
import { ensureSheetCells } from './document-access.js';

export function findInDocument(
  doc: SpreadsheetDocument,
  sheetId: string | undefined,
  query: string,
  options: { matchCase?: boolean; matchWholeCell?: boolean; useRegex?: boolean },
  fromRow?: number,
  fromCol?: number,
): FindResult | null {
  const sheets = sheetId
    ? doc.workbook.sheets.filter((sheet) => sheet.id === sheetId)
    : doc.workbook.sheets;

  for (const sheet of sheets) {
    if (!sheet.cells) {
      continue;
    }
    for (const [address, cell] of Object.entries(sheet.cells)) {
      const value = String(cell.value ?? '');
      let matches = false;
      let matchStart = 0;
      let matchEnd = 0;

      if (options.useRegex) {
        try {
          const regex = new RegExp(query, options.matchCase ? '' : 'i');
          const match = value.match(regex);
          if (match) {
            matches = true;
            matchStart = match.index ?? 0;
            matchEnd = matchStart + match[0].length;
          }
        } catch {
          continue;
        }
      } else if (options.matchWholeCell) {
        const compareValue = options.matchCase ? value : value.toLowerCase();
        const compareQuery = options.matchCase ? query : query.toLowerCase();
        if (compareValue === compareQuery) {
          matches = true;
          matchStart = 0;
          matchEnd = value.length;
        }
      } else {
        const compareValue = options.matchCase ? value : value.toLowerCase();
        const compareQuery = options.matchCase ? query : query.toLowerCase();
        const index = compareValue.indexOf(compareQuery);
        if (index !== -1) {
          matches = true;
          matchStart = index;
          matchEnd = index + query.length;
        }
      }

      if (!matches) {
        continue;
      }
      if (fromRow !== undefined && fromCol !== undefined) {
        if (cell.row < fromRow || (cell.row === fromRow && cell.col <= fromCol)) {
          continue;
        }
      }
      return {
        sheetId: sheet.id,
        address,
        row: cell.row,
        col: cell.col,
        value,
        matchStart,
        matchEnd,
      };
    }
  }

  return null;
}

export function replaceInDocument(
  doc: SpreadsheetDocument,
  cell: SpreadsheetCellRef,
  query: string,
  replacement: string,
  options: { matchCase?: boolean; matchWholeCell?: boolean },
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  if (!existing) {
    return doc;
  }

  let newValue = String(existing.value ?? '');
  if (options.matchWholeCell) {
    const compareValue = options.matchCase ? newValue : newValue.toLowerCase();
    const compareQuery = options.matchCase ? query : query.toLowerCase();
    if (compareValue === compareQuery) {
      newValue = replacement;
    }
  } else {
    const flags = options.matchCase ? 'g' : 'gi';
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    newValue = newValue.replace(new RegExp(escapedQuery, flags), replacement);
  }

  const cells = { ...sheet.cells, [key]: { ...existing, value: newValue } };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((sheetDoc) =>
    sheetDoc.id === cell.sheetId ? { ...sheetDoc, cells } : sheetDoc,
  ) };
  return { ...updated, workbook };
}

export function replaceAllInDocument(
  doc: SpreadsheetDocument,
  query: string,
  replacement: string,
  options: { matchCase?: boolean; matchWholeCell?: boolean; searchScope?: 'sheet' | 'workbook' },
  sheetId?: string,
): { doc: SpreadsheetDocument; count: number } {
  let count = 0;
  let result = doc;
  const sheets = options.searchScope === 'workbook' || !sheetId
    ? doc.workbook.sheets
    : doc.workbook.sheets.filter((sheet) => sheet.id === sheetId);

  for (const sheet of sheets) {
    if (!sheet.cells) {
      continue;
    }
    for (const [address, cell] of Object.entries(sheet.cells)) {
      const value = String(cell.value ?? '');
      const shouldReplace = options.matchWholeCell
        ? (() => {
            const compareValue = options.matchCase ? value : value.toLowerCase();
            const compareQuery = options.matchCase ? query : query.toLowerCase();
            return compareValue === compareQuery;
          })()
        : (() => {
            const compareValue = options.matchCase ? value : value.toLowerCase();
            const compareQuery = options.matchCase ? query : query.toLowerCase();
            return compareValue.includes(compareQuery);
          })();

      if (!shouldReplace) {
        continue;
      }

      result = replaceInDocument(result, { sheetId: sheet.id, address, row: cell.row, col: cell.col }, query, replacement, options);
      count++;
    }
  }

  return { doc: result, count };
}
