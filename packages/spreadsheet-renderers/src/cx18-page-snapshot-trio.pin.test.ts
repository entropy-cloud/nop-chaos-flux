import { describe, expect, it } from 'vitest';
import {
  createEmptyDocument,
  createSpreadsheetCore,
  equalSpreadsheetPageSnapshot,
  selectSpreadsheetPageSnapshot,
} from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetCore } from '@nop-chaos/spreadsheet-core';

/**
 * plan 598 (CX-18) Phase 1 characterization pin: the page-snapshot slice trio,
 * spreadsheet face. Phase 2 G1 moved the trio verbatim into
 * @nop-chaos/spreadsheet-core (snapshot-selectors.ts) — this pin's import was
 * re-pointed with the move (ex page-renderer.js) and every assertion is
 * unchanged from the Phase 1 baseline.
 *
 * Equality is REFERENCE-based per slice field (no deep equality): a
 * deep-equal but fresh document is a change; ±0 deltas are unobservable here
 * because documents compare by identity (the ±0 observables live in the
 * deepEqual pin faces, cx18-deepequal-pin.test.ts in both cores).
 */

const sheetIdHolder: { current: string } = { current: undefined as unknown as string };

async function buildCore(cellValue?: string): Promise<SpreadsheetCore> {
  const doc = createEmptyDocument('cx18-trio-pin');
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

describe('spreadsheet page snapshot trio pin (plan 598 G1, spreadsheet face)', () => {
  it('select projects exactly the 8 slice fields and drops runtime-only fields', async () => {
    const core = await buildCore('v1');
    const snapshot = core.getSnapshot();
    const slice = selectSpreadsheetPageSnapshot(snapshot);

    expect(Object.keys(slice).sort()).toEqual([
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
    // Slice carries the mutated runtime value.
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

  it('equal: unrelated runtime churn (viewport/selection) is a change — reference semantics', async () => {
    const core = await buildCore('v1');
    const a = selectSpreadsheetPageSnapshot(core.getSnapshot());
    await core.dispatch({ type: 'spreadsheet:setViewport', viewport: { scrollX: 10, scrollY: 0, zoom: 1 } });
    const b = selectSpreadsheetPageSnapshot(core.getSnapshot());
    expect(equalSpreadsheetPageSnapshot(a, b)).toBe(false);
  });

  it('equal: a deep-equal but referentially fresh document is a change (no deep equality)', async () => {
    const coreA = await buildCore('v1');
    const coreB = await buildCore('v1');
    const snapshotA = coreA.getSnapshot();
    const snapshotB = coreB.getSnapshot();
    expect(snapshotA.document).not.toBe(snapshotB.document);
    const a = selectSpreadsheetPageSnapshot(snapshotA);
    const b = selectSpreadsheetPageSnapshot(snapshotB);
    expect(equalSpreadsheetPageSnapshot(a, b)).toBe(false);
  });

  it('equal: ±0-only document delta through fresh references is a change (identity, not value, compare)', async () => {
    const plusCore = await buildCore();
    await plusCore.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId: sheetIdHolder.current, address: 'A1', row: 0, col: 0 }, value: 0 });
    const minusCore = await buildCore();
    await minusCore.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId: sheetIdHolder.current, address: 'A1', row: 0, col: 0 }, value: -0 });
    expect(
      equalSpreadsheetPageSnapshot(
        selectSpreadsheetPageSnapshot(plusCore.getSnapshot()),
        selectSpreadsheetPageSnapshot(minusCore.getSnapshot()),
      ),
    ).toBe(false);
  });
});
