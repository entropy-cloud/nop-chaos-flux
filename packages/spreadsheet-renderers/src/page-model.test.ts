import { describe, expect, it } from 'vitest';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import { deriveHostSnapshot } from './bridge.js';
import {
  buildSpreadsheetStatusLabel,
  getRuntimeActiveSheet,
  getRuntimeActiveSheetCellCount,
  getRuntimeActiveSheetName,
} from './page-model.js';

describe('spreadsheet page model helpers', () => {
  it('resolves active sheet from runtime snapshot', () => {
    const core = createSpreadsheetCore({ document: createEmptyDocument('sheet-active') });
    const runtime = core.getSnapshot();

    expect(getRuntimeActiveSheet(runtime)?.id).toBe(runtime.activeSheetId);
  });

  it('returns Unknown when active sheet is missing', () => {
    const core = createSpreadsheetCore({ document: createEmptyDocument('missing-active-sheet') });
    const runtime = {
      ...core.getSnapshot(),
      activeSheetId: 'missing-sheet-id',
    };

    expect(getRuntimeActiveSheet(runtime)).toBeUndefined();
    expect(getRuntimeActiveSheetName(runtime)).toBe('Unknown');
    expect(getRuntimeActiveSheetCellCount(runtime)).toBe(0);
  });

  it('computes active sheet name and cell count', async () => {
    const document = createEmptyDocument('cells');
    const core = createSpreadsheetCore({ document });
    const sheetId = core.getSnapshot().activeSheetId;

    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'A',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'B2', row: 1, col: 1 },
      value: 'B',
    });

    const runtime = core.getSnapshot();
    expect(getRuntimeActiveSheetName(runtime)).toBe(runtime.document.workbook.sheets[0].name);
    expect(getRuntimeActiveSheetCellCount(runtime)).toBe(2);
  });

  it('builds status label from host snapshot', async () => {
    const core = createSpreadsheetCore({ document: createEmptyDocument('status') });
    const sheetId = core.getSnapshot().activeSheetId;

    await core.dispatch({
      type: 'spreadsheet:setSelection',
      selection: {
        kind: 'cell',
        sheetId,
        anchor: { sheetId, address: 'C3', row: 2, col: 2 },
      },
    });

    const host = deriveHostSnapshot(core.getSnapshot());
    expect(buildSpreadsheetStatusLabel(host)).toBe(`Active sheet: ${host.activeSheet?.name ?? 'Unknown'} | Selection: cell`);
  });
});
