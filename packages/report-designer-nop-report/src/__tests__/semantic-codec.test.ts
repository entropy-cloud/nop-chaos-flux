import { describe, expect, it } from 'vitest';
import type { ReportSemanticDocument } from '@nop-chaos/report-designer-core';
import { createSemanticCodec } from '../index.js';

function sampleSemantic(): ReportSemanticDocument {
  return {
    workbookMeta: {
      'nop-report': { model: { exportFormat: 'xlsx', extUnknownWorkbookModelField: { k: 1 } } },
      'other-profile': { custom: 'kept' },
    },
    sheetMeta: {
      'sheet-main': {
        'nop-report': { model: { pageSetup: 'A4' }, repeatSetting: 'rows' },
      },
    },
    rowMeta: { 'sheet-main': { '3': { band: 'detail' } } },
    columnMeta: { 'sheet-main': { '1': { width: 'expand' } } },
    cellMeta: {
      'sheet-main': {
        B2: {
          'nop-report': {
            model: {
              field: 'orderId',
              ds: 'orders',
              expandType: 'r',
              expandExpr: '${ds.filter(x => x.amount > 100)}',
              valueExpr: '${field}',
              formatExpr: '${value}',
              styleIdExpr: "${value > 1000 ? 'hi' : 'norm'}",
              linkExpr: '${linkUrl}',
              rowParent: 'A3',
              colParent: 'B1',
              exportFormula: '=SUM(C1:C9)',
              editorId: 'ed-1',
              viewerId: 'vw-1',
              extUnknownCellModelField: { nested: true },
            },
          },
          'other-profile': { note: 'kept' },
        },
      },
    },
    rangeMeta: {
      'sheet-main': [
        {
          id: 'sheet-main:0:0:2:2',
          range: { sheetId: 'sheet-main', startRow: 0, startCol: 0, endRow: 2, endCol: 2 },
          meta: { 'nop-report': { model: { zone: 'header' } } },
        },
      ],
    },
  };
}

describe('ReportSemanticCodec round-trip', () => {
  const codec = createSemanticCodec();

  it('preserves workbook/sheet/cell XPT models through round-trip', () => {
    const like = codec.exportSemantic(sampleSemantic())!;
    const restored = codec.importSemantic(like)!;

    expect(restored.workbookMeta?.['nop-report']).toEqual({
      model: { exportFormat: 'xlsx', extUnknownWorkbookModelField: { k: 1 } },
    });
    expect((restored.sheetMeta?.['sheet-main']?.['nop-report'] as Record<string, unknown>)?.model).toEqual({ pageSetup: 'A4' });
    const cellModel = (restored.cellMeta?.['sheet-main']?.B2?.['nop-report'] as Record<
      string,
      unknown
    >)?.model as Record<string, unknown>;
    expect(cellModel.field).toBe('orderId');
    expect(cellModel.ds).toBe('orders');
    expect(cellModel.expandType).toBe('r');
    expect(cellModel.rowParent).toBe('A3');
    expect(cellModel.colParent).toBe('B1');
    expect(cellModel.exportFormula).toBe('=SUM(C1:C9)');
    expect(cellModel.editorId).toBe('ed-1');
    expect(cellModel.viewerId).toBe('vw-1');
  });

  it('preserves unknown XPT model fields (discriminating: inspector-trimming model export fails here)', () => {
    const like = codec.exportSemantic(sampleSemantic())!;
    const cellModel = like.sheets!['sheet-main']!.cells!.B2!.model as Record<string, unknown>;
    expect(cellModel.extUnknownCellModelField).toEqual({ nested: true });
    void cellModel;
    expect(like.model!.extUnknownWorkbookModelField).toEqual({ k: 1 });

    const restored = codec.importSemantic(JSON.parse(JSON.stringify(like)))!;
    expect(
      ((restored.cellMeta?.['sheet-main']?.B2?.['nop-report'] as Record<string, unknown>)?.model as Record<string, unknown>)
        .extUnknownCellModelField,
    ).toEqual({ nested: true });
  });

  it('preserves raw rowParent/colParent original string representation without normalization', () => {
    const like = codec.exportSemantic(sampleSemantic())!;
    const model = like.sheets!['sheet-main']!.cells!.B2!.model as Record<string, unknown>;
    expect(model.rowParent).toBe('A3');
    expect(model.colParent).toBe('B1');
  });

  it('preserves non-nop-report namespaces and row/column/range meta via raw', () => {
    const original = sampleSemantic();
    const like = codec.exportSemantic(original)!;

    expect(like.raw?.namespaces).toEqual({ 'other-profile': { custom: 'kept' } });
    expect(like.raw?.rowMeta).toEqual(original.rowMeta);
    expect(like.raw?.columnMeta).toEqual(original.columnMeta);
    expect(like.raw?.rangeMeta).toEqual(original.rangeMeta);
    expect(like.sheets!['sheet-main']!.raw).toEqual({
      namespaces: { repeatSetting: 'rows' },
    });
    expect(like.sheets!['sheet-main']!.cells!.B2!.raw).toEqual({
      namespaces: { 'other-profile': { note: 'kept' } },
    });

    const restored = codec.importSemantic(JSON.parse(JSON.stringify(like)))!;
    expect(restored.workbookMeta?.['other-profile']).toEqual({ custom: 'kept' });
    expect(restored.rowMeta).toEqual(original.rowMeta);
    expect(restored.columnMeta).toEqual(original.columnMeta);
    expect(restored.rangeMeta).toEqual(original.rangeMeta);
    expect(restored.sheetMeta?.['sheet-main']?.repeatSetting).toBe('rows');
    expect((restored.cellMeta?.['sheet-main']?.B2?.['other-profile'] as Record<string, unknown>)?.note).toBe('kept');
  });

  it('returns undefined for non-record input and undefined document export', () => {
    expect(codec.importSemantic(undefined)).toBeUndefined();
    expect(codec.exportSemantic(undefined)).toBeUndefined();
  });

  it('imports an empty xpt layer into an empty semantic document', () => {
    const restored = codec.importSemantic({})!;
    expect(restored.workbookMeta).toEqual({});
    expect(restored.cellMeta).toEqual({});
  });
});
