import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmptyDocument,
} from '@nop-chaos/spreadsheet-core';
import {
  createReportDesignerCore,
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
  createEmptyAdapterRegistry,
  createStaticFieldSourceProvider,
  createStaticInspectorProvider,
  createMetaPatchDropAdapter,
  createUnsupportedTemplateCodecAdapter,
  matchInspectorProviders,
  groupPanelsByMode,
  findDefaultActivePanel,
  type ReportDesignerCore,
  type ReportTemplateDocument,
  type ReportSemanticDocument,
  type ReportSelectionTarget,
  type ReportDesignerConfig,
  type ReportDesignerAdapterContext,
  type InspectorProvider,
  type InspectorPanelDescriptor,
  type FieldDropAdapter,
  type FieldSourceProvider,
  type ReportDesignerProfile,
} from './index.js';

const defaultConfig: ReportDesignerConfig = {
  kind: 'report-template',
};

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
    expect(getTargetMeta(semantic, { kind: 'row', sheetId: 's1', row: 0 })).toEqual({ label: 'Header' });
  });

  it('should get column meta', () => {
    let semantic = createDefaultSemantic();
    semantic = setColumnMeta(semantic, 's1', 0, { width: 100 });
    expect(getTargetMeta(semantic, { kind: 'column', sheetId: 's1', col: 0 })).toEqual({ width: 100 });
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
    expect(
      getTargetMeta(undefined, { kind: 'row', sheetId: 's1', row: 0 }),
    ).toBeUndefined();
  });
});

describe('isSameTarget', () => {
  it('should match workbook targets', () => {
    expect(isSameTarget({ kind: 'workbook' }, { kind: 'workbook' })).toBe(true);
  });

  it('should match sheet targets', () => {
    expect(
      isSameTarget({ kind: 'sheet', sheetId: 's1' }, { kind: 'sheet', sheetId: 's1' }),
    ).toBe(true);
  });

  it('should not match different sheets', () => {
    expect(
      isSameTarget({ kind: 'sheet', sheetId: 's1' }, { kind: 'sheet', sheetId: 's2' }),
    ).toBe(false);
  });

  it('should match cell targets', () => {
    const cell = { sheetId: 's1', address: 'A1', row: 0, col: 0 };
    expect(
      isSameTarget({ kind: 'cell', cell }, { kind: 'cell', cell }),
    ).toBe(true);
  });

  it('should not match different cell positions', () => {
    const a = { sheetId: 's1', address: 'A1', row: 0, col: 0 };
    const b = { sheetId: 's1', address: 'B1', row: 0, col: 1 };
    expect(
      isSameTarget({ kind: 'cell', cell: a }, { kind: 'cell', cell: b }),
    ).toBe(false);
  });

  it('should not match different kinds', () => {
    expect(
      isSameTarget({ kind: 'workbook' }, { kind: 'sheet', sheetId: 's1' }),
    ).toBe(false);
  });

  it('should match row targets', () => {
    expect(
      isSameTarget({ kind: 'row', sheetId: 's1', row: 0 }, { kind: 'row', sheetId: 's1', row: 0 }),
    ).toBe(true);
  });

  it('should match column targets', () => {
    expect(
      isSameTarget({ kind: 'column', sheetId: 's1', col: 0 }, { kind: 'column', sheetId: 's1', col: 0 }),
    ).toBe(true);
  });
});

describe('createReportDesignerCore', () => {
  let core: ReportDesignerCore;
  let doc: ReportTemplateDocument;
  let sheetId: string;

  beforeEach(() => {
    const spreadsheetDoc = createEmptyDocument();
    sheetId = spreadsheetDoc.workbook.sheets[0].id;
    doc = createReportTemplateDocument(spreadsheetDoc);
    core = createReportDesignerCore({ document: doc, config: defaultConfig });
  });

  it('should create core with initial snapshot', () => {
    const snap = core.getSnapshot();
    expect(snap.document.id).toBe(doc.id);
    expect(snap.selectionTarget?.kind).toBe('sheet');
    expect(snap.inspector.open).toBe(false);
    expect(snap.fieldDrag.active).toBe(false);
    expect(snap.preview.running).toBe(false);
  });

  it('should auto-select first sheet as default target', () => {
    const snap = core.getSnapshot();
    expect(snap.selectionTarget?.kind).toBe('sheet');
    if (snap.selectionTarget?.kind === 'sheet') {
      expect(snap.selectionTarget.sheetId).toBe(sheetId);
    }
  });

  it('should open inspector', async () => {
    const result = await core.dispatch({
      type: 'report-designer:openInspector',
      target: { kind: 'cell', cell: { sheetId, address: 'A1', row: 0, col: 0 } },
    });

    expect(result.ok).toBe(true);
    const snap = core.getSnapshot();
    expect(snap.inspector.open).toBe(true);
    expect(snap.selectionTarget?.kind).toBe('cell');
  });

  it('should close inspector', async () => {
    await core.dispatch({ type: 'report-designer:openInspector' });
    await core.dispatch({ type: 'report-designer:closeInspector' });

    const snap = core.getSnapshot();
    expect(snap.inspector.open).toBe(false);
  });

  it('should update cell metadata', async () => {
    const target: ReportSelectionTarget = {
      kind: 'cell',
      cell: { sheetId, address: 'B2', row: 1, col: 1 },
    };

    const result = await core.dispatch({
      type: 'report-designer:updateMeta',
      target,
      patch: { field: 'amount', ds: 'orders' },
    });

    expect(result.ok).toBe(true);
    const meta = core.getMetadata(target);
    expect(meta).toEqual({ field: 'amount', ds: 'orders' });
  });

  it('should update workbook metadata', async () => {
    const target: ReportSelectionTarget = { kind: 'workbook' };

    await core.dispatch({
      type: 'report-designer:updateMeta',
      target,
      patch: { title: 'Sales Report' },
    });

    expect(core.getMetadata(target)).toEqual({ title: 'Sales Report' });
  });

  it('should update sheet metadata', async () => {
    const target: ReportSelectionTarget = { kind: 'sheet', sheetId };

    await core.dispatch({
      type: 'report-designer:updateMeta',
      target,
      patch: { pageSize: 'A4' },
    });

    expect(core.getMetadata(target)).toEqual({ pageSize: 'A4' });
  });

  it('should update row metadata', async () => {
    const target: ReportSelectionTarget = { kind: 'row', sheetId, row: 0 };

    await core.dispatch({
      type: 'report-designer:updateMeta',
      target,
      patch: { label: 'Header Row' },
    });

    expect(core.getMetadata(target)).toEqual({ label: 'Header Row' });
  });

  it('should update column metadata', async () => {
    const target: ReportSelectionTarget = { kind: 'column', sheetId, col: 0 };

    await core.dispatch({
      type: 'report-designer:updateMeta',
      target,
      patch: { width: 120 },
    });

    expect(core.getMetadata(target)).toEqual({ width: 120 });
  });

  it('should replace metadata', async () => {
    const target: ReportSelectionTarget = {
      kind: 'cell',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
    };

    await core.dispatch({
      type: 'report-designer:updateMeta',
      target,
      patch: { field: 'old', extra: 'keep' },
    });
    await core.dispatch({
      type: 'report-designer:replaceMeta',
      target,
      nextMeta: { field: 'new' },
    });

    expect(core.getMetadata(target)).toEqual({ field: 'new' });
  });

  it('should set metadata directly', () => {
    const target: ReportSelectionTarget = {
      kind: 'cell',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
    };

    core.setMetadata(target, { field: 'direct' });
    expect(core.getMetadata(target)).toEqual({ field: 'direct' });
  });

  it('should export document', () => {
    const exported = core.exportDocument();
    expect(exported.id).toBe(doc.id);
  });

  it('should track field drag state', async () => {
    const payload = {
      type: 'field',
      sourceId: 'ds1',
      fieldId: 'amount',
      data: { label: 'Amount' },
    };

    await core.dispatch({
      type: 'report-designer:dropFieldToTarget',
      field: payload,
      target: {
        kind: 'cell',
        cell: { sheetId, address: 'A1', row: 0, col: 0 },
      },
    });

    const snap = core.getSnapshot();
    expect(snap.fieldDrag.active).toBe(false);

    const meta = core.getMetadata({
      kind: 'cell',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
    });
    expect(meta?.field).toEqual({
      sourceId: 'ds1',
      fieldId: 'amount',
      data: { label: 'Amount' },
    });
  });

  it('should notify listeners on state change', async () => {
    let notified = false;
    core.subscribe(() => { notified = true; });

    await core.dispatch({
      type: 'report-designer:updateMeta',
      target: { kind: 'workbook' },
      patch: { x: 1 },
    });

    expect(notified).toBe(true);
  });

  it('should handle preview without adapter', async () => {
    const result = await core.dispatch({
      type: 'report-designer:preview',
      mode: 'inline',
    });

    expect(result.ok).toBe(false);
  });

  it('should fail import when no codec configured in profile', async () => {
    const result = await core.dispatch({
      type: 'report-designer:importTemplate',
      payload: {},
    });

    expect(result.ok).toBe(false);
    expect(result.changed).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('No codec configured in profile');
  });

  it('should fail export when no codec configured in profile', async () => {
    const result = await core.dispatch({
      type: 'report-designer:exportTemplate',
      format: 'json',
    });

    expect(result.ok).toBe(false);
    expect(result.changed).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('No codec configured in profile');
  });

  it('should set selection target', async () => {
    await core.setSelectionTarget({ kind: 'workbook' });
    const snap = core.getSnapshot();
    expect(snap.selectionTarget?.kind).toBe('workbook');
  });

  it('should get inspector panels', () => {
    const panels = core.getInspectorPanels();
    expect(Array.isArray(panels)).toBe(true);
  });

  it('should refresh field sources', async () => {
    const sources = await core.refreshFieldSources();
    expect(Array.isArray(sources)).toBe(true);
  });

  it('should filter field sources by profile ids', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const profileDoc = createReportTemplateDocument(spreadsheetDoc);
    const profileConfig: ReportDesignerConfig = {
      kind: 'report-template',
      fieldSources: [
        {
          id: 'orders',
          label: 'Orders',
          groups: [
            {
              id: 'g1',
              label: 'Group 1',
              expanded: true,
              fields: [{ id: 'amount', label: 'Amount', path: 'orders.amount', fieldType: 'number' }],
            },
          ],
        },
        {
          id: 'customers',
          label: 'Customers',
          groups: [
            {
              id: 'g2',
              label: 'Group 2',
              expanded: true,
              fields: [{ id: 'name', label: 'Name', path: 'customers.name', fieldType: 'string' }],
            },
          ],
        },
      ],
    };
    const profile: ReportDesignerProfile = {
      id: 'nop-profile',
      kind: 'report-template',
      fieldSourceIds: ['orders'],
      inspectorIds: [],
      fieldDropIds: [],
    };
    const profileCore = createReportDesignerCore({
      document: profileDoc,
      config: profileConfig,
      profile,
    });

    const sources = await profileCore.refreshFieldSources();

    expect(sources).toHaveLength(1);
    expect(sources[0].id).toBe('orders');
  });

  it('should filter inspector providers by profile ids', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const profileDoc = createReportTemplateDocument(spreadsheetDoc);
    const profileSheetId = spreadsheetDoc.workbook.sheets[0].id;
    const profileConfig: ReportDesignerConfig = {
      kind: 'report-template',
      inspector: {
        providers: [
          {
            id: 'allowed',
            label: 'Allowed Panel',
            match: { kinds: ['sheet'] },
            mode: 'tab',
            body: { title: 'allowed' },
          },
          {
            id: 'blocked',
            label: 'Blocked Panel',
            match: { kinds: ['sheet'] },
            mode: 'tab',
            body: { title: 'blocked' },
          },
        ],
      },
    };
    const profile: ReportDesignerProfile = {
      id: 'nop-profile',
      kind: 'report-template',
      fieldSourceIds: [],
      inspectorIds: ['allowed'],
      fieldDropIds: [],
    };
    const profileCore = createReportDesignerCore({
      document: profileDoc,
      config: profileConfig,
      profile,
    });

    await profileCore.setSelectionTarget({ kind: 'sheet', sheetId: profileSheetId });
    const panels = profileCore.getInspectorPanels();

    expect(panels).toHaveLength(1);
    expect(panels[0].id).toBe('allowed');
  });

  it('should select field drop adapters by profile ids', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const profileDoc = createReportTemplateDocument(spreadsheetDoc);
    const profileSheetId = spreadsheetDoc.workbook.sheets[0].id;
    const profile: ReportDesignerProfile = {
      id: 'nop-profile',
      kind: 'report-template',
      fieldSourceIds: [],
      inspectorIds: [],
      fieldDropIds: ['allowed-drop'],
    };
    const profileCore = createReportDesignerCore({
      document: profileDoc,
      config: { kind: 'report-template' },
      profile,
      adapters: {
        fieldDrops: new Map([
          ['blocked-drop', {
            id: 'blocked-drop',
            canHandle: () => true,
            mapDropToMetaPatch: () => ({ blocked: true }),
          }],
          ['allowed-drop', {
            id: 'allowed-drop',
            canHandle: () => true,
            mapDropToMetaPatch: () => ({ allowed: true }),
          }],
        ]),
      },
    });

    await profileCore.dispatch({
      type: 'report-designer:dropFieldToTarget',
      field: {
        type: 'field',
        sourceId: 'orders',
        fieldId: 'amount',
        data: { label: 'Amount' },
      },
      target: {
        kind: 'cell',
        cell: { sheetId: profileSheetId, address: 'A1', row: 0, col: 0 },
      },
    });

    const meta = profileCore.getMetadata({
      kind: 'cell',
      cell: { sheetId: profileSheetId, address: 'A1', row: 0, col: 0 },
    });

    expect(meta).toEqual({ allowed: true });
  });

  it('should let profile preview adapter override config preview adapter', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const profileDoc = createReportTemplateDocument(spreadsheetDoc);
    let configPreviewCalled = false;
    const profile: ReportDesignerProfile = {
      id: 'nop-profile',
      kind: 'report-template',
      fieldSourceIds: [],
      inspectorIds: [],
      fieldDropIds: [],
      previewId: 'profile-preview',
    };
    const profileCore = createReportDesignerCore({
      document: profileDoc,
      config: {
        kind: 'report-template',
        preview: {
          provider: 'config-preview',
        },
      },
      profile,
      adapters: {
        previews: new Map([
          ['config-preview', {
            id: 'config-preview',
            async preview() {
              configPreviewCalled = true;
              return { ok: true, data: { source: 'config' } };
            },
          }],
          ['profile-preview', {
            id: 'profile-preview',
            async preview() {
              return { ok: true, data: { source: 'profile' } };
            },
          }],
        ]),
      },
    });

    const result = await profileCore.dispatch({
      type: 'report-designer:preview',
      mode: 'inline',
    });

    expect(result.ok).toBe(true);
    expect(configPreviewCalled).toBe(false);
    expect(result.data).toEqual({ source: 'profile' });
  });
});

describe('importTemplate / exportTemplate commands', () => {
  it('should import document via codec and reset selection', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const originalDoc = createReportTemplateDocument(spreadsheetDoc, 'Original');
    const importedDoc = createReportTemplateDocument(createEmptyDocument(), 'Imported');

    const core = createReportDesignerCore({
      document: originalDoc,
      config: defaultConfig,
      profile: { id: 'p1', kind: 'report-template', fieldSourceIds: [], inspectorIds: [], fieldDropIds: [], codecId: 'json-codec' },
    });

    core.registerCodec({
      id: 'json-codec',
      async importDocument() {
        return importedDoc;
      },
      exportDocument() {
        return {};
      },
    });

    await core.setSelectionTarget({ kind: 'workbook' });
    expect(core.getSnapshot().selectionTarget?.kind).toBe('workbook');

    const result = await core.dispatch({
      type: 'report-designer:importTemplate',
      payload: { data: 'test' },
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    expect(core.getSnapshot().document.name).toBe('Imported');
    expect(core.getSnapshot().selectionTarget).toBeUndefined();
  });

  it('should export document via codec and return data', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc, 'Export Me');

    const core = createReportDesignerCore({
      document: doc,
      config: defaultConfig,
      profile: { id: 'p1', kind: 'report-template', fieldSourceIds: [], inspectorIds: [], fieldDropIds: [], codecId: 'json-codec' },
    });

    core.registerCodec({
      id: 'json-codec',
      importDocument() {
        return createReportTemplateDocument(createEmptyDocument());
      },
      exportDocument(exportedDoc, format) {
        return { name: exportedDoc.name, format };
      },
    });

    const result = await core.dispatch({
      type: 'report-designer:exportTemplate',
      format: 'json',
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.data).toEqual({ name: 'Export Me', format: 'json' });
  });

  it('should fail with structured error when codecId not in registry', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc);

    const core = createReportDesignerCore({
      document: doc,
      config: defaultConfig,
      profile: { id: 'p1', kind: 'report-template', fieldSourceIds: [], inspectorIds: [], fieldDropIds: [], codecId: 'missing-codec' },
    });

    const importResult = await core.dispatch({
      type: 'report-designer:importTemplate',
      payload: {},
    });

    expect(importResult.ok).toBe(false);
    expect(importResult.changed).toBe(false);
    expect(importResult.error).toBeInstanceOf(Error);
    expect((importResult.error as Error).message).toBe('Codec not found: missing-codec');

    const exportResult = await core.dispatch({
      type: 'report-designer:exportTemplate',
      format: 'json',
    });

    expect(exportResult.ok).toBe(false);
    expect(exportResult.error).toBeInstanceOf(Error);
    expect((exportResult.error as Error).message).toBe('Codec not found: missing-codec');
  });
});

describe('adapter registry', () => {
  let core: ReportDesignerCore;

  beforeEach(() => {
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc);
    core = createReportDesignerCore({ document: doc, config: defaultConfig });
  });

  it('should register field source', () => {
    const provider: FieldSourceProvider = {
      id: 'test-source',
      load: () => [],
    };
    core.registerFieldSource(provider);

    const registry = core.getAdapterRegistry();
    expect(registry.fieldSources.has('test-source')).toBe(true);
  });

  it('should register inspector', () => {
    const provider: InspectorProvider = {
      id: 'test-inspector',
      match: () => true,
      getPanels: () => [],
    };
    core.registerInspector(provider);

    const registry = core.getAdapterRegistry();
    expect(registry.inspectors.has('test-inspector')).toBe(true);
  });

  it('should register field drop adapter', () => {
    const adapter: FieldDropAdapter = {
      id: 'test-drop',
      canHandle: () => true,
      mapDropToMetaPatch: () => ({}),
    };
    core.registerFieldDrop(adapter);

    const registry = core.getAdapterRegistry();
    expect(registry.fieldDrops.has('test-drop')).toBe(true);
  });
});

describe('field drop to range', () => {
  let core: ReportDesignerCore;
  let sheetId: string;

  beforeEach(() => {
    const spreadsheetDoc = createEmptyDocument();
    sheetId = spreadsheetDoc.workbook.sheets[0].id;
    const doc = createReportTemplateDocument(spreadsheetDoc);
    core = createReportDesignerCore({ document: doc, config: defaultConfig });
  });

  it('should drop field to range', async () => {
    const payload = {
      type: 'field',
      sourceId: 'ds1',
      fieldId: 'amount',
      data: { label: 'Amount' },
    };

    await core.dispatch({
      type: 'report-designer:dropFieldToTarget',
      field: payload,
      target: {
        kind: 'range',
        range: { sheetId, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
      },
    });

    for (let r = 0; r <= 1; r++) {
      for (let c = 0; c <= 1; c++) {
        const meta = core.getMetadata({
          kind: 'cell',
          cell: {
            sheetId,
            address: `${String.fromCharCode(65 + c)}${r + 1}`,
            row: r,
            col: c,
          },
        });
        expect(meta?.field).toBeDefined();
      }
    }
  });
});

describe('matchInspectorProviders', () => {
  function makeContext(doc: ReportTemplateDocument): ReportDesignerAdapterContext {
    return {
      config: defaultConfig,
      document: doc,
      designer: {} as any,
    };
  }

  it('should match providers by target kind', () => {
    const registry = createEmptyAdapterRegistry();

    const cellProvider: InspectorProvider = {
      id: 'cell-panel',
      match: (target) => target.kind === 'cell',
      getPanels: () => [
        { id: 'basic', title: 'Basic', targetKind: 'cell', body: {} },
      ],
    };

    const sheetProvider: InspectorProvider = {
      id: 'sheet-panel',
      match: (target) => target.kind === 'sheet',
      getPanels: () => [
        { id: 'sheet', title: 'Sheet', targetKind: 'sheet', body: {} },
      ],
    };

    registry.inspectors.set('cell-panel', cellProvider);
    registry.inspectors.set('sheet-panel', sheetProvider);

    const context = makeContext(createReportTemplateDocument(createEmptyDocument()));

    const cellMatch = matchInspectorProviders(
      { kind: 'cell', cell: { sheetId: 's1', address: 'A1', row: 0, col: 0 } },
      registry,
      context,
    );
    expect(cellMatch.length).toBe(1);
    expect(cellMatch[0].id).toBe('cell-panel');

    const sheetMatch = matchInspectorProviders(
      { kind: 'sheet', sheetId: 's1' },
      registry,
      context,
    );
    expect(sheetMatch.length).toBe(1);
    expect(sheetMatch[0].id).toBe('sheet-panel');
  });

  it('should sort by priority', () => {
    const registry = createEmptyAdapterRegistry();
    const context = makeContext(createReportTemplateDocument(createEmptyDocument()));

    registry.inspectors.set('low', {
      id: 'low',
      match: () => true,
      getPanels: () => [],
      priority: -1,
    });
    registry.inspectors.set('high', {
      id: 'high',
      match: () => true,
      getPanels: () => [],
      priority: 10,
    });
    registry.inspectors.set('default', {
      id: 'default',
      match: () => true,
      getPanels: () => [],
    });

    const matched = matchInspectorProviders({ kind: 'workbook' }, registry, context);
    expect(matched[0].id).toBe('high');
    expect(matched[1].id).toBe('default');
    expect(matched[2].id).toBe('low');
  });
});

describe('groupPanelsByMode', () => {
  it('should group panels by mode', () => {
    const panels: InspectorPanelDescriptor[] = [
      { id: 'tab1', title: 'Tab 1', targetKind: 'cell', mode: 'tab', body: {} },
      { id: 'sec1', title: 'Sec 1', targetKind: 'cell', mode: 'section', body: {} },
      { id: 'tab2', title: 'Tab 2', targetKind: 'cell', mode: 'tab', body: {} },
      { id: 'inl1', title: 'Inl 1', targetKind: 'cell', mode: 'inline', body: {} },
    ];

    const grouped = groupPanelsByMode(panels);
    expect(grouped.tabs.length).toBe(2);
    expect(grouped.sections.length).toBe(1);
    expect(grouped.inline.length).toBe(1);
  });

  it('should default to tab mode', () => {
    const panels: InspectorPanelDescriptor[] = [
      { id: 'default', title: 'Default', targetKind: 'cell', body: {} },
    ];

    const grouped = groupPanelsByMode(panels);
    expect(grouped.tabs.length).toBe(1);
  });
});

describe('findDefaultActivePanel', () => {
  it('should return undefined for empty panels', () => {
    expect(findDefaultActivePanel([])).toBeUndefined();
  });

  it('should return first panel id', () => {
    const panels: InspectorPanelDescriptor[] = [
      { id: 'first', title: 'First', targetKind: 'cell', body: {} },
      { id: 'second', title: 'Second', targetKind: 'cell', body: {} },
    ];
    expect(findDefaultActivePanel(panels)).toBe('first');
  });

  it('should prefer non-readonly panel', () => {
    const panels: InspectorPanelDescriptor[] = [
      { id: 'readonly', title: 'Readonly', targetKind: 'cell', body: {}, readonly: true },
      { id: 'editable', title: 'Editable', targetKind: 'cell', body: {} },
    ];
    expect(findDefaultActivePanel(panels)).toBe('editable');
  });
});

describe('factory helpers', () => {
  it('createStaticFieldSourceProvider should create a provider', () => {
    const provider = createStaticFieldSourceProvider('test', [
      { id: 'src1', label: 'Source 1', groups: [] },
    ]);

    expect(provider.id).toBe('test');
    const result = provider.load({} as any);
    expect(result).toEqual([{ id: 'src1', label: 'Source 1', groups: [] }]);
  });

  it('createStaticInspectorProvider should create a provider', () => {
    const provider = createStaticInspectorProvider('test', 'cell', [
      { id: 'p1', title: 'Panel 1', targetKind: 'cell', body: {} },
    ]);

    expect(provider.id).toBe('test');
    expect(provider.match({ kind: 'cell', cell: { sheetId: 's', address: 'A1', row: 0, col: 0 } }, {} as any)).toBe(true);
    expect(provider.match({ kind: 'sheet', sheetId: 's' }, {} as any)).toBe(false);
  });

  it('createMetaPatchDropAdapter should create a drop adapter', () => {
    const adapter = createMetaPatchDropAdapter({
      id: 'test-drop',
      fieldType: 'field',
      createPatch: (field) => ({ binding: field.fieldId }),
    });

    expect(adapter.id).toBe('test-drop');
    expect(adapter.canHandle({ type: 'field', sourceId: 's', fieldId: 'f', data: {} }, { kind: 'cell', cell: { sheetId: 's', address: 'A1', row: 0, col: 0 } })).toBe(true);
    expect(adapter.canHandle({ type: 'other', sourceId: 's', fieldId: 'f', data: {} }, { kind: 'cell', cell: { sheetId: 's', address: 'A1', row: 0, col: 0 } })).toBe(false);
  });

  it('createUnsupportedTemplateCodecAdapter should throw on import/export', () => {
    const codec = createUnsupportedTemplateCodecAdapter('test-codec');
    expect(() => codec.importDocument({}, {} as any)).toThrow();
    expect(() => codec.exportDocument({} as any, undefined, {} as any)).toThrow();
  });
});
