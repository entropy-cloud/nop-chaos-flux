import type { CellDocument, SpreadsheetDocument, SpreadsheetRange, SpreadsheetSortDirection } from '../types.js';
import { cellAddress, normalizeRange } from '../types.js';

function compareValues(left: unknown, right: unknown) {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
}

export function applySortRange(
  doc: SpreadsheetDocument,
  range: SpreadsheetRange,
  keyCol: number,
  direction: SpreadsheetSortDirection,
  hasHeader = false,
): SpreadsheetDocument {
  const normalized = normalizeRange(range);
  const sheet = doc.workbook.sheets.find((entry) => entry.id === normalized.sheetId);
  if (!sheet || !sheet.cells) {
    return doc;
  }

  const startRow = normalized.startRow + (hasHeader ? 1 : 0);
  if (startRow > normalized.endRow) {
    return doc;
  }

  const rowEntries = Array.from({ length: normalized.endRow - startRow + 1 }, (_, index) => {
    const row = startRow + index;
    const sortCell = sheet.cells?.[cellAddress(row, keyCol)];
    return {
      row,
      sortValue: sortCell?.value,
      cells: Array.from({ length: normalized.endCol - normalized.startCol + 1 }, (_, cellIndex) => {
        const col = normalized.startCol + cellIndex;
        const address = cellAddress(row, col);
        return sheet.cells?.[address] ? { ...sheet.cells[address] } : undefined;
      }),
    };
  });

  const sortedRows = [...rowEntries].sort((left, right) => {
    const result = compareValues(left.sortValue, right.sortValue);
    return direction === 'asc' ? result : -result;
  });

  const preservedCells: Record<string, CellDocument> = {};
  for (const [address, cell] of Object.entries(sheet.cells)) {
    if (
      cell.row < normalized.startRow
      || cell.row > normalized.endRow
      || cell.col < normalized.startCol
      || cell.col > normalized.endCol
    ) {
      preservedCells[address] = cell;
    }
  }

  sortedRows.forEach((rowEntry, rowIndex) => {
    const targetRow = startRow + rowIndex;
    rowEntry.cells.forEach((cell, cellIndex) => {
      if (!cell) {
        return;
      }
      const targetCol = normalized.startCol + cellIndex;
      const targetAddress = cellAddress(targetRow, targetCol);
      preservedCells[targetAddress] = {
        ...cell,
        row: targetRow,
        col: targetCol,
        address: targetAddress,
      };
    });
  });

  const nextSheet = {
    ...sheet,
    cells: preservedCells,
  };

  return {
    ...doc,
    workbook: {
      ...doc.workbook,
      sheets: doc.workbook.sheets.map((entry) => (entry.id === nextSheet.id ? nextSheet : entry)),
    },
  };
}
