import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSpreadsheetCore,
  createEmptyDocument,
  type SpreadsheetCore,
} from '../index.js';

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
