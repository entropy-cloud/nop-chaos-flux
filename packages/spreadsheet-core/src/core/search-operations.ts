import type { SpreadsheetDocument, SpreadsheetCellRef } from '../types.js';
import { cellAddress } from '../types.js';
import type { FindResult } from '../commands.js';
import { ensureSheetCells } from './document-access.js';

const UNSAFE_REGEX_PATTERN = /(\([^)]*[+*][^)]*\)[+*])|(\.\*)|(\.\+)|(\[[^\]]*\][+*]\+?)/;

function hasSearchQuery(query: string) {
  return query.length > 0;
}

function createSearchRegex(query: string, matchCase?: boolean) {
  if (!hasSearchQuery(query) || UNSAFE_REGEX_PATTERN.test(query)) {
    return null;
  }

  try {
    return new RegExp(query, matchCase ? '' : 'i');
  } catch {
    return null;
  }
}

export function findInDocument(
  doc: SpreadsheetDocument,
  sheetId: string | undefined,
  query: string,
  options: { matchCase?: boolean; matchWholeCell?: boolean; useRegex?: boolean },
  fromRow?: number,
  fromCol?: number,
): FindResult | null {
  if (!hasSearchQuery(query)) {
    return null;
  }

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
        const regex = createSearchRegex(query, options.matchCase);
        if (!regex) {
          continue;
        }

        const match = value.match(regex);
        if (match) {
          matches = true;
          matchStart = match.index ?? 0;
          matchEnd = matchStart + match[0].length;
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
  if (!hasSearchQuery(query)) {
    return doc;
  }

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
  const workbook = {
    ...updated.workbook,
    sheets: updated.workbook.sheets.map((sheetDoc) =>
      sheetDoc.id === cell.sheetId ? { ...sheetDoc, cells } : sheetDoc,
    ),
  };
  return { ...updated, workbook };
}

export function replaceAllInDocument(
  doc: SpreadsheetDocument,
  query: string,
  replacement: string,
  options: { matchCase?: boolean; matchWholeCell?: boolean; searchScope?: 'sheet' | 'workbook' },
  sheetId?: string,
): { doc: SpreadsheetDocument; count: number } {
  if (!hasSearchQuery(query)) {
    return { doc, count: 0 };
  }

  let count = 0;
  const sheets =
    options.searchScope === 'workbook' || !sheetId
      ? doc.workbook.sheets
      : doc.workbook.sheets.filter((sheet) => sheet.id === sheetId);

  const sheetPatches = new Map<string, Record<string, { value: string }>>();

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

      let newValue: string;
      if (options.matchWholeCell) {
        newValue = replacement;
      } else {
        const flags = options.matchCase ? 'g' : 'gi';
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        newValue = value.replace(new RegExp(escapedQuery, flags), replacement);
      }

      let patch = sheetPatches.get(sheet.id);
      if (!patch) {
        patch = {};
        sheetPatches.set(sheet.id, patch);
      }
      patch[address] = { value: newValue };
      count++;
    }
  }

  if (count === 0) {
    return { doc, count: 0 };
  }

  const updatedSheets = doc.workbook.sheets.map((sheet) => {
    const patch = sheetPatches.get(sheet.id);
    if (!patch) {
      return sheet;
    }
    const cells = { ...sheet.cells };
    for (const [address, { value }] of Object.entries(patch)) {
      const existing = cells[address];
      if (existing) {
        cells[address] = { ...existing, value };
      }
    }
    return { ...sheet, cells };
  });

  return {
    doc: { ...doc, workbook: { ...doc.workbook, sheets: updatedSheets } },
    count,
  };
}
