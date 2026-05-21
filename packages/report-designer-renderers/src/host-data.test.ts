import { describe, expect, it } from 'vitest';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
} from '@nop-chaos/report-designer-core';
import { buildReportDesignerScopeData } from './host-data.js';

describe('buildReportDesignerScopeData', () => {
  it('publishes designer.dirty separately from aggregated runtime.dirty', async () => {
    const spreadsheet = createEmptyDocument();
    const document = createReportTemplateDocument(spreadsheet, 'Dirty Report');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });

    await core.dispatch({
      type: 'report-designer:updateMeta',
      target: { kind: 'workbook' },
      patch: { title: 'Changed' },
    });

    const snapshot = core.getSnapshot();
    const scopeData = buildReportDesignerScopeData(core, snapshot);
    const designer = scopeData.designer as { dirty?: boolean };
    const runtime = scopeData.runtime as { dirty?: boolean };

    expect(designer.dirty).toBe(true);
    expect(runtime.dirty).toBe(true);
  });

  it('keeps canonical report designer projection vocabulary aligned', () => {
    const spreadsheet = createEmptyDocument();
    const document = createReportTemplateDocument(spreadsheet, 'Vocabulary Report');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });

    const scopeData = buildReportDesignerScopeData(core, core.getSnapshot());
    const designer = scopeData.designer as {
      inspectorPanels?: unknown;
      fieldSources?: unknown[];
      canUndo?: boolean;
      canRedo?: boolean;
    };

    expect(scopeData).toHaveProperty('selectionTarget');
    expect(scopeData).toHaveProperty('reportDocument');
    expect(scopeData).toHaveProperty('fieldSources');
    expect(scopeData).toHaveProperty('preview');
    expect(scopeData).toHaveProperty('inspectorPanels');
    expect(scopeData).not.toHaveProperty('canUndo');
    expect(scopeData).not.toHaveProperty('canRedo');
    expect(scopeData).not.toHaveProperty('inspectorBody');
    expect(designer).toHaveProperty('inspectorPanels');
    expect(designer).toHaveProperty('canUndo', false);
    expect(designer).toHaveProperty('canRedo', false);
    expect(Array.isArray(designer.fieldSources)).toBe(true);
  });

  it('does not replace canonical reportDocument/workbook with spreadsheet snapshot aliases', () => {
    const spreadsheet = createEmptyDocument();
    const document = createReportTemplateDocument(spreadsheet, 'Canonical Report');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });
    const spreadsheetCore = createSpreadsheetCore({ document: spreadsheet });
    void spreadsheetCore.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId: spreadsheet.workbook.sheets[0]!.id, address: 'A1', row: 0, col: 0 },
      value: 'draft-only',
    });

    const scopeData = buildReportDesignerScopeData(
      core,
      core.getSnapshot(),
      spreadsheetCore.getSnapshot(),
    );

    expect((scopeData.reportDocument as any).spreadsheet.workbook.sheets[0]?.cells?.A1).toBeUndefined();
    expect((scopeData.workbook as any).sheets[0]?.cells?.A1).toBeUndefined();
    expect((scopeData.spreadsheet as any).workbook.sheets[0]?.cells?.A1?.value).toBe('draft-only');
  });
});
