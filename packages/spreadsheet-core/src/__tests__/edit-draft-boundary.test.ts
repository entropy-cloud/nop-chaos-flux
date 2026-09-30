import { describe, expect, it, vi } from 'vitest';
import { createEmptyDocument, createSpreadsheetCore } from '../index.js';

function createCore() {
  const documentModel = createEmptyDocument('edit-draft-boundary');
  const core = createSpreadsheetCore({ document: documentModel });
  return { core, sheetId: core.getSnapshot().activeSheetId };
}

describe('spreadsheet edit draft boundary', () => {
  it('seeds the draft from the initial cell value on startEditing', () => {
    const { core, sheetId } = createCore();

    core.startEditing({ sheetId, address: 'A1', row: 0, col: 0 }, 'Seed');

    expect(core.getEditValue()).toBe('Seed');
    expect(core.getSnapshot().editing?.draftValue).toBe('Seed');
  });

  it('keeps updateEditValue non-reactive: no store notification, no snapshot change', () => {
    const { core, sheetId } = createCore();
    core.startEditing({ sheetId, address: 'A1', row: 0, col: 0 }, '');
    const listener = vi.fn();
    core.subscribe(listener);
    const snapshotBefore = core.getSnapshot();
    const editingBefore = snapshotBefore.editing;

    core.updateEditValue('keystroke');
    core.updateEditValue('keystrokes');

    expect(listener).not.toHaveBeenCalled();
    expect(core.getSnapshot()).toBe(snapshotBefore);
    expect(core.getEditValue()).toBe('keystrokes');
    expect(editingBefore?.draftValue).toBe('');
  });

  it('commits the draft into the editing state exactly once at the save boundary', () => {
    const { core, sheetId } = createCore();
    core.startEditing({ sheetId, address: 'B2', row: 1, col: 1 }, '');
    core.updateEditValue('committed-draft');
    const listener = vi.fn();
    core.subscribe(listener);

    const value = core.commitEditValue();

    expect(value).toBe('committed-draft');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(core.getSnapshot().editing?.draftValue).toBe('committed-draft');
    expect(core.getEditValue()).toBe('committed-draft');
  });

  it('returns an empty string from commitEditValue when no session is active', () => {
    const { core } = createCore();

    expect(core.commitEditValue()).toBe('');
    expect(core.getSnapshot().editing).toBeUndefined();
  });

  it('reseeds and clears the draft across sessions', () => {
    const { core, sheetId } = createCore();
    core.startEditing({ sheetId, address: 'A1', row: 0, col: 0 }, 'First');
    core.updateEditValue('First-edited');
    core.clearEditing();

    expect(core.getEditValue()).toBe('');
    expect(core.getSnapshot().editing).toBeUndefined();

    core.startEditing({ sheetId, address: 'A1', row: 0, col: 0 }, 'Second');
    expect(core.getEditValue()).toBe('Second');
  });
});
