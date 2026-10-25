import { describe, expect, it } from 'vitest';
import type {
  ExcelCellLike,
  ExcelSheetLike,
  ExcelWorkbookLike,
  XptCellLike,
  XptSheetLike,
  XptWorkbookLike,
} from './index.js';

describe('nop-report codec intermediate types', () => {
  it('accepts a minimal ExcelWorkbookLike envelope', () => {
    const cell: ExcelCellLike = { value: 1 };
    const sheet: ExcelSheetLike = { name: 'Sheet1', cells: { A1: cell } };
    const workbook: ExcelWorkbookLike = { sheets: [sheet] };

    expect(workbook.sheets[0]?.name).toBe('Sheet1');
    expect(workbook.sheets[0]?.cells?.A1?.value).toBe(1);
  });

  it('preserves unknown fields through the raw extension points', () => {
    const workbook: ExcelWorkbookLike = {
      sheets: [],
      raw: { extUnknownWorkbookField: { nested: true } },
    };
    const cell: ExcelCellLike = { value: 'x', raw: { extUnknownCellField: 42 } };

    expect(workbook.raw?.extUnknownWorkbookField).toEqual({ nested: true });
    expect(cell.raw?.extUnknownCellField).toBe(42);
  });

  it('accepts XptWorkbookLike with workbook/sheet/cell models', () => {
    const cell: XptCellLike = { model: { field: 'orderId', ds: 'orders', expandType: 'r' } };
    const sheet: XptSheetLike = { model: { pageSetup: 'A4' }, cells: { B2: cell } };
    const workbook: XptWorkbookLike = { model: { exportFormat: 'xlsx' }, sheets: { main: sheet } };

    expect(workbook.sheets?.main?.cells?.B2?.model?.field).toBe('orderId');
    expect(workbook.model?.exportFormat).toBe('xlsx');
  });
});
