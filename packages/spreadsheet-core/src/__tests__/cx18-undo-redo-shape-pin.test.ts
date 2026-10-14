import { describe, expect, it, beforeEach } from 'vitest';
import { createEmptyDocument, createSpreadsheetCore } from '../index.js';
import type { SpreadsheetCore } from '../index.js';

/**
 * plan 598 (CX-18) Phase 1 characterization pin: undo/redo 7-step
 * rebuild-opposite-entry shape, spreadsheet face (public API observables only —
 * survives the G5 de-export of handle*). The shared skeleton absorbed by the
 * G3 editor-coreHolder.current helper: peek → empty early-return → pop → rebuild opposite
 * entry {forward/inverse: operation-time currentDocument, opposite: restored,
 * timestamp: Date.now()} → return restored. Call sites keep their divergent
 * steps: setState payload + dirty + clearTransientState.
 *
 * Drift scenario (pre-adjudicated semantics): a transaction-open mutation
 * drifts the document WITHOUT pushing a stack entry; after undo→redo, redo
 * restores the UNDO-TIMEPOINT document (the rebuilt entry's forward), not the
 * originally-pushed forward.
 */

const coreHolder: { current: SpreadsheetCore } = { current: undefined as unknown as SpreadsheetCore };
const sheetIdHolder: { current: string } = { current: undefined as unknown as string };

function cellValue(address: string): unknown {
  return coreHolder.current.getSnapshot().document.workbook.sheets[0].cells?.[address]?.value;
}

function history() {
  return coreHolder.current.getSnapshot().history;
}

beforeEach(() => {
  const doc = createEmptyDocument('cx18-undo-redo-shape');
  sheetIdHolder.current = doc.workbook.sheets[0].id;
  coreHolder.current = createSpreadsheetCore({ document: doc });
});

async function setCell(address: string, row: number, col: number, value: unknown) {
  return coreHolder.current.dispatch({
    type: 'spreadsheet:setCellValue',
    cell: { sheetId: sheetIdHolder.current, address, row, col },
    value,
  });
}

describe('spreadsheet undo/redo 7-step shape pin (plan 598 G3)', () => {
  it('empty-stack undo/redo: peek-empty early-return with per-domain error text and result shape', async () => {
    const undoResult = await coreHolder.current.dispatch({ type: 'spreadsheet:undo' });
    expect(undoResult).toEqual({ ok: false, changed: false, error: 'Nothing to undo' });

    const redoResult = await coreHolder.current.dispatch({ type: 'spreadsheet:redo' });
    expect(redoResult).toEqual({ ok: false, changed: false, error: 'Nothing to redo' });

    expect(history()).toEqual({ canUndo: false, canRedo: false, undoDepth: 0, redoDepth: 0 });
  });

  it('mutation → undo → redo restores documents and moves the rebuilt entry (depth observables)', async () => {
    const set = await setCell('A1', 0, 0, 'v1');
    expect(set).toEqual({ ok: true, changed: true });
    expect(history()).toEqual({ canUndo: true, canRedo: false, undoDepth: 1, redoDepth: 0 });
    expect(coreHolder.current.getSnapshot().dirty).toBe(true);

    const undo = await coreHolder.current.dispatch({ type: 'spreadsheet:undo' });
    expect(undo).toEqual({ ok: true, changed: true });
    expect(cellValue('A1')).toBeUndefined();
    expect(history()).toEqual({ canUndo: false, canRedo: true, undoDepth: 0, redoDepth: 1 });
    // Call-site divergent step: undo marks dirty (does not restore saved state).
    expect(coreHolder.current.getSnapshot().dirty).toBe(true);

    const redo = await coreHolder.current.dispatch({ type: 'spreadsheet:redo' });
    expect(redo).toEqual({ ok: true, changed: true });
    expect(cellValue('A1')).toBe('v1');
    expect(history()).toEqual({ canUndo: true, canRedo: false, undoDepth: 1, redoDepth: 0 });
    expect(coreHolder.current.getSnapshot().dirty).toBe(true);
  });

  it('drift scenario: redo-after-document-drift restores the undo-timepoint document', async () => {
    await setCell('A1', 0, 0, 'committed');
    expect(history().undoDepth).toBe(1);

    // Open a transaction and drift the document in-transaction (no push).
    const begin = await coreHolder.current.dispatch({ type: 'spreadsheet:beginTransaction' });
    expect(begin.ok).toBe(true);
    await setCell('A2', 1, 0, 'drifted');
    expect(cellValue('A2')).toBe('drifted');
    expect(history()).toEqual({ canUndo: true, canRedo: false, undoDepth: 1, redoDepth: 0 });

    // Undo during the open transaction: restores the entry inverse (pre-A1 doc).
    const undo = await coreHolder.current.dispatch({ type: 'spreadsheet:undo' });
    expect(undo).toEqual({ ok: true, changed: true });
    expect(cellValue('A1')).toBeUndefined();
    expect(cellValue('A2')).toBeUndefined();
    expect(history()).toEqual({ canUndo: false, canRedo: true, undoDepth: 0, redoDepth: 1 });

    // Redo restores the UNDO-TIMEPOINT document (with the drifted A2), not the
    // entry's originally-pushed forward (A1 only) — rebuild-opposite-entry
    // semantics at operation time.
    const redo = await coreHolder.current.dispatch({ type: 'spreadsheet:redo' });
    expect(redo).toEqual({ ok: true, changed: true });
    expect(cellValue('A1')).toBe('committed');
    expect(cellValue('A2')).toBe('drifted');
    expect(history()).toEqual({ canUndo: true, canRedo: false, undoDepth: 1, redoDepth: 0 });

    // The rebuilt entry is a full snapshot pair: undo again restores the
    // pre-A1 document.
    await coreHolder.current.dispatch({ type: 'spreadsheet:undo' });
    expect(cellValue('A1')).toBeUndefined();
    expect(cellValue('A2')).toBeUndefined();
  });

  it('undo resets transient selection state (spreadsheet-only divergent step)', async () => {
    await setCell('A1', 0, 0, 'v1');
    await coreHolder.current.dispatch({ type: 'spreadsheet:setSelection', selection: { kind: 'sheet', sheetId: sheetIdHolder.current } });
    expect(coreHolder.current.getSnapshot().selection.kind).toBe('sheet');

    await coreHolder.current.dispatch({ type: 'spreadsheet:undo' });
    expect(coreHolder.current.getSnapshot().selection.kind).toBe('none');
    expect(coreHolder.current.getSnapshot().editing).toBeUndefined();
  });
});
