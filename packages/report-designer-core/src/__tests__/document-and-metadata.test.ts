import { describe, it, expect } from 'vitest';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportTemplateDocument,
  createDefaultSemantic,
  getDefaultSelectionTarget,
  getCellMeta,
  setCellMeta,
  updateCellMeta,
  getRowMeta,
  setRowMeta,
  updateRowMeta,
  getColumnMeta,
  setColumnMeta,
  updateColumnMeta,
  getSheetMeta,
  setSheetMeta,
  updateSheetMeta,
  setRangeMeta,
  getTargetMeta,
  isSameTarget,
  type ReportSemanticDocument,
} from '../index.js';

describe('createReportTemplateDocument', () => {
  it('should create a report template from spreadsheet', () => {
    const spreadsheet = createEmptyDocument();
    const report = createReportTemplateDocument(spreadsheet, 'My Report');

    expect(report.kind).toBe('report-template');
    expect(report.name).toBe('My Report');
    expect(report.spreadsheet).toBe(spreadsheet);
    expect(report.semantic).toBeDefined();
  });

  it('should use default name if not provided', () => {
    const spreadsheet = createEmptyDocument();
    const report = createReportTemplateDocument(spreadsheet);

    expect(report.name).toBe('Untitled Report');
  });
});

describe('getDefaultSelectionTarget', () => {
  it('should select first sheet when sheets exist', () => {
    const spreadsheet = createEmptyDocument();
    const report = createReportTemplateDocument(spreadsheet);
    const target = getDefaultSelectionTarget(report);

    expect(target.kind).toBe('sheet');
    expect(target).toHaveProperty('sheetId');
  });

  it('should select workbook when no sheets exist', () => {
    const spreadsheet = createEmptyDocument();
    spreadsheet.workbook.sheets = [];
    const report = createReportTemplateDocument(spreadsheet);
    const target = getDefaultSelectionTarget(report);

    expect(target.kind).toBe('workbook');
  });
});

describe('MetadataBag operations', () => {
  it('getCellMeta should return undefined for missing cell', () => {
    const semantic = createDefaultSemantic();
    expect(getCellMeta(semantic, 'sheet1', 'A1')).toBeUndefined();
  });

  it('setCellMeta should set cell metadata', () => {
    let semantic = createDefaultSemantic();
    semantic = setCellMeta(semantic, 'sheet1', 'A1', { field: 'amount', ds: 'orders' });

    expect(getCellMeta(semantic, 'sheet1', 'A1')).toEqual({
      field: 'amount',
      ds: 'orders',
    });
  });

  it('updateCellMeta should merge with existing', () => {
    let semantic = createDefaultSemantic();
    semantic = setCellMeta(semantic, 'sheet1', 'A1', { field: 'amount' });
    semantic = updateCellMeta(semantic, 'sheet1', 'A1', { ds: 'orders' });

    expect(getCellMeta(semantic, 'sheet1', 'A1')).toEqual({
      field: 'amount',
      ds: 'orders',
    });
  });

  it('updateCellMeta should deep merge nested objects', () => {
    let semantic = createDefaultSemantic();
    semantic = setCellMeta(semantic, 'sheet1', 'A1', {
      'nop-report': { model: { field: 'amount' } },
    });
    semantic = updateCellMeta(semantic, 'sheet1', 'A1', {
      'nop-report': { model: { ds: 'orders' } },
    });

    const meta = getCellMeta(semantic, 'sheet1', 'A1');
    expect(meta).toEqual({
      'nop-report': { model: { field: 'amount', ds: 'orders' } },
    });
  });

  it('getRowMeta should return undefined for missing row', () => {
    const semantic = createDefaultSemantic();
    expect(getRowMeta(semantic, 'sheet1', 0)).toBeUndefined();
  });

  it('setRowMeta should set row metadata', () => {
    let semantic = createDefaultSemantic();
    semantic = setRowMeta(semantic, 'sheet1', 0, { height: 30 });

    expect(getRowMeta(semantic, 'sheet1', 0)).toEqual({ height: 30 });
  });

  it('updateRowMeta should merge with existing', () => {
    let semantic = createDefaultSemantic();
    semantic = setRowMeta(semantic, 'sheet1', 0, { height: 30 });
    semantic = updateRowMeta(semantic, 'sheet1', 0, { label: 'Header' });

    expect(getRowMeta(semantic, 'sheet1', 0)).toEqual({
      height: 30,
      label: 'Header',
    });
  });

  it('getColumnMeta should return undefined for missing column', () => {
    const semantic = createDefaultSemantic();
    expect(getColumnMeta(semantic, 'sheet1', 0)).toBeUndefined();
  });

  it('setColumnMeta should set column metadata', () => {
    let semantic = createDefaultSemantic();
    semantic = setColumnMeta(semantic, 'sheet1', 0, { width: 100 });

    expect(getColumnMeta(semantic, 'sheet1', 0)).toEqual({ width: 100 });
  });

  it('updateColumnMeta should merge with existing', () => {
    let semantic = createDefaultSemantic();
    semantic = setColumnMeta(semantic, 'sheet1', 0, { width: 100 });
    semantic = updateColumnMeta(semantic, 'sheet1', 0, { label: 'Name' });

    expect(getColumnMeta(semantic, 'sheet1', 0)).toEqual({
      width: 100,
      label: 'Name',
    });
  });

  it('getSheetMeta should return undefined for missing sheet', () => {
    const semantic = createDefaultSemantic();
    expect(getSheetMeta(semantic, 'sheet1')).toBeUndefined();
  });

  it('setSheetMeta should set sheet metadata', () => {
    let semantic = createDefaultSemantic();
    semantic = setSheetMeta(semantic, 'sheet1', { title: 'Data Sheet' });

    expect(getSheetMeta(semantic, 'sheet1')).toEqual({ title: 'Data Sheet' });
  });

  it('updateSheetMeta should merge with existing', () => {
    let semantic = createDefaultSemantic();
    semantic = setSheetMeta(semantic, 'sheet1', { title: 'Data' });
    semantic = updateSheetMeta(semantic, 'sheet1', { subtitle: 'Sub' });

    expect(getSheetMeta(semantic, 'sheet1')).toEqual({
      title: 'Data',
      subtitle: 'Sub',
    });
  });

  it('setRangeMeta should add range metadata', () => {
    let semantic = createDefaultSemantic();
    semantic = setRangeMeta(semantic, 'sheet1', {
      id: 'range1',
      range: { sheetId: 'sheet1', startRow: 0, startCol: 0, endRow: 2, endCol: 2 },
      meta: { type: 'table' },
    });

    const rangeMeta = semantic.rangeMeta?.['sheet1'];
    expect(rangeMeta?.length).toBe(1);
    expect(rangeMeta?.[0].meta).toEqual({ type: 'table' });
  });

  it('setRangeMeta should update existing range by id', () => {
    let semantic = createDefaultSemantic();
    semantic = setRangeMeta(semantic, 'sheet1', {
      id: 'range1',
      range: { sheetId: 'sheet1', startRow: 0, startCol: 0, endRow: 2, endCol: 2 },
      meta: { type: 'table' },
    });
    semantic = setRangeMeta(semantic, 'sheet1', {
      id: 'range1',
      range: { sheetId: 'sheet1', startRow: 0, startCol: 0, endRow: 2, endCol: 2 },
      meta: { type: 'chart' },
    });

    const rangeMeta = semantic.rangeMeta?.['sheet1'];
    expect(rangeMeta?.length).toBe(1);
    expect(rangeMeta?.[0].meta).toEqual({ type: 'chart' });
  });
});

describe('getTargetMeta', () => {
  it('should get workbook meta', () => {
    const semantic: ReportSemanticDocument = {
      workbookMeta: { title: 'Report' },
    };
    expect(getTargetMeta(semantic, { kind: 'workbook' })).toEqual({ title: 'Report' });
  });

  it('should get sheet meta', () => {
    const semantic = setSheetMeta(createDefaultSemantic(), 's1', { name: 'Data' });
    expect(getTargetMeta(semantic, { kind: 'sheet', sheetId: 's1' })).toEqual({ name: 'Data' });
  });

  it('should get row meta', () => {
    let semantic = createDefaultSemantic();
    semantic = setRowMeta(semantic, 's1', 0, { label: 'Header' });
    expect(getTargetMeta(semantic, { kind: 'row', sheetId: 's1', row: 0 })).toEqual({
      label: 'Header',
    });
  });

  it('should get column meta', () => {
    let semantic = createDefaultSemantic();
    semantic = setColumnMeta(semantic, 's1', 0, { width: 100 });
    expect(getTargetMeta(semantic, { kind: 'column', sheetId: 's1', col: 0 })).toEqual({
      width: 100,
    });
  });

  it('should get cell meta', () => {
    let semantic = createDefaultSemantic();
    semantic = setCellMeta(semantic, 's1', 'A1', { field: 'x' });
    expect(
      getTargetMeta(semantic, {
        kind: 'cell',
        cell: { sheetId: 's1', address: 'A1', row: 0, col: 0 },
      }),
    ).toEqual({ field: 'x' });
  });

  it('should return undefined for unknown target', () => {
    expect(getTargetMeta(undefined, { kind: 'row', sheetId: 's1', row: 0 })).toBeUndefined();
  });
});

describe('isSameTarget', () => {
  it('should match workbook targets', () => {
    expect(isSameTarget({ kind: 'workbook' }, { kind: 'workbook' })).toBe(true);
  });

  it('should match sheet targets', () => {
    expect(isSameTarget({ kind: 'sheet', sheetId: 's1' }, { kind: 'sheet', sheetId: 's1' })).toBe(
      true,
    );
  });

  it('should not match different sheets', () => {
    expect(isSameTarget({ kind: 'sheet', sheetId: 's1' }, { kind: 'sheet', sheetId: 's2' })).toBe(
      false,
    );
  });

  it('should match cell targets', () => {
    const cell = { sheetId: 's1', address: 'A1', row: 0, col: 0 };
    expect(isSameTarget({ kind: 'cell', cell }, { kind: 'cell', cell })).toBe(true);
  });

  it('should not match different cell positions', () => {
    const a = { sheetId: 's1', address: 'A1', row: 0, col: 0 };
    const b = { sheetId: 's1', address: 'B1', row: 0, col: 1 };
    expect(isSameTarget({ kind: 'cell', cell: a }, { kind: 'cell', cell: b })).toBe(false);
  });

  it('should not match different kinds', () => {
    expect(isSameTarget({ kind: 'workbook' }, { kind: 'sheet', sheetId: 's1' })).toBe(false);
  });

  it('should match row targets', () => {
    expect(
      isSameTarget({ kind: 'row', sheetId: 's1', row: 0 }, { kind: 'row', sheetId: 's1', row: 0 }),
    ).toBe(true);
  });

  it('should match column targets', () => {
    expect(
      isSameTarget(
        { kind: 'column', sheetId: 's1', col: 0 },
        { kind: 'column', sheetId: 's1', col: 0 },
      ),
    ).toBe(true);
  });
});
