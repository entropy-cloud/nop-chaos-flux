import { describe, it, expect } from 'vitest';
import {
  cellAddress,
  parseCellAddress,
  isSameCellRef,
  isRangeEmpty,
  rangeContainsCell,
  normalizeRange,
  rangeSize,
  createEmptyDocument,
} from './index.js';

describe('cellAddress', () => {
  it('should convert (0,0) to A1', () => {
    expect(cellAddress(0, 0)).toBe('A1');
  });

  it('should convert (0,25) to Z1', () => {
    expect(cellAddress(0, 25)).toBe('Z1');
  });

  it('should convert (0,26) to AA1', () => {
    expect(cellAddress(0, 26)).toBe('AA1');
  });

  it('should convert (9,0) to A10', () => {
    expect(cellAddress(9, 0)).toBe('A10');
  });

  it('should convert (99,51) to AZ100', () => {
    expect(cellAddress(99, 51)).toBe('AZ100');
  });
});

describe('parseCellAddress', () => {
  it('should parse A1 to (0,0)', () => {
    expect(parseCellAddress('A1')).toEqual({ row: 0, col: 0 });
  });

  it('should parse Z1 to (0,25)', () => {
    expect(parseCellAddress('Z1')).toEqual({ row: 0, col: 25 });
  });

  it('should parse AA1 to (0,26)', () => {
    expect(parseCellAddress('AA1')).toEqual({ row: 0, col: 26 });
  });

  it('should parse A10 to (9,0)', () => {
    expect(parseCellAddress('A10')).toEqual({ row: 9, col: 0 });
  });

  it('should throw for invalid address', () => {
    expect(() => parseCellAddress('invalid')).toThrow('Invalid cell address');
  });
});

describe('cellAddress round-trip', () => {
  it('should round-trip various addresses', () => {
    const addresses = [
      { row: 0, col: 0 },
      { row: 5, col: 10 },
      { row: 99, col: 25 },
      { row: 0, col: 26 },
      { row: 0, col: 701 },
    ];
    for (const { row, col } of addresses) {
      const addr = cellAddress(row, col);
      expect(parseCellAddress(addr)).toEqual({ row, col });
    }
  });
});

describe('isSameCellRef', () => {
  it('should return true for same cell', () => {
    const a = { sheetId: 's1', address: 'A1', row: 0, col: 0 };
    const b = { sheetId: 's1', address: 'A1', row: 0, col: 0 };
    expect(isSameCellRef(a, b)).toBe(true);
  });

  it('should return false for different sheets', () => {
    const a = { sheetId: 's1', address: 'A1', row: 0, col: 0 };
    const b = { sheetId: 's2', address: 'A1', row: 0, col: 0 };
    expect(isSameCellRef(a, b)).toBe(false);
  });

  it('should return false for different positions', () => {
    const a = { sheetId: 's1', address: 'A1', row: 0, col: 0 };
    const b = { sheetId: 's1', address: 'B1', row: 0, col: 1 };
    expect(isSameCellRef(a, b)).toBe(false);
  });
});

describe('isRangeEmpty', () => {
  it('should return true for single cell range', () => {
    expect(isRangeEmpty({ sheetId: 's1', startRow: 0, startCol: 0, endRow: 0, endCol: 0 })).toBe(true);
  });

  it('should return false for multi-cell range', () => {
    expect(isRangeEmpty({ sheetId: 's1', startRow: 0, startCol: 0, endRow: 1, endCol: 1 })).toBe(false);
  });
});

describe('rangeContainsCell', () => {
  it('should return true for cell inside range', () => {
    const range = { sheetId: 's1', startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
    const cell = { sheetId: 's1', address: 'B2', row: 1, col: 1 };
    expect(rangeContainsCell(range, cell)).toBe(true);
  });

  it('should return true for cell at range corner', () => {
    const range = { sheetId: 's1', startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
    const cell = { sheetId: 's1', address: 'C3', row: 2, col: 2 };
    expect(rangeContainsCell(range, cell)).toBe(true);
  });

  it('should return false for cell outside range', () => {
    const range = { sheetId: 's1', startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
    const cell = { sheetId: 's1', address: 'D4', row: 3, col: 3 };
    expect(rangeContainsCell(range, cell)).toBe(false);
  });

  it('should return false for cell on different sheet', () => {
    const range = { sheetId: 's1', startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
    const cell = { sheetId: 's2', address: 'A1', row: 0, col: 0 };
    expect(rangeContainsCell(range, cell)).toBe(false);
  });
});

describe('normalizeRange', () => {
  it('should normalize inverted range', () => {
    const range = { sheetId: 's1', startRow: 2, startCol: 2, endRow: 0, endCol: 0 };
    expect(normalizeRange(range)).toEqual({
      sheetId: 's1',
      startRow: 0,
      startCol: 0,
      endRow: 2,
      endCol: 2,
    });
  });

  it('should keep normal range unchanged', () => {
    const range = { sheetId: 's1', startRow: 0, startCol: 0, endRow: 2, endCol: 2 };
    expect(normalizeRange(range)).toEqual(range);
  });
});

describe('rangeSize', () => {
  it('should return correct size for single cell', () => {
    expect(rangeSize({ sheetId: 's1', startRow: 0, startCol: 0, endRow: 0, endCol: 0 })).toEqual({
      rows: 1,
      cols: 1,
    });
  });

  it('should return correct size for multi-cell range', () => {
    expect(rangeSize({ sheetId: 's1', startRow: 0, startCol: 0, endRow: 2, endCol: 3 })).toEqual({
      rows: 3,
      cols: 4,
    });
  });
});

describe('createEmptyDocument', () => {
  it('should create a document with one sheet', () => {
    const doc = createEmptyDocument();
    expect(doc.kind).toBe('spreadsheet');
    expect(doc.workbook.sheets.length).toBe(1);
    expect(doc.workbook.sheets[0].name).toBe('Sheet1');
  });

  it('should use provided id', () => {
    const doc = createEmptyDocument('my-id');
    expect(doc.id).toBe('my-id');
  });
});
