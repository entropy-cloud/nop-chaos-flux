import { describe, expect, it } from 'vitest';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
} from '@nop-chaos/report-designer-core';
import { REPORT_DESIGNER_MANIFEST_V1 } from './report-designer-manifest.js';
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

  it('aggregates spreadsheet-only dirty and history into top-level runtime summary', async () => {
    const spreadsheet = createEmptyDocument();
    const document = createReportTemplateDocument(spreadsheet, 'Spreadsheet Runtime Report');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });
    const spreadsheetCore = createSpreadsheetCore({ document: spreadsheet });

    await spreadsheetCore.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId: spreadsheet.workbook.sheets[0]!.id, address: 'A1', row: 0, col: 0 },
      value: 'changed',
    });

    const scopeData = buildReportDesignerScopeData(core, core.getSnapshot(), spreadsheetCore.getSnapshot());
    const runtime = scopeData.runtime as { dirty?: boolean; canUndo?: boolean; canRedo?: boolean };
    const designer = scopeData.designer as { dirty?: boolean; canUndo?: boolean; canRedo?: boolean };

    expect(designer.dirty).toBe(false);
    expect(designer.canUndo).toBe(false);
    expect(designer.canRedo).toBe(false);
    expect(runtime.dirty).toBe(true);
    expect(runtime.canUndo).toBe(true);
    expect(runtime.canRedo).toBe(false);
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

  it('normalizes absent host projection fields to null where the manifest publishes null unions', async () => {
    const spreadsheet = createEmptyDocument();
    const document = createReportTemplateDocument(spreadsheet, 'Null Projection Report');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });
    await core.setSelectionTarget(undefined);

    const scopeData = buildReportDesignerScopeData(core, core.getSnapshot());

    expect(scopeData.selectionTarget).toBeNull();
    expect((scopeData.runtime as { previewMode?: unknown }).previewMode).toBeNull();
    expect((scopeData.designer as { selectionKind?: unknown }).selectionKind).toBeNull();
    expect(scopeData.activeCell).toBeNull();
    expect(scopeData.activeRange).toBeNull();
    expect(scopeData.meta).toBeNull();
    expect(scopeData.inspectorPanels).toBeNull();
    expect((scopeData.designer as { inspectorPanels?: unknown }).inspectorPanels).toBeNull();
    expect(scopeData.spreadsheet).toBeNull();
  });

  it('keeps top-level activeSheet aligned with workbook and row/column targets', async () => {
    const spreadsheet = createEmptyDocument();
    spreadsheet.workbook.sheets.push({
      id: 'sheet-2',
      name: 'Sheet2',
      order: 1,
    });
    const document = createReportTemplateDocument(spreadsheet, 'Active Sheet Report');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });
    const spreadsheetCore = createSpreadsheetCore({ document: spreadsheet });

    await spreadsheetCore.dispatch({
      type: 'spreadsheet:setActiveSheet',
      sheetId: 'sheet-2',
    });

    await core.setSelectionTarget({ kind: 'workbook' });
    let scopeData = buildReportDesignerScopeData(core, core.getSnapshot(), spreadsheetCore.getSnapshot());
    expect((scopeData.activeSheet as any)?.id).toBe('sheet-2');

    await core.setSelectionTarget({
      kind: 'row',
      sheetId: 'sheet-2',
      row: 0,
    });
    scopeData = buildReportDesignerScopeData(core, core.getSnapshot(), spreadsheetCore.getSnapshot());
    expect((scopeData.activeSheet as any)?.id).toBe('sheet-2');

    await core.setSelectionTarget({
      kind: 'column',
      sheetId: 'sheet-2',
      col: 0,
    });
    scopeData = buildReportDesignerScopeData(core, core.getSnapshot(), spreadsheetCore.getSnapshot());
    expect((scopeData.activeSheet as any)?.id).toBe('sheet-2');
  });

  it('publishes structured spreadsheet.selection variants instead of an opaque object', async () => {
    const spreadsheet = createEmptyDocument();
    const document = createReportTemplateDocument(spreadsheet, 'Selection Shape Report');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });
    const spreadsheetCore = createSpreadsheetCore({ document: spreadsheet });

    await spreadsheetCore.dispatch({
      type: 'spreadsheet:setSelection',
      selection: {
        kind: 'row',
        sheetId: spreadsheet.workbook.sheets[0]!.id,
        rows: [1, 2],
      },
    });

    let scopeData = buildReportDesignerScopeData(core, core.getSnapshot(), spreadsheetCore.getSnapshot());
    expect(scopeData.spreadsheet).toMatchObject({
      selection: {
        kind: 'row',
        sheetId: spreadsheet.workbook.sheets[0]!.id,
        rows: [1, 2],
      },
    });

    await spreadsheetCore.dispatch({
      type: 'spreadsheet:setSelection',
      selection: {
        kind: 'column',
        sheetId: spreadsheet.workbook.sheets[0]!.id,
        columns: [0, 1],
      },
    });

    scopeData = buildReportDesignerScopeData(core, core.getSnapshot(), spreadsheetCore.getSnapshot());
    expect(scopeData.spreadsheet).toMatchObject({
      selection: {
        kind: 'column',
        sheetId: spreadsheet.workbook.sheets[0]!.id,
        columns: [0, 1],
      },
    });
  });

  it('publishes structured spreadsheet.selection shape in the manifest', () => {
    const selectionShape = REPORT_DESIGNER_MANIFEST_V1.projection.fields.spreadsheet.schema;

    expect(selectionShape.kind).toBe('union');
    if (selectionShape.kind !== 'union') {
      return;
    }

    const spreadsheetObject = selectionShape.anyOf.find(
      (variant) => variant.kind === 'object',
    );
    expect(spreadsheetObject?.kind).toBe('object');
    if (!spreadsheetObject || spreadsheetObject.kind !== 'object') {
      return;
    }

    const spreadsheetSelection = spreadsheetObject.fields.selection;
    expect(spreadsheetSelection.kind).toBe('union');
    if (spreadsheetSelection.kind !== 'union') {
      return;
    }

    expect(spreadsheetSelection.anyOf).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'object',
          fields: expect.objectContaining({
            kind: { kind: 'literal', value: 'row' },
            rows: { kind: 'array', item: { kind: 'number' } },
          }),
        }),
        expect.objectContaining({
          kind: 'object',
          fields: expect.objectContaining({
            kind: { kind: 'literal', value: 'column' },
            columns: { kind: 'array', item: { kind: 'number' } },
          }),
        }),
      ]),
    );
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
