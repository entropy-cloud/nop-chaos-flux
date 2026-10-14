import { describe, expect, it } from 'vitest';
import {
  createEmptyDocument,
  createSpreadsheetCore,
  equalSpreadsheetPageSnapshot,
  selectSpreadsheetPageSnapshot,
} from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetCore, SpreadsheetRuntimeSnapshot } from '@nop-chaos/spreadsheet-core';

/**
 * plan 598 (CX-18) Phase 1 characterization pin: the page-snapshot slice trio,
 * report twin face (Phase 1 home: report-designer-renderers/
 * page-renderer-snapshots.ts :55-95 — bodies verbatim-identical to the
 * spreadsheet face). Phase 2 G1 deleted that twin and re-pointed report
 * consumption to @nop-chaos/spreadsheet-core; this pin's import was
 * re-pointed with the move and every assertion is unchanged from the Phase 1
 * baseline.
 *
 * Equality is REFERENCE-based per slice field (no deep equality).
 */

const sheetIdHolder: { current: string } = { current: undefined as unknown as string };

async function buildCore(cellValue?: string): Promise<SpreadsheetCore> {
  const doc = createEmptyDocument('cx18-report-trio-pin');
  sheetIdHolder.current = doc.workbook.sheets[0].id;
  const core = createSpreadsheetCore({ document: doc });
  if (cellValue !== undefined) {
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId: sheetIdHolder.current, address: 'A1', row: 0, col: 0 },
      value: cellValue,
    });
  }
  return core;
}

function sliceKeys(snapshot: SpreadsheetRuntimeSnapshot) {
  return Object.keys(selectSpreadsheetPageSnapshot(snapshot)).sort();
}

describe('report spreadsheet snapshot trio pin (plan 598 G1, report twin face)', () => {
  it('select projects exactly the 8 twin slice fields and drops runtime-only fields', async () => {
    const core = await buildCore('v1');
    const snapshot = core.getSnapshot();
    const slice = selectSpreadsheetPageSnapshot(snapshot);

    expect(sliceKeys(snapshot)).toEqual([
      'activeSheetId',
      'dirty',
      'document',
      'history',
      'layout',
      'readonly',
      'selection',
      'viewport',
    ]);
    expect(slice.document).toBe(snapshot.document);
    expect(slice.activeSheetId).toBe(snapshot.activeSheetId);
    expect(slice.selection).toBe(snapshot.selection);
    expect(slice.history).toEqual(snapshot.history);
    expect(slice.dirty).toBe(snapshot.dirty);
    expect(slice.readonly).toBe(snapshot.readonly);
    expect(slice.viewport).toBe(snapshot.viewport);
    expect(slice.layout).toBe(snapshot.layout);
    expect('editing' in slice).toBe(false);
    expect(slice.document.workbook.sheets[0].cells?.A1?.value).toBe('v1');
    expect(slice.history.canUndo).toBe(true);
    expect(slice.history.undoDepth).toBe(1);
  });

  it('equal: same snapshot projection is equal; any changed field is a change', async () => {
    const core = await buildCore('v1');
    const before = core.getSnapshot();
    const a = selectSpreadsheetPageSnapshot(before);
    const b = selectSpreadsheetPageSnapshot(before);
    expect(equalSpreadsheetPageSnapshot(a, b)).toBe(true);
    expect(equalSpreadsheetPageSnapshot(a, a)).toBe(true);

    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId: sheetIdHolder.current, address: 'B1', row: 0, col: 1 }, value: 'v2' });
    const after = selectSpreadsheetPageSnapshot(core.getSnapshot());
    expect(equalSpreadsheetPageSnapshot(a, after)).toBe(false);
  });

  it('equal: a deep-equal but referentially fresh document is a change (no deep equality)', async () => {
    const coreA = await buildCore('v1');
    const coreB = await buildCore('v1');
    const snapshotA = coreA.getSnapshot();
    const snapshotB = coreB.getSnapshot();
    expect(snapshotA.document).not.toBe(snapshotB.document);
    expect(
      equalSpreadsheetPageSnapshot(
        selectSpreadsheetPageSnapshot(snapshotA),
        selectSpreadsheetPageSnapshot(snapshotB),
      ),
    ).toBe(false);
  });

  it('twin parity: identical behavior to a fresh reference mutation on history and dirty fields', async () => {
    const core = await buildCore('v1');
    const a = selectSpreadsheetPageSnapshot(core.getSnapshot());
    await core.dispatch({ type: 'spreadsheet:undo' });
    const b = selectSpreadsheetPageSnapshot(core.getSnapshot());
    expect(equalSpreadsheetPageSnapshot(a, b)).toBe(false);
    expect(b.document.workbook.sheets[0].cells?.A1?.value).toBeUndefined();
    expect(b.history.canUndo).toBe(false);
    expect(b.history.canRedo).toBe(true);
    expect(b.dirty).toBe(true);
  });
});
