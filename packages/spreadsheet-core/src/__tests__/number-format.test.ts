import { describe, it, expect } from 'vitest';
import { createSpreadsheetCore, createEmptyDocument } from '../index.js';

describe('spreadsheet:setCellNumberFormat', () => {
  it('writes the number format onto the target cell', async () => {
    const doc = createEmptyDocument('number-format-1');
    const sheetId = doc.workbook.sheets[0].id;
    const core = createSpreadsheetCore({ document: doc });

    const result = await core.dispatch({
      type: 'spreadsheet:setCellNumberFormat',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      format: '#,##0.00',
    });

    expect(result.ok).toBe(true);
    const cell = core.getSnapshot().document.workbook.sheets[0].cells?.['A1'];
    expect(cell?.numberFormat).toBe('#,##0.00');
  });

  it('writes the number format onto every cell of a range', async () => {
    const doc = createEmptyDocument('number-format-2');
    const sheetId = doc.workbook.sheets[0].id;
    const core = createSpreadsheetCore({ document: doc });

    await core.dispatch({
      type: 'spreadsheet:setCellNumberFormat',
      target: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
      format: '0.00%',
    });

    const cells = core.getSnapshot().document.workbook.sheets[0].cells ?? {};
    expect(cells['A1']?.numberFormat).toBe('0.00%');
    expect(cells['B1']?.numberFormat).toBe('0.00%');
    expect(cells['A2']?.numberFormat).toBe('0.00%');
    expect(cells['B2']?.numberFormat).toBe('0.00%');
  });
});
