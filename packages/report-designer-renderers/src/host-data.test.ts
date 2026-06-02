import { describe, expect, it } from 'vitest';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
} from '@nop-chaos/report-designer-core';
import { REPORT_DESIGNER_MANIFEST_V1 } from './report-designer-manifest.js';
import { buildReportDesignerScopeData, createHostData } from './host-data.js';

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

  it('unifies workbook identity: reportDocument.spreadsheet.workbook === workbook when live editing', async () => {
    const spreadsheet = createEmptyDocument();
    const document = createReportTemplateDocument(spreadsheet, 'Workbook Identity Report');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });
    const spreadsheetCore = createSpreadsheetCore({ document: spreadsheet });

    await spreadsheetCore.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId: spreadsheet.workbook.sheets[0]!.id, address: 'A1', row: 0, col: 0 },
      value: 'live-edit',
    });

    const scopeData = buildReportDesignerScopeData(
      core,
      core.getSnapshot(),
      spreadsheetCore.getSnapshot(),
    );

    const topWorkbook = scopeData.workbook as Record<string, unknown>;
    const docWorkbook = (scopeData.reportDocument as any).spreadsheet.workbook as Record<string, unknown>;

    expect(topWorkbook).toBe(docWorkbook);
    expect((topWorkbook as any).sheets[0]?.cells?.A1?.value).toBe('live-edit');
    expect((docWorkbook as any).sheets[0]?.cells?.A1?.value).toBe('live-edit');
  });

  it('unifies workbook identity: reportDocument.spreadsheet.workbook === workbook without spreadsheet snapshot', () => {
    const spreadsheet = createEmptyDocument();
    const document = createReportTemplateDocument(spreadsheet, 'Workbook Identity No SS');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });

    const scopeData = buildReportDesignerScopeData(core, core.getSnapshot());
    const topWorkbook = scopeData.workbook as Record<string, unknown>;
    const docWorkbook = (scopeData.reportDocument as any).spreadsheet.workbook as Record<string, unknown>;

    expect(topWorkbook).toBe(docWorkbook);
  });

  it('defensively copies workbook so mutations do not leak into core state', async () => {
    const spreadsheet = createEmptyDocument();
    const document = createReportTemplateDocument(spreadsheet, 'Immutability Report');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });

    const scopeData = buildReportDesignerScopeData(core, core.getSnapshot());
    const topWorkbook = scopeData.workbook as any;

    const originalSheetCount = topWorkbook.sheets.length;
    topWorkbook.sheets.push({ id: 'rogue', name: 'Rogue', order: 99 });

    const scopeData2 = buildReportDesignerScopeData(core, core.getSnapshot());
    const topWorkbook2 = scopeData2.workbook as any;
    expect(topWorkbook2.sheets.length).toBe(originalSheetCount);
  });

  it('createHostData uses same defensive copy strategy as buildReportDesignerScopeData', () => {
    const spreadsheet = createEmptyDocument();
    const document = createReportTemplateDocument(spreadsheet, 'Host Data Copy');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });

    const hostData = createHostData(core, core.getSnapshot());
    expect(hostData.workbook).toBe(hostData.reportDocument.spreadsheet.workbook);

    const mutableWorkbook = hostData.workbook as any;
    mutableWorkbook.sheets.push({ id: 'rogue', name: 'Rogue', order: 99 });

    const hostData2 = createHostData(core, core.getSnapshot());
    expect((hostData2.workbook as any).sheets.length).toBe(spreadsheet.workbook.sheets.length);
  });

  it('createHostData with spreadsheet snapshot uses spreadsheet as canonical workbook owner', async () => {
    const spreadsheet = createEmptyDocument();
    const document = createReportTemplateDocument(spreadsheet, 'Host Data SS Owner');
    const core = createReportDesignerCore({
      document,
      config: { kind: 'report-template' },
    });
    const spreadsheetCore = createSpreadsheetCore({ document: spreadsheet });

    await spreadsheetCore.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId: spreadsheet.workbook.sheets[0]!.id, address: 'B2', row: 1, col: 1 },
      value: 'live-value',
    });

    const hostData = createHostData(core, core.getSnapshot(), spreadsheetCore.getSnapshot());
    expect(hostData.workbook).toBe(hostData.reportDocument.spreadsheet.workbook);
    expect((hostData.workbook as any).sheets[0]?.cells?.B2?.value).toBe('live-value');
  });
});

describe('manifest structured action results', () => {
  it('declares preview result as structured envelope instead of unknown', () => {
    const previewMethod = REPORT_DESIGNER_MANIFEST_V1.capabilities.methods.preview;
    const result = previewMethod.result!;
    expect(result.kind).toBe('object');
    if (result.kind !== 'object') return;
    expect(result.fields).toHaveProperty('ok');
    expect(result.fields.ok).toEqual({ kind: 'boolean' });
    expect(result).not.toEqual({ kind: 'unknown' });
  });

  it('declares save result as structured envelope instead of unknown', () => {
    const saveMethod = REPORT_DESIGNER_MANIFEST_V1.capabilities.methods.save;
    const result = saveMethod.result!;
    expect(result.kind).toBe('object');
    if (result.kind !== 'object') return;
    expect(result.fields).toHaveProperty('ok');
    expect(result.fields.ok).toEqual({ kind: 'boolean' });
  });

  it('declares exportTemplate result as structured envelope with format/content data', () => {
    const exportMethod = REPORT_DESIGNER_MANIFEST_V1.capabilities.methods.exportTemplate;
    const result = exportMethod.result!;
    expect(result.kind).toBe('object');
    if (result.kind !== 'object') return;
    expect(result.fields).toHaveProperty('ok');
    expect(result.fields).toHaveProperty('data');
  });
});
