import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSpreadsheetCore,
  createEmptyDocument,
  type SpreadsheetCore,
} from './index.js';

describe('clipboard operations', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(async () => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
    // Set up some test data
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A1', row: 0, col: 0 }, value: 'A' });
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'B1', row: 0, col: 1 }, value: 'B' });
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A2', row: 1, col: 0 }, value: 'C' });
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'B2', row: 1, col: 1 }, value: 'D' });
  });

  it('should copy cells', async () => {
    const result = await core.dispatch({
      type: 'spreadsheet:copyCells',
      range: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
    });
    expect(result.ok).toBe(true);
    expect(core.getClipboard()).not.toBeNull();
    expect(core.getClipboard()?.type).toBe('copy');
  });

  it('should cut cells', async () => {
    const result = await core.dispatch({
      type: 'spreadsheet:cutCells',
      range: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
    });
    expect(result.ok).toBe(true);
    expect(core.getClipboard()?.type).toBe('cut');
  });

  it('should paste cells', async () => {
    await core.dispatch({
      type: 'spreadsheet:copyCells',
      range: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
    });
    const result = await core.dispatch({
      type: 'spreadsheet:pasteCells',
      target: { sheetId, address: 'D1', row: 0, col: 3 },
    });
    expect(result.ok).toBe(true);
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['D1']?.value).toBe('A');
    expect(snap.document.workbook.sheets[0].cells?.['E1']?.value).toBe('B');
    expect(snap.document.workbook.sheets[0].cells?.['D2']?.value).toBe('C');
    expect(snap.document.workbook.sheets[0].cells?.['E2']?.value).toBe('D');
  });

  it('should cut and paste (move)', async () => {
    await core.dispatch({
      type: 'spreadsheet:cutCells',
      range: { sheetId, startRow: 0, startCol: 0, endRow: 0, endCol: 1 },
    });
    // Source cells should still exist before paste
    expect(core.getSnapshot().document.workbook.sheets[0].cells?.['A1']?.value).toBe('A');

    await core.dispatch({
      type: 'spreadsheet:pasteCells',
      target: { sheetId, address: 'A3', row: 2, col: 0 },
    });
    const snap = core.getSnapshot();
    // New location should have values
    expect(snap.document.workbook.sheets[0].cells?.['A3']?.value).toBe('A');
    expect(snap.document.workbook.sheets[0].cells?.['B3']?.value).toBe('B');
    // Clipboard should be cleared after cut-paste
    expect(core.getClipboard()).toBeNull();
  });

  it('should fail paste when clipboard is empty', async () => {
    const result = await core.dispatch({
      type: 'spreadsheet:pasteCells',
      target: { sheetId, address: 'D1', row: 0, col: 3 },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Clipboard is empty');
  });

  it('should clear cells', async () => {
    const result = await core.dispatch({
      type: 'spreadsheet:clearCells',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
    });
    expect(result.ok).toBe(true);
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.value).toBeUndefined();
  });

  it('should clear range of cells', async () => {
    await core.dispatch({
      type: 'spreadsheet:clearCells',
      target: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
    });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.value).toBeUndefined();
    expect(snap.document.workbook.sheets[0].cells?.['B2']?.value).toBeUndefined();
  });
});

describe('insert/delete row/column', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(async () => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A1', row: 0, col: 0 }, value: 'A1' });
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A2', row: 1, col: 0 }, value: 'A2' });
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'B1', row: 0, col: 1 }, value: 'B1' });
  });

  it('should insert row', async () => {
    await core.dispatch({ type: 'spreadsheet:insertRow', sheetId, row: 1 });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.value).toBe('A1');
    expect(snap.document.workbook.sheets[0].cells?.['A2']).toBeUndefined(); // Inserted empty row
    expect(snap.document.workbook.sheets[0].cells?.['A3']?.value).toBe('A2'); // Shifted down
  });

  it('should insert column', async () => {
    await core.dispatch({ type: 'spreadsheet:insertColumn', sheetId, col: 1 });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.value).toBe('A1');
    expect(snap.document.workbook.sheets[0].cells?.['B1']).toBeUndefined();
    expect(snap.document.workbook.sheets[0].cells?.['C1']?.value).toBe('B1');
  });

  it('should delete row', async () => {
    await core.dispatch({ type: 'spreadsheet:deleteRow', sheetId, row: 0 });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.value).toBe('A2'); // Shifted up
    expect(snap.document.workbook.sheets[0].cells?.['B1']).toBeUndefined(); // Was B1, now gone
  });

  it('should delete column', async () => {
    await core.dispatch({ type: 'spreadsheet:deleteColumn', sheetId, col: 0 });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.value).toBe('B1'); // Shifted left
  });

  it('should insert multiple rows', async () => {
    await core.dispatch({ type: 'spreadsheet:insertRow', sheetId, row: 1, count: 3 });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.value).toBe('A1');
    expect(snap.document.workbook.sheets[0].cells?.['A5']?.value).toBe('A2');
  });
});

describe('sheet operations', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should rename sheet', async () => {
    const result = await core.dispatch({
      type: 'spreadsheet:renameSheet',
      sheetId,
      name: 'Data',
    });
    expect(result.ok).toBe(true);
    expect(core.getSnapshot().document.workbook.sheets[0].name).toBe('Data');
  });

  it('should move sheet', async () => {
    await core.dispatch({ type: 'spreadsheet:addSheet', name: 'Sheet2' });
    const sheet2Id = core.getSnapshot().document.workbook.sheets[1].id;
    await core.dispatch({ type: 'spreadsheet:moveSheet', sheetId: sheet2Id, targetIndex: 0 });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].name).toBe('Sheet2');
    expect(snap.document.workbook.sheets[1].name).toBe('Sheet1');
  });
});

describe('selection commands', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should select all', async () => {
    await core.dispatch({ type: 'spreadsheet:selectAll', sheetId });
    const snap = core.getSnapshot();
    expect(snap.selection.kind).toBe('sheet');
  });

  it('should select row', async () => {
    await core.dispatch({ type: 'spreadsheet:selectRow', sheetId, row: 2 });
    const snap = core.getSnapshot();
    expect(snap.selection.kind).toBe('row');
    expect(snap.selection.rows).toEqual([2]);
  });

  it('should extend row selection', async () => {
    await core.dispatch({ type: 'spreadsheet:selectRow', sheetId, row: 1 });
    await core.dispatch({ type: 'spreadsheet:selectRow', sheetId, row: 3, extend: true });
    const snap = core.getSnapshot();
    expect(snap.selection.rows).toEqual([1, 3]);
  });

  it('should select column', async () => {
    await core.dispatch({ type: 'spreadsheet:selectColumn', sheetId, col: 2 });
    const snap = core.getSnapshot();
    expect(snap.selection.kind).toBe('column');
    expect(snap.selection.columns).toEqual([2]);
  });
});

describe('cell style commands', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should set font family', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellFontFamily',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      fontFamily: 'Arial',
    });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.style?.fontFamily).toBe('Arial');
  });

  it('should set font size', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellFontSize',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      fontSize: 14,
    });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.style?.fontSize).toBe(14);
  });

  it('should set font weight bold', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellFontWeight',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      fontWeight: 'bold',
    });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.style?.fontWeight).toBe('bold');
  });

  it('should set font color', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellFontColor',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      color: '#ff0000',
    });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.style?.fontColor).toBe('#ff0000');
  });

  it('should set background color', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellBackgroundColor',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      color: '#ffff00',
    });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.style?.backgroundColor).toBe('#ffff00');
  });

  it('should set text align', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellTextAlign',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      textAlign: 'center',
    });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.style?.textAlign).toBe('center');
  });

  it('should set wrap text', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellWrapText',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      wrapText: true,
    });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.style?.wrapText).toBe(true);
  });

  it('should set style on range', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellBackgroundColor',
      target: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
      color: '#eee',
    });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.style?.backgroundColor).toBe('#eee');
    expect(snap.document.workbook.sheets[0].cells?.['B2']?.style?.backgroundColor).toBe('#eee');
  });

  it('should set border', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellBorder',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      border: 'all',
      color: '#000',
      width: 2,
    });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.style?.borderStyle).toBe('all');
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.style?.borderColor).toBe('#000');
  });
});

describe('fill commands', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(async () => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A1', row: 0, col: 0 }, value: 'Header' });
  });

  it('should fill down', async () => {
    await core.dispatch({
      type: 'spreadsheet:fillDown',
      range: { sheetId, startRow: 0, startCol: 0, endRow: 3, endCol: 0 },
    });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.value).toBe('Header');
    expect(snap.document.workbook.sheets[0].cells?.['A2']?.value).toBe('Header');
    expect(snap.document.workbook.sheets[0].cells?.['A3']?.value).toBe('Header');
    expect(snap.document.workbook.sheets[0].cells?.['A4']?.value).toBe('Header');
  });

  it('should fill right', async () => {
    await core.dispatch({
      type: 'spreadsheet:fillRight',
      range: { sheetId, startRow: 0, startCol: 0, endRow: 0, endCol: 3 },
    });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.value).toBe('Header');
    expect(snap.document.workbook.sheets[0].cells?.['B1']?.value).toBe('Header');
    expect(snap.document.workbook.sheets[0].cells?.['C1']?.value).toBe('Header');
    expect(snap.document.workbook.sheets[0].cells?.['D1']?.value).toBe('Header');
  });
});

describe('comment commands', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should add comment', async () => {
    await core.dispatch({
      type: 'spreadsheet:addComment',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      text: 'This is a note',
      author: 'Test User',
    });
    const snap = core.getSnapshot();
    const comment = snap.document.workbook.sheets[0].cells?.['A1']?.comment;
    expect(typeof comment).toBe('object');
    expect((comment as any)?.text).toBe('This is a note');
    expect((comment as any)?.author).toBe('Test User');
  });

  it('should edit comment', async () => {
    await core.dispatch({
      type: 'spreadsheet:addComment',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      text: 'Original',
    });
    await core.dispatch({
      type: 'spreadsheet:editComment',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      text: 'Updated',
    });
    const snap = core.getSnapshot();
    const comment = snap.document.workbook.sheets[0].cells?.['A1']?.comment;
    expect((comment as any)?.text).toBe('Updated');
  });

  it('should delete comment', async () => {
    await core.dispatch({
      type: 'spreadsheet:addComment',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      text: 'Delete me',
    });
    await core.dispatch({
      type: 'spreadsheet:deleteComment',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
    });
    const snap = core.getSnapshot();
    expect(snap.document.workbook.sheets[0].cells?.['A1']?.comment).toBeUndefined();
  });
});

describe('undo/redo with new operations', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should undo paste', async () => {
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A1', row: 0, col: 0 }, value: 'X' });
    await core.dispatch({ type: 'spreadsheet:copyCells', range: { sheetId, startRow: 0, startCol: 0, endRow: 0, endCol: 0 } });
    await core.dispatch({ type: 'spreadsheet:pasteCells', target: { sheetId, address: 'B1', row: 0, col: 1 } });
    expect(core.getSnapshot().document.workbook.sheets[0].cells?.['B1']?.value).toBe('X');

    await core.dispatch({ type: 'spreadsheet:undo' });
    expect(core.getSnapshot().document.workbook.sheets[0].cells?.['B1']).toBeUndefined();
  });

  it('should undo insert row', async () => {
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A1', row: 0, col: 0 }, value: 'A1' });
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A2', row: 1, col: 0 }, value: 'A2' });
    await core.dispatch({ type: 'spreadsheet:insertRow', sheetId, row: 1 });
    expect(core.getSnapshot().document.workbook.sheets[0].cells?.['A3']?.value).toBe('A2');

    await core.dispatch({ type: 'spreadsheet:undo' });
    expect(core.getSnapshot().document.workbook.sheets[0].cells?.['A2']?.value).toBe('A2');
  });

  it('should undo style change', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellBackgroundColor',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      color: '#ff0000',
    });
    expect(core.getSnapshot().document.workbook.sheets[0].cells?.['A1']?.style?.backgroundColor).toBe('#ff0000');

    await core.dispatch({ type: 'spreadsheet:undo' });
    expect(core.getSnapshot().document.workbook.sheets[0].cells?.['A1']?.style?.backgroundColor).toBeUndefined();
  });

  it('should redo paste after undo', async () => {
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A1', row: 0, col: 0 }, value: 'R' });
    await core.dispatch({ type: 'spreadsheet:copyCells', range: { sheetId, startRow: 0, startCol: 0, endRow: 0, endCol: 0 } });
    await core.dispatch({ type: 'spreadsheet:pasteCells', target: { sheetId, address: 'B1', row: 0, col: 1 } });
    await core.dispatch({ type: 'spreadsheet:undo' });
    await core.dispatch({ type: 'spreadsheet:redo' });

    expect(core.getSnapshot().document.workbook.sheets[0].cells?.['B1']?.value).toBe('R');
  });

  it('should undo delete row', async () => {
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A1', row: 0, col: 0 }, value: 'A1' });
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A2', row: 1, col: 0 }, value: 'A2' });
    await core.dispatch({ type: 'spreadsheet:deleteRow', sheetId, row: 0 });

    expect(core.getSnapshot().document.workbook.sheets[0].cells?.['A1']?.value).toBe('A2');
    await core.dispatch({ type: 'spreadsheet:undo' });
    expect(core.getSnapshot().document.workbook.sheets[0].cells?.['A1']?.value).toBe('A1');
  });
});

describe('edge cases', () => {
  let core: SpreadsheetCore;
  let sheetId: string;

  beforeEach(() => {
    const doc = createEmptyDocument();
    sheetId = doc.workbook.sheets[0].id;
    core = createSpreadsheetCore({ document: doc });
  });

  it('should handle paste with styles', async () => {
    await core.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
      value: 'Styled',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellBackgroundColor',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      color: '#ffff00',
    });
    await core.dispatch({
      type: 'spreadsheet:setCellFontWeight',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      fontWeight: 'bold',
    });

    await core.dispatch({ type: 'spreadsheet:copyCells', range: { sheetId, startRow: 0, startCol: 0, endRow: 0, endCol: 0 } });
    await core.dispatch({ type: 'spreadsheet:pasteCells', target: { sheetId, address: 'B1', row: 0, col: 1 } });

    const cell = core.getSnapshot().document.workbook.sheets[0].cells?.['B1'];
    expect(cell?.value).toBe('Styled');
    expect(cell?.style?.backgroundColor).toBe('#ffff00');
    expect(cell?.style?.fontWeight).toBe('bold');
  });

  it('should fill down with style', async () => {
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A1', row: 0, col: 0 }, value: 'Header' });
    await core.dispatch({ type: 'spreadsheet:setCellFontWeight', target: { sheetId, address: 'A1', row: 0, col: 0 }, fontWeight: 'bold' });
    await core.dispatch({ type: 'spreadsheet:setCellBackgroundColor', target: { sheetId, address: 'A1', row: 0, col: 0 }, color: '#ccc' });

    await core.dispatch({ type: 'spreadsheet:fillDown', range: { sheetId, startRow: 0, startCol: 0, endRow: 2, endCol: 0 } });

    const cells = core.getSnapshot().document.workbook.sheets[0].cells;
    expect(cells?.['A2']?.value).toBe('Header');
    expect(cells?.['A2']?.style?.fontWeight).toBe('bold');
    expect(cells?.['A2']?.style?.backgroundColor).toBe('#ccc');
  });

  it('should not allow delete last sheet', async () => {
    const sheetId = core.getSnapshot().document.workbook.sheets[0].id;
    const result = await core.dispatch({ type: 'spreadsheet:removeSheet', sheetId });
    expect(result.ok).toBe(false);
  });

  it('should handle multiple style changes on same cell', async () => {
    await core.dispatch({ type: 'spreadsheet:setCellFontFamily', target: { sheetId, address: 'A1', row: 0, col: 0 }, fontFamily: 'Arial' });
    await core.dispatch({ type: 'spreadsheet:setCellFontSize', target: { sheetId, address: 'A1', row: 0, col: 0 }, fontSize: 14 });
    await core.dispatch({ type: 'spreadsheet:setCellFontWeight', target: { sheetId, address: 'A1', row: 0, col: 0 }, fontWeight: 'bold' });
    await core.dispatch({ type: 'spreadsheet:setCellFontColor', target: { sheetId, address: 'A1', row: 0, col: 0 }, color: '#ff0000' });

    const cell = core.getSnapshot().document.workbook.sheets[0].cells?.['A1'];
    expect(cell?.style?.fontFamily).toBe('Arial');
    expect(cell?.style?.fontSize).toBe(14);
    expect(cell?.style?.fontWeight).toBe('bold');
    expect(cell?.style?.fontColor).toBe('#ff0000');
  });

  it('should preserve value when clearing only formats', async () => {
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A1', row: 0, col: 0 }, value: 'Keep' });
    await core.dispatch({ type: 'spreadsheet:setCellBackgroundColor', target: { sheetId, address: 'A1', row: 0, col: 0 }, color: '#f00' });

    await core.dispatch({
      type: 'spreadsheet:clearCells',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      clearValues: false,
      clearFormats: true,
    });

    const cell = core.getSnapshot().document.workbook.sheets[0].cells?.['A1'];
    expect(cell?.value).toBe('Keep');
    expect(cell?.style?.backgroundColor).toBeUndefined();
  });

  it('should preserve comment when clearing values', async () => {
    await core.dispatch({ type: 'spreadsheet:setCellValue', cell: { sheetId, address: 'A1', row: 0, col: 0 }, value: 'Delete' });
    await core.dispatch({ type: 'spreadsheet:addComment', cell: { sheetId, address: 'A1', row: 0, col: 0 }, text: 'Note' });

    await core.dispatch({
      type: 'spreadsheet:clearCells',
      target: { sheetId, address: 'A1', row: 0, col: 0 },
      clearValues: true,
      clearComments: false,
    });

    const cell = core.getSnapshot().document.workbook.sheets[0].cells?.['A1'];
    expect(cell?.value).toBeUndefined();
    expect((cell?.comment as any)?.text).toBe('Note');
  });
});
