import { describe, expect, it, vi } from 'vitest';
import {
  createEmptyDocument,
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerConfig,
  type ReportSelectionTarget,
} from './test-utils.js';

const defaultConfig: ReportDesignerConfig = {
  kind: 'report-template',
};

function cloneStructured<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('createReportDesignerCore codec and selection behavior', () => {
  it('should fail import when no codec configured in profile', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc);
    const core = createReportDesignerCore({ document: doc, config: defaultConfig });

    const result = await core.dispatch({
      type: 'report-designer:importTemplate',
      payload: {},
    });

    expect(result.ok).toBe(false);
    expect(result.changed).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('No codec configured in profile');
  });

  it('importTemplate participates in undo history', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc);
    const baselineWorkbookMeta = cloneStructured(
      createReportDesignerCore({ document: doc, config: defaultConfig }).getMetadata({ kind: 'workbook' }),
    );
    const imported = cloneStructured(doc);
    imported.semantic = {
      ...(imported.semantic ?? {}),
      workbookMeta: { title: 'Imported Report' },
    };

    const core = createReportDesignerCore({
      document: doc,
      config: defaultConfig,
      profile: {
        id: 'json-profile',
        kind: 'report-template',
        fieldSourceIds: [],
        fieldDropIds: [],
        codecId: 'json-codec',
      },
      adapters: {
        codecs: new Map([
          [
            'json-codec',
            {
              id: 'json-codec',
              importDocument: vi.fn(async () => imported),
              exportDocument: vi.fn(async () => ({})),
            },
          ],
        ]),
      },
    });

    const result = await core.dispatch({
      type: 'report-designer:importTemplate',
      payload: { foo: 'bar' },
    });

    expect(result.ok).toBe(true);
    expect(core.getSnapshot().dirty).toBe(false);
    expect(core.getSnapshot().canUndo).toBe(true);
    expect(core.getMetadata({ kind: 'workbook' })).toEqual({ title: 'Imported Report' });

    await core.dispatch({ type: 'report-designer:undo' });

    expect(core.getMetadata({ kind: 'workbook' })).toEqual(baselineWorkbookMeta);
    expect(core.getSnapshot().dirty).toBe(true);
  });

  it('should fail export when no codec configured in profile', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc);
    const core = createReportDesignerCore({ document: doc, config: defaultConfig });

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
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc);
    const core = createReportDesignerCore({ document: doc, config: defaultConfig });

    await core.setSelectionTarget({ kind: 'workbook' });
    const snap = core.getSnapshot();
    expect(snap.selectionTarget?.kind).toBe('workbook');
  });

  it('resolves inspector schema from byTarget config for current selection', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc);
    const core = createReportDesignerCore({
      document: doc,
      config: {
        kind: 'report-template',
        inspector: {
          byTarget: {
            workbook: { type: 'text', text: 'Workbook inspector' },
          },
        },
      },
    });

    await core.setSelectionTarget({ kind: 'workbook' });

    expect(core.getSnapshot().inspector.resolvedSchema).toEqual({
      type: 'text',
      text: 'Workbook inspector',
    });
  });

  it('setMetadata participates in undo history', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc);
    const sheetId = spreadsheetDoc.workbook.sheets[0].id;
    const core = createReportDesignerCore({ document: doc, config: defaultConfig });
    const target: ReportSelectionTarget = {
      kind: 'cell',
      cell: { sheetId, address: 'A1', row: 0, col: 0 },
    };

    core.setMetadata(target, { field: 'direct' });
    expect(core.getSnapshot().canUndo).toBe(true);

    await core.dispatch({ type: 'report-designer:undo' });

    expect(core.getMetadata(target)).toBeUndefined();
    expect(core.getSnapshot().dirty).toBe(false);
  });

  it('syncSpreadsheetDocument participates in undo history', async () => {
    const spreadsheetDoc = createEmptyDocument();
    const doc = createReportTemplateDocument(spreadsheetDoc);
    const core = createReportDesignerCore({ document: doc, config: defaultConfig });
    const nextSpreadsheet = cloneStructured(doc.spreadsheet);
    nextSpreadsheet.workbook.sheets[0]!.cells = {
      A1: { value: 'synced-cell', type: 'string' } as any,
    };

    core.syncSpreadsheetDocument(nextSpreadsheet);
    expect(core.getSnapshot().canUndo).toBe(true);

    await core.dispatch({ type: 'report-designer:undo' });

    expect(core.getSnapshot().document.spreadsheet.workbook.sheets[0]!.cells?.A1).toBeUndefined();
  });
});
