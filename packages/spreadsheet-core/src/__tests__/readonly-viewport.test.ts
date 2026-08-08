import { describe, it, expect } from 'vitest';
import { createSpreadsheetCore, createEmptyDocument } from '../index.js';

describe('readonly mode viewport whitelist', () => {
  it('allows spreadsheet:setViewport in readonly mode (view-safe command)', async () => {
    const doc = createEmptyDocument('readonly-viewport');
    const core = createSpreadsheetCore({ document: doc, readonly: true });

    const result = await core.dispatch({
      type: 'spreadsheet:setViewport',
      viewport: { scrollX: 120, scrollY: 240, zoom: 1 },
    });

    expect(result.ok).toBe(true);
    expect(core.getSnapshot().viewport.scrollX).toBe(120);
    expect(core.getSnapshot().viewport.scrollY).toBe(240);
  });

  it('still rejects document mutations in readonly mode', async () => {
    const doc = createEmptyDocument('readonly-mutation');
    const core = createSpreadsheetCore({ document: doc, readonly: true });

    const result = await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId: doc.workbook.sheets[0].id, address: 'A1', row: 0, col: 0 },
      value: 'x',
    });

    expect(result.ok).toBe(false);
  });
});
