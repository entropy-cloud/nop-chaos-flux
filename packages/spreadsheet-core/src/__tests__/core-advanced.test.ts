import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSpreadsheetCore,
  createEmptyDocument,
  type SpreadsheetCore,
} from '../index.js';

describe('undo/redo', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should undo setCellValue', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'Test',
    });

    expect(core.getSnapshot().history.canUndo).toBe(true);
    const result = await core.dispatch({ type: 'spreadsheet:undo' });
    expect(result.ok).toBe(true);

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']).toBeUndefined();
    expect(snap.history.canRedo).toBe(true);
  });

  it('should redo after undo', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'Test',
    });

    await core.dispatch({ type: 'spreadsheet:undo' });
    const result = await core.dispatch({ type: 'spreadsheet:redo' });
    expect(result.ok).toBe(true);

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.value).toBe('Test');
    expect(snap.history.canUndo).toBe(true);
    expect(snap.history.canRedo).toBe(false);
  });

  it('should fail undo when nothing to undo', async () => {
    const result = await core.dispatch({ type: 'spreadsheet:undo' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Nothing to undo');
  });

  it('should fail redo when nothing to redo', async () => {
    const result = await core.dispatch({ type: 'spreadsheet:redo' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Nothing to redo');
  });

  it('should clear redo stack on new mutation', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'First',
    });
    await core.dispatch({ type: 'spreadsheet:undo' });
    expect(core.getSnapshot().history.canRedo).toBe(true);

    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'B1', row: 0, col: 1 },
      value: 'New',
    });
    expect(core.getSnapshot().history.canRedo).toBe(false);
  });

  it('should track undo depth', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'One',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'Two',
    });

    expect(core.getSnapshot().history.undoDepth).toBe(2);
    await core.dispatch({ type: 'spreadsheet:undo' });
    expect(core.getSnapshot().history.undoDepth).toBe(1);
    expect(core.getSnapshot().history.redoDepth).toBe(1);
  });
});

describe('transactions', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should rollback transaction', async () => {
    await core.dispatch({ type: 'spreadsheet:beginTransaction' });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'In Transaction',
    });
    await core.dispatch({ type: 'spreadsheet:rollbackTransaction' });

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']).toBeUndefined();
  });

  it('should commit transaction', async () => {
    await core.dispatch({ type: 'spreadsheet:beginTransaction' });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'Committed',
    });
    await core.dispatch({ type: 'spreadsheet:commitTransaction' });

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.value).toBe('Committed');
  });
});

describe('readonly mode', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc, readonly: true });
  });

  it('should reject setCellValue in readonly mode', async () => {
    const result = await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'Test',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Document is readonly');
  });

  it('should allow setSelection in readonly mode', async () => {
    const result = await core.dispatch({
      type: 'spreadsheet:setSelection',
      selection: { kind: 'cell', sheetId, anchor: { sheetId, address: 'A1', row: 0, col: 0 } },
    });
    expect(result.ok).toBe(true);
  });

  it('should report readonly in snapshot', () => {
    expect(core.getSnapshot().readonly).toBe(true);
  });
});

describe('replaceDocument/exportDocument', () => {
  it('should replace document', () => {
    const doc1 = createEmptyDocument('doc1');
    const doc2 = createEmptyDocument('doc2');
    const core = createSpreadsheetCore({ document: doc1 });

    core.replaceDocument(doc2);
    expect(core.getSnapshot().document.id).toBe('doc2');
    expect(core.getSnapshot().dirty).toBe(false);
    expect(core.getSnapshot().history.canUndo).toBe(false);
  });

  it('should export document', async () => {
    const doc = createEmptyDocument();
    const core = createSpreadsheetCore({ document: doc });
    const sheetId = doc.workbook.sheets[0].id;

    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'Export me',
    });

    const exported = core.exportDocument();
    expect(exported.workbook.sheets[0].cells?.['A1']?.value).toBe('Export me');
  });
});

describe('subscribe', () => {
  it('should notify listeners on state change', async () => {
    const doc = createEmptyDocument();
    const sheetId = doc.workbook.sheets[0].id;
    const core = createSpreadsheetCore({ document: doc });

    let notified = false;
    core.subscribe(() => { notified = true; });

    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'Change',
    });

    expect(notified).toBe(true);
  });

  it('should unsubscribe', async () => {
    const doc = createEmptyDocument();
    const sheetId = doc.workbook.sheets[0].id;
    const core = createSpreadsheetCore({ document: doc });

    let count = 0;
    const unsub = core.subscribe(() => { count++; });
    unsub();

    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'No notify',
    });

    expect(count).toBe(0);
  });
});

describe('command source', () => {
  it('should accept command source', async () => {
    const doc = createEmptyDocument();
    const sheetId = doc.workbook.sheets[0].id;
    const core = createSpreadsheetCore({ document: doc });

    const result = await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'toolbar action',
      source: 'toolbar',
    });

    expect(result.ok).toBe(true);
  });
});
