import { describe, expect, it } from 'vitest';
import type { ReportTemplateDocument } from '@nop-chaos/report-designer-core';
import {
  CodecError,
  NOP_REPORT_TEMPLATE_FORMAT,
  createNopReportTemplateCodec,
  type NopReportTemplateEnvelope,
} from '../index.js';
import { createSpreadsheetCodec } from '../index.js';

function sampleDocument(): ReportTemplateDocument {
  const spreadsheet = createSpreadsheetCodec().importSpreadsheet({
    sheets: [
      {
        id: 'sheet-main',
        name: 'Main',
        props: { pageSetup: { orientation: 'landscape' } },
        cells: {
          A1: { value: 'Title', raw: { rowIndex: 0, colIndex: 0, extUnknownCellField: 'keep' } },
          B2: { value: 42, formula: '=A1', name: 'B2', raw: { rowIndex: 1, colIndex: 1 } },
        },
        merges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 2 }],
        raw: { order: 0 },
      },
    ],
    raw: { documentId: 'doc-1', documentKind: 'spreadsheet', documentName: 'My Report', documentVersion: '2.1.0' },
  });
  return {
    id: 'doc-1',
    kind: 'report-template',
    name: 'My Report',
    version: '2.1.0',
    spreadsheet,
    semantic: {
      workbookMeta: { 'nop-report': { model: { exportFormat: 'xlsx' } } },
      sheetMeta: {},
      cellMeta: {
        'sheet-main': {
          B2: {
            'nop-report': {
              model: { field: 'orderId', ds: 'orders', expandType: 'r', rowParent: 'A3', colParent: 'B1' },
            },
          },
        },
      },
      rangeMeta: {},
    },
  };
}

describe('NopReportTemplateCodec', () => {
  const codec = createNopReportTemplateCodec();

  it('round-trips a ReportTemplateDocument through the envelope losslessly', () => {
    const original = sampleDocument();
    const envelope = codec.exportTemplate(original);
    expect(envelope.format).toBe(NOP_REPORT_TEMPLATE_FORMAT);
    expect(envelope.version).toBe('2.1.0');

    const result = codec.importTemplate(JSON.parse(JSON.stringify(envelope)));
    expect(result.ok).toBe(true);
    const restored = result.document!;

    expect(restored.id).toBe('doc-1');
    expect(restored.name).toBe('My Report');
    expect(restored.version).toBe('2.1.0');
    expect(restored.spreadsheet.workbook.sheets[0].cells!.B2!.formula).toBe('=A1');
    expect(restored.spreadsheet.workbook.sheets[0].cells!.A1!.raw).toEqual({
      extUnknownCellField: 'keep',
    });
    expect(
      (restored.semantic!.cellMeta!['sheet-main'].B2['nop-report'] as Record<string, unknown>)?.model,
    ).toEqual({ field: 'orderId', ds: 'orders', expandType: 'r', rowParent: 'A3', colParent: 'B1' });
    expect((restored.semantic!.workbookMeta?.['nop-report'] as Record<string, unknown>)?.model).toEqual({
      exportFormat: 'xlsx',
    });
  });

  it('emits non-interrupting codec-unknown-field info diagnostics for unmodeled fields', () => {
    const envelope = codec.exportTemplate(sampleDocument());
    const result = codec.importTemplate(JSON.parse(JSON.stringify(envelope)));
    expect(result.ok).toBe(true);
    const unknown = result.diagnostics.filter((d) => d.level === 'info' && d.code === 'codec-unknown-field');
    expect(unknown.length).toBeGreaterThan(0);
    expect(unknown.some((d) => d.path?.includes('cells[A1]') && d.message.includes('extUnknownCellField'))).toBe(true);
    // XPT model 的未知字段同样报告
    const xptUnknown = unknown.filter((d) => d.path?.includes('xpt.sheets'));
    expect(xptUnknown.length).toBe(0);
  });

  it('reports unknown XPT model fields via codec-unknown-field', () => {
    const envelope = codec.exportTemplate(sampleDocument()) as NopReportTemplateEnvelope;
    envelope.xpt!.sheets!['sheet-main']!.cells!.B2!.model!.extUnknownCellModelField = { nested: true };
    const result = codec.importTemplate(envelope);
    expect(result.ok).toBe(true);
    const unknown = result.diagnostics.filter((d) => d.code === 'codec-unknown-field');
    expect(unknown.some((d) => d.path === "xpt.sheets[sheet-main].cells[B2].model" && d.message.includes('extUnknownCellModelField'))).toBe(true);
  });

  it('fails with codec-envelope-invalid diagnostics when the envelope lacks a workbook', () => {
    const result = codec.importTemplate({ format: NOP_REPORT_TEMPLATE_FORMAT });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.level === 'error' && d.code === 'codec-envelope-invalid')).toBe(true);
  });

  it('rejects wrong format with codec-envelope-invalid', () => {
    const result = codec.importTemplate({ format: 'other', workbook: { sheets: [] } });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0].code).toBe('codec-envelope-invalid');
  });

  it('degrades to a warning when the xpt layer is missing', () => {
    const envelope = {
      format: NOP_REPORT_TEMPLATE_FORMAT,
      version: '1.0.0',
      workbook: { sheets: [{ id: 's1', name: 'Sheet1' }] },
    } as const;
    const result = codec.importTemplate(envelope);
    expect(result.ok).toBe(true);
    expect(result.diagnostics.some((d) => d.level === 'warning' && d.code === 'codec-semantic-missing')).toBe(true);
    expect(result.document!.semantic!.cellMeta).toEqual({});
  });

  it('throws a structured CodecError (not a bare exception) at the adapter boundary', () => {
    expect(() => codec.importDocument({ format: 'nope' }, {} as never)).toThrowError(CodecError);
    try {
      codec.importDocument({ format: 'nope' }, {} as never);
    } catch (error) {
      expect((error as CodecError).diagnostics[0].code).toBe('codec-envelope-invalid');
    }
  });

  it('exposes the TemplateCodecAdapter surface with a stable id', () => {
    expect(codec.id).toBe('nop-report-xpt-codec');
    expect(typeof codec.importDocument).toBe('function');
    expect(typeof codec.exportDocument).toBe('function');
  });
});
