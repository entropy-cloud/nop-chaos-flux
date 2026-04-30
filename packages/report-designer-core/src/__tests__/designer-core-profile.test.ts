import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmptyDocument,
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerCore,
  type ReportTemplateDocument,
  type ReportDesignerConfig,
  type ReportDesignerProfile,
} from './test-utils.js';

const defaultConfig: ReportDesignerConfig = {
  kind: 'report-template',
};

describe('designer-core profile and adapters', () => {
  let _core: ReportDesignerCore;
  let doc: ReportTemplateDocument;
  let sheetId: string;

  beforeEach(() => {
    const spreadsheetDoc = createEmptyDocument();
    sheetId = spreadsheetDoc.workbook.sheets[0].id;
    doc = createReportTemplateDocument(spreadsheetDoc);
    _core = createReportDesignerCore({ document: doc, config: defaultConfig });
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
              fields: [
                { id: 'amount', label: 'Amount', path: 'orders.amount', fieldType: 'number' },
              ],
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

  it('prefers byProfile inspector schema over byTarget and body', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const profileDoc = createReportTemplateDocument(spreadsheetDoc);
    const profileSheetId = spreadsheetDoc.workbook.sheets[0].id;
    const profileConfig: ReportDesignerConfig = {
      kind: 'report-template',
      inspector: {
        body: { type: 'text', text: 'body' },
        byTarget: {
          sheet: { type: 'text', text: 'target' },
        },
        byProfile: {
          'nop-inspector': {
            sheet: { type: 'text', text: 'profile' },
          },
        },
      },
    };
    const profile: ReportDesignerProfile = {
      id: 'nop-profile',
      kind: 'report-template',
      fieldSourceIds: [],
      fieldDropIds: [],
      inspectorSchemaId: 'nop-inspector',
    };
    const profileCore = createReportDesignerCore({
      document: profileDoc,
      config: profileConfig,
      profile,
    });

    await profileCore.setSelectionTarget({ kind: 'sheet', sheetId: profileSheetId });

    expect(profileCore.getSnapshot().inspector.resolvedSchema).toEqual({
      type: 'text',
      text: 'profile',
    });
  });

  it('falls back from byTarget to body and leaves explicit empty state when no schema exists', async () => {
    const fallbackCore = createReportDesignerCore({
      document: doc,
      config: {
        kind: 'report-template',
        inspector: {
          body: { type: 'text', text: 'body fallback' },
          byTarget: {
            workbook: { type: 'text', text: 'workbook target' },
          },
        },
      },
    });

    await fallbackCore.setSelectionTarget({ kind: 'workbook' });
    expect(fallbackCore.getSnapshot().inspector.resolvedSchema).toEqual({
      type: 'text',
      text: 'workbook target',
    });

    await fallbackCore.setSelectionTarget({ kind: 'sheet', sheetId });
    expect(fallbackCore.getSnapshot().inspector.resolvedSchema).toEqual({
      type: 'text',
      text: 'body fallback',
    });

    const emptyCore = createReportDesignerCore({
      document: doc,
      config: { kind: 'report-template' },
    });

    await emptyCore.setSelectionTarget({ kind: 'workbook' });
    expect(emptyCore.getSnapshot().inspector.resolvedSchema).toBeUndefined();
  });

  it('should select field drop adapters by profile ids', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const profileDoc = createReportTemplateDocument(spreadsheetDoc);
    const profileSheetId = spreadsheetDoc.workbook.sheets[0].id;
    const profile: ReportDesignerProfile = {
      id: 'nop-profile',
      kind: 'report-template',
      fieldSourceIds: [],
      fieldDropIds: ['allowed-drop'],
    };
    const profileCore = createReportDesignerCore({
      document: profileDoc,
      config: { kind: 'report-template' },
      profile,
      adapters: {
        fieldDrops: new Map([
          [
            'blocked-drop',
            {
              id: 'blocked-drop',
              canHandle: () => true,
              mapDropToMetaPatch: () => ({ blocked: true }),
            },
          ],
          [
            'allowed-drop',
            {
              id: 'allowed-drop',
              canHandle: () => true,
              mapDropToMetaPatch: () => ({ allowed: true }),
            },
          ],
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
          [
            'config-preview',
            {
              id: 'config-preview',
              async preview() {
                configPreviewCalled = true;
                return { ok: true, data: { source: 'config' } };
              },
            },
          ],
          [
            'profile-preview',
            {
              id: 'profile-preview',
              async preview() {
                return { ok: true, data: { source: 'profile' } };
              },
            },
          ],
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
