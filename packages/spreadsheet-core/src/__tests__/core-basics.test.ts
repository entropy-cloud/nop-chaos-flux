import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSpreadsheetCore,
  createEmptyDocument,
  type SpreadsheetCore,
  type SpreadsheetDocument,
} from '../index.js';

describe('createSpreadsheetCore', () => {
  let core: SpreadsheetCore;
  let doc: SpreadsheetDocument;

  beforeEach(() => {
    doc = createEmptyDocument('test-doc');
    core = createSpreadsheetCore({ document: doc });
  });

  it('should create core with initial snapshot', () => {
    const snap = core.getSnapshot();
    expect(snap.document.id).toBe('test-doc');
    expect(snap.document.workbook.sheets.length).toBe(1);
    expect(snap.readonly).toBe(false);
    expect(snap.dirty).toBe(false);
    expect(snap.history.canUndo).toBe(false);
    expect(snap.history.canRedo).toBe(false);
  });

  it('should set active sheet', async () => {
    const sheetId = doc.workbook.sheets[0].id;
    const result = await core.dispatch({
      type: 'spreadsheet:setActiveSheet',
      sheetId,
    });
    expect(result.ok).toBe(true);
    expect(core.getSnapshot().activeSheetId).toBe(sheetId);
  });

  it('should fail setActiveSheet for unknown sheet', async () => {
    const result = await core.dispatch({
      type: 'spreadsheet:setActiveSheet',
      sheetId: 'nonexistent',
    });
    expect(result.ok).toBe(false);
  });

  it('should set selection', async () => {
    const sheetId = doc.workbook.sheets[0].id;
    const result = await core.dispatch({
      type: 'spreadsheet:setSelection',
      selection: {
        kind: 'cell',
        sheetId,
        anchor: { sheetId, address: 'A1', row: 0, col: 0 },
      },
    });
    expect(result.ok).toBe(true);
    expect(core.getSnapshot().selection.kind).toBe('cell');
  });
});

describe('setCellValue', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should set cell value', async () => {
    const result = await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'Hello',
    });
    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);

    const snap = core.getSnapshot();
    const cells = snap.document.workbook.sheets[0].cells;
    expect(cells?.['A1']?.value).toBe('Hello');
  });

  it('should set multiple cell values', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'First',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'B1', row: 0, col: 1 },
      value: 'Second',
    });

    const snap = core.getSnapshot();
    const cells = snap.document.workbook.sheets[0].cells;
    expect(cells?.['A1']?.value).toBe('First');
    expect(cells?.['B1']?.value).toBe('Second');
  });

  it('should overwrite existing cell value', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'Original',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'Updated',
    });

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.value).toBe('Updated');
  });

  it('should mark document as dirty', async () => {
    expect(core.getSnapshot().dirty).toBe(false);
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'test',
    });
    expect(core.getSnapshot().dirty).toBe(true);
  });
});

describe('setCellFormula', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should set cell formula', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellFormula',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      formula: '=SUM(B1:B10)',
    });

    const snap = core.getSnapshot();
    const cell = snap.document.workbook.sheets[0].cells?.['A1'];
    expect(cell?.formula).toBe('=SUM(B1:B10)');
  });

  it('should remove formula when undefined', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellFormula',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      formula: '=SUM(B1:B10)',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellFormula',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      formula: undefined,
    });

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.formula).toBeUndefined();
  });
});

describe('setCellStyle', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should set style for single cell', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellStyle',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      styleId: 'bold',
    });

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.styleId).toBe('bold');
  });

  it('should set style for range', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellStyle',
      target: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
      styleId: 'highlight',
    });

    const snap = core.getSnapshot();
    const cells = snap.document.workbook.sheets[0].cells;
    expect(cells?.['A1']?.styleId).toBe('highlight');
    expect(cells?.['A2']?.styleId).toBe('highlight');
    expect(cells?.['B1']?.styleId).toBe('highlight');
    expect(cells?.['B2']?.styleId).toBe('highlight');
  });
});

describe('merge/unmerge', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should merge range', async () => {
    await core.dispatch({
      type: 'spreadsheet:mergeRange',
      range: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
    });

    const snap = core.getSnapshot();
    const merges = snap.document.workbook.sheets[0].merges;
    expect(merges?.length).toBe(1);
    expect(merges?.[0]).toEqual({
      sheetId,
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 1,
    });
  });

  it('should not add duplicate merge', async () => {
    await core.dispatch({
      type: 'spreadsheet:mergeRange',
      range: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
    });
    await core.dispatch({
      type: 'spreadsheet:mergeRange',
      range: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
    });

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].merges?.length).toBe(1);
  });

  it('should unmerge range', async () => {
    await core.dispatch({
      type: 'spreadsheet:mergeRange',
      range: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
    });
    await core.dispatch({
      type: 'spreadsheet:unmergeRange',
      range: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
    });

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].merges?.length).toBe(0);
  });

  it('should normalize inverted merge range', async () => {
    await core.dispatch({
      type: 'spreadsheet:mergeRange',
      range: { sheetId, startRow: 1, startCol: 1, endRow: 0, endCol: 0 },
    });

    const snap = core.getSnapshot();
    const merges = snap.document.workbook.sheets[0].merges;
    expect(merges?.[0]).toEqual({
      sheetId,
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 1,
    });
  });
});

describe('resizeRow/resizeColumn', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should resize row', async () => {
    await core.dispatch({
      type: 'spreadsheet:resizeRow',
      sheetId,
      row: 0,
      height: 50,
    });

    const snap = core.getSnapshot();
    const rows = snap.document.workbook.sheets[0].rows;
    expect(rows?.['0']?.height).toBe(50);
  });

  it('should resize column', async () => {
    await core.dispatch({
      type: 'spreadsheet:resizeColumn',
      sheetId,
      col: 0,
      width: 200,
    });

    const snap = core.getSnapshot();
    const cols = snap.document.workbook.sheets[0].columns;
    expect(cols?.['0']?.width).toBe(200);
  });
});

describe('hideRow/hideColumn', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should hide row', async () => {
    await core.dispatch({
      type: 'spreadsheet:hideRow',
      sheetId,
      row: 2,
      hidden: true,
    });

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].rows?.['2']?.hidden).toBe(true);
  });

  it('should show row after hiding', async () => {
    await core.dispatch({
      type: 'spreadsheet:hideRow',
      sheetId,
      row: 2,
      hidden: true,
    });
    await core.dispatch({
      type: 'spreadsheet:hideRow',
      sheetId,
      row: 2,
      hidden: false,
    });

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].rows?.['2']?.hidden).toBe(false);
  });

  it('should hide column', async () => {
    await core.dispatch({
      type: 'spreadsheet:hideColumn',
      sheetId,
      col: 3,
      hidden: true,
    });

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].columns?.['3']?.hidden).toBe(true);
  });
});

describe('addSheet/removeSheet', () => {
  let core: SpreadsheetCore;

  beforeEach(() => {
    const doc = createEmptyDocument();
    core = createSpreadsheetCore({ document: doc });
  });

  it('should add sheet', async () => {
    await core.dispatch({
      type: 'spreadsheet:addSheet',
      name: 'Data',
    });

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets.length).toBe(2);
    expect(snap.document.workbook.sheets[1].name).toBe('Data');
  });

  it('should add sheet at index', async () => {
    await core.dispatch({
      type: 'spreadsheet:addSheet',
      name: 'First',
      index: 0,
    });

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].name).toBe('First');
    expect(snap.document.workbook.sheets[1].name).toBe('Sheet1');
  });

  it('should auto-generate sheet name', async () => {
    await core.dispatch({ type: 'spreadsheet:addSheet' });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[1].name).toBe('Sheet2');
  });

  it('should remove sheet', async () => {
    await core.dispatch({ type: 'spreadsheet:addSheet', name: 'Temp' });
    const tempId = core.getSnapshot().document.workbook.sheets[1].id;
    await core.dispatch({ type: 'spreadsheet:removeSheet', sheetId: tempId });

    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets.length).toBe(1);
  });

  it('should not remove the last sheet', async () => {
    const sheetId = core.getSnapshot().document.workbook.sheets[0].id;
    const result = await core.dispatch({ type: 'spreadsheet:removeSheet', sheetId });
    expect(result.ok).toBe(false);
  });

  it('should reset activeSheetId when removing active sheet', async () => {
    await core.dispatch({ type: 'spreadsheet:addSheet', name: 'Temp' });
    const tempId = core.getSnapshot().document.workbook.sheets[1].id;
    await core.dispatch({ type: 'spreadsheet:setActiveSheet', sheetId: tempId });
    await core.dispatch({ type: 'spreadsheet:removeSheet', sheetId: tempId });

    const snap = core.getSnapshot();
    expect(snap.activeSheetId).toBe(snap.document.workbook.sheets[0].id);
  });
});
