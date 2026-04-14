import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmptyDocument,
} from '@nop-chaos/spreadsheet-core';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerCore,
  type ReportTemplateDocument,
  type ReportSelectionTarget,
  type ReportDesignerConfig,
  type ReportDesignerProfile,
} from '../index.js';

const defaultConfig: ReportDesignerConfig = {
  kind: 'report-template',
};

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
    expect(snap.dirty).toBe(false);
    expect(snap.selectionTarget?.kind).toBe('sheet');
    expect(snap.inspector.open).toBe(false);
    expect(snap.fieldDrag.active).toBe(false);
    expect(snap.preview.running).toBe(false);
  });

  it('marks snapshot dirty after metadata updates and clears it after undo', async () => {
    expect(core.getSnapshot().dirty).toBe(false);

    await core.dispatch({
      type: 'report-designer:updateMeta',
      target: { kind: 'workbook' },
      patch: { title: 'Dirty now' },
    });

    expect(core.getSnapshot().dirty).toBe(true);

    await core.dispatch({ type: 'report-designer:undo' });

    expect(core.getSnapshot().dirty).toBe(false);
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

  it('captures inspector provider load failures in snapshot state', async () => {
    const failingCore = createReportDesignerCore({
      document: doc,
      config: {
        kind: 'report-template',
        inspector: {
          providers: [
            {
              id: 'failing-panel',
              label: 'Failing Panel',
              match: { kinds: ['sheet'] },
              provider: 'failing-provider',
            },
          ],
        },
      },
      adapters: {
        inspectors: new Map([
          ['failing-provider', {
            id: 'failing-provider',
            match: () => true,
            getPanels: () => {
              throw new Error('Inspector load failed');
            },
          }],
        ]),
      },
    });

    await failingCore.setSelectionTarget({ kind: 'sheet', sheetId });

    const snap = failingCore.getSnapshot();
    expect(snap.inspector.loading).toBe(false);
    expect(String(snap.inspector.error)).toContain('Inspector load failed');
    expect(failingCore.getInspectorPanels()).toEqual([]);
  });

  it('passes spreadsheet snapshot into inspector provider context', async () => {
    let seenSpreadsheet: any;
    const providerCore = createReportDesignerCore({
      document: doc,
      config: {
        kind: 'report-template',
        inspector: {
          providers: [
            {
              id: 'sheet-provider',
              label: 'Sheet Provider',
              match: { kinds: ['sheet'] },
              provider: 'sheet-provider',
            },
          ],
        },
      },
      adapters: {
        inspectors: new Map([
          ['sheet-provider', {
            id: 'sheet-provider',
            match: () => true,
            getPanels: (context) => {
              seenSpreadsheet = context.spreadsheet;
              return [{ id: 'from-provider', title: 'From Provider', targetKind: 'sheet', body: {} }];
            },
          }],
        ]),
      },
    });

    await providerCore.setSelectionTarget({ kind: 'sheet', sheetId });

    expect(seenSpreadsheet?.activeSheetId).toBe(sheetId);
    expect(Array.isArray(seenSpreadsheet?.document?.workbook?.sheets)).toBe(true);
    expect(providerCore.getInspectorPanels().map((panel) => panel.id)).toEqual(['from-provider']);
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
