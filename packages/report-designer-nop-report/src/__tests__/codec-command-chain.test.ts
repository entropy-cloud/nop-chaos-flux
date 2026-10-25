import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerProfile,
} from '@nop-chaos/report-designer-core';
import {
  NOP_REPORT_TEMPLATE_FORMAT,
  createNopReportTemplateCodec,
  type NopReportTemplateEnvelope,
} from '../index.js';

function sampleEnvelope(): NopReportTemplateEnvelope {
  return {
    format: NOP_REPORT_TEMPLATE_FORMAT,
    version: '1.0.0',
    workbook: {
      sheets: [
        {
          id: 'sheet-main',
          name: 'Main',
          cells: {
            A1: { value: 'Total', raw: { rowIndex: 0, colIndex: 0 } },
          },
        },
      ],
      raw: { order: 0, documentId: 'imported-1', documentKind: 'spreadsheet', documentName: 'Imported Report', documentVersion: '1.0.0' },
    },
    xpt: {
      model: { exportFormat: 'xlsx' },
      sheets: {
        'sheet-main': {
          cells: { A1: { model: { field: 'amount', ds: 'orders', expandType: 'r' } } },
        },
      },
    },
  };
}

const nopProfile: ReportDesignerProfile = {
  id: 'nop-report-default',
  kind: 'nop-report',
  fieldSourceIds: [],
  fieldDropIds: [],
  codecId: 'nop-report-xpt-codec',
};

describe('nop-report codec over the importTemplate/exportTemplate command chain', () => {
  it('imports an envelope into the live document through report-designer:importTemplate', async () => {
    const core = createReportDesignerCore({
      document: createReportTemplateDocument(createEmptyDocument(), 'Original'),
      config: { kind: 'nop-report' },
      profile: nopProfile,
    });
    core.registerCodec(createNopReportTemplateCodec());

    const result = await core.dispatch({
      type: 'report-designer:importTemplate',
      payload: sampleEnvelope(),
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    const document = core.getSnapshot().document;
    expect(document.name).toBe('Imported Report');
    expect(document.spreadsheet.workbook.sheets[0].cells!.A1!.value).toBe('Total');
    expect(
      (document.semantic!.cellMeta!['sheet-main'].A1['nop-report'] as Record<string, unknown>)?.model,
    ).toEqual({ field: 'amount', ds: 'orders', expandType: 'r' });
  });

  it('exports the live document as a nop-report envelope through report-designer:exportTemplate', async () => {
    const core = createReportDesignerCore({
      document: createReportTemplateDocument(createEmptyDocument(), 'Original'),
      config: { kind: 'nop-report' },
      profile: nopProfile,
    });
    core.registerCodec(createNopReportTemplateCodec());

    const result = await core.dispatch({ type: 'report-designer:exportTemplate' });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(false);
    const envelope = result.data as NopReportTemplateEnvelope;
    expect(envelope.format).toBe(NOP_REPORT_TEMPLATE_FORMAT);
    expect(Array.isArray(envelope.workbook.sheets)).toBe(true);

    // 导出信封可再次导入（round-trip 前提）
    const reimport = await core.dispatch({
      type: 'report-designer:importTemplate',
      payload: envelope,
    });
    expect(reimport.ok).toBe(true);
  });

  it('keeps the noCodecConfigured failure path for profiles without a codec', async () => {
    const core = createReportDesignerCore({
      document: createReportTemplateDocument(createEmptyDocument(), 'Original'),
      config: { kind: 'other-kind' },
      profile: {
        id: 'p2',
        kind: 'other-kind',
        fieldSourceIds: [],
        fieldDropIds: [],
      },
    });

    const result = await core.dispatch({
      type: 'report-designer:importTemplate',
      payload: sampleEnvelope(),
    });
    expect(result.ok).toBe(false);
    expect(result.changed).toBe(false);
    expect((result.error as Error).message).toMatch(/编解码器|codec/i);
  });
});
