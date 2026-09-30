import type { SpreadsheetDocument, WorksheetFilterState } from '../types.js';
import { cellAddress } from '../types.js';
import { ensureSheetCells, replaceSheet } from './document-access.js';

export function applyFilterRowsByCellValue(
  doc: SpreadsheetDocument,
  sheetId: string,
  col: number,
  value: unknown,
  hasHeader = false,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const cells = sheet.cells ?? {};

  const newFilterColumns = [
    ...(sheet.filters?.columns ?? []).filter((entry) => entry.col !== col),
    { col, kind: 'cellValue' as const, value },
  ];

  const candidateRows = Object.values(cells)
    .filter((cell) => newFilterColumns.some((f) => f.col === cell.col))
    .map((cell) => cell.row);
  const maxRow = candidateRows.length > 0 ? Math.max(...candidateRows) : -1;

  const rows = { ...sheet.rows };
  for (let row = hasHeader ? 1 : 0; row <= maxRow; row++) {
    const key = String(row);
    const matchesAll = newFilterColumns.every((f) => {
      const cell = cells[cellAddress(row, f.col)];
      return cell?.value === f.value;
    });
    rows[key] = {
      ...(rows[key] ?? { index: row }),
      index: row,
      filteredOut: !matchesAll,
    };
  }

  return replaceSheet(updated, sheetId, {
    ...sheet,
    rows,
    filters: { columns: newFilterColumns },
  });
}

export function applyClearRowFilters(
  doc: SpreadsheetDocument,
  sheetId: string,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const rows = { ...sheet.rows };

  for (const [key, row] of Object.entries(rows)) {
    if (!row.filteredOut) {
      continue;
    }
    rows[key] = {
      ...row,
      filteredOut: false,
    };
  }

  const filters: WorksheetFilterState = { columns: [] };
  return replaceSheet(updated, sheetId, { ...sheet, rows, filters });
}
