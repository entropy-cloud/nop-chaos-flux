import { describe, it, expect } from 'vitest';
import {
  createSpreadsheetCore,
  createEmptyDocument,
  type SpreadsheetDocument,
} from '../index.js';

/**
 * CellDocument.raw is the passthrough carrier for UI-unmodeled cell fields
 * (plan 749 / roadmap NRP-1). Existing cell mutation paths must not strip it,
 * so the codec layer can rely on it for lossless round-trip (NRP-2).
 */
describe('CellDocument.raw passthrough', () => {
  function docWithRawCell(): SpreadsheetDocument {
    const doc = createEmptyDocument('raw-doc');
    const sheet = doc.workbook.sheets[0];
    sheet.cells = {
      A1: {
        address: 'A1',
        row: 0,
        col: 0,
        value: 'kept',
        raw: { extUnknownField: { nested: [1, 2, 3] } },
      },
    };
    return doc;
  }

  it('keeps raw when a cell value is updated through the command path', async () => {
    const doc = docWithRawCell();
    const sheetId = doc.workbook.sheets[0].id;
    const core = createSpreadsheetCore({ document: doc });

    const result = await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'changed',
    });
    expect(result.ok).toBe(true);

    const cell = core.getSnapshot().document.workbook.sheets[0].cells?.A1;
    expect(cell?.value).toBe('changed');
    expect(cell?.raw).toEqual({ extUnknownField: { nested: [1, 2, 3] } });
  });

  it('keeps raw when a cell style is updated through the command path', async () => {
    const doc = docWithRawCell();
    const sheetId = doc.workbook.sheets[0].id;
    const core = createSpreadsheetCore({ document: doc });

    const result = await core.dispatch({
      type: 'spreadsheet:setCellStyle',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      styleId: 's1',
    });
    expect(result.ok).toBe(true);

    const cell = core.getSnapshot().document.workbook.sheets[0].cells?.A1;
    expect(cell?.styleId).toBe('s1');
    expect(cell?.raw).toEqual({ extUnknownField: { nested: [1, 2, 3] } });
  });
});
