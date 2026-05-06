import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import type { PreviewResult, FieldSourceProvider } from '../adapters.js';
import type { FieldSourceSnapshot } from '../types.js';
import {
  createEmptyDocument,
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerCore,
  type ReportTemplateDocument,
  type ReportSelectionTarget,
  type ReportDesignerConfig,
} from './test-utils.js';

function cloneStructured<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

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

  it('setMetadata participates in undo history', async () => {
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

  it('should export document', () => {
    const exported = core.exportDocument();
    expect(exported.id).toBe(doc.id);
  });

  it('syncs spreadsheet document into the exported report document', () => {
    const nextSpreadsheet = cloneStructured(doc.spreadsheet);
    const firstSheet = nextSpreadsheet.workbook.sheets[0]!;
    firstSheet.cells = {
      ...(firstSheet.cells ?? {}),
      A1: {
        value: 'synced-cell',
        type: 'string',
      } as any,
    };

    core.syncSpreadsheetDocument(nextSpreadsheet);

    const syncedSheet = core.getSnapshot().document.spreadsheet.workbook.sheets[0]!;
    const exportedSheet = core.exportDocument().spreadsheet.workbook.sheets[0]!;

    expect(syncedSheet.cells?.A1?.value).toBe('synced-cell');
    expect(exportedSheet.cells?.A1?.value).toBe('synced-cell');
  });

  it('syncSpreadsheetDocument preserves the provided spreadsheet subtree reference', () => {
    const nextSpreadsheet = cloneStructured(doc.spreadsheet);
    nextSpreadsheet.workbook.sheets[0]!.cells = {
      A1: { value: 'synced-cell', type: 'string' } as any,
    };

    core.syncSpreadsheetDocument(nextSpreadsheet);

    expect(core.getSnapshot().document.spreadsheet).toBe(nextSpreadsheet);
  });

  it('syncSpreadsheetDocument participates in undo history', async () => {
    const nextSpreadsheet = cloneStructured(doc.spreadsheet);
    nextSpreadsheet.workbook.sheets[0]!.cells = {
      A1: { value: 'synced-cell', type: 'string' } as any,
    };

    core.syncSpreadsheetDocument(nextSpreadsheet);
    expect(core.getSnapshot().canUndo).toBe(true);

    await core.dispatch({ type: 'report-designer:undo' });

    expect(core.getSnapshot().document.spreadsheet.workbook.sheets[0]!.cells?.A1).toBeUndefined();
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
    core.subscribe(() => {
      notified = true;
    });

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

  it('keeps the latest preview result when an older preview resolves later', async () => {
    let resolveFirst: ((value: { ok: boolean; data: unknown }) => void) | undefined;
    let resolveSecond: ((value: { ok: boolean; data: unknown }) => void) | undefined;

    const previewCore = createReportDesignerCore({
      document: doc,
      config: {
        kind: 'report-template',
        preview: { provider: 'async-preview' },
      },
      adapters: {
        previews: new Map([
          [
            'async-preview',
            {
              id: 'async-preview',
              preview: vi
                .fn()
                .mockImplementationOnce(
                  () =>
                    new Promise((resolve) => {
                      resolveFirst = resolve;
                    }),
                )
                .mockImplementationOnce(
                  () =>
                    new Promise((resolve) => {
                      resolveSecond = resolve;
                    }),
                ),
            },
          ],
        ]),
      },
    });

    const first = previewCore.dispatch({ type: 'report-designer:preview', mode: 'inline' });
    const second = previewCore.dispatch({ type: 'report-designer:preview', mode: 'dialog' });

    expect(previewCore.getSnapshot().preview.running).toBe(true);
    expect(previewCore.getSnapshot().preview.mode).toBe('dialog');

    resolveFirst?.({ ok: true, data: { request: 'stale' } });
    await Promise.resolve();

    expect(previewCore.getSnapshot().preview.running).toBe(true);
    expect(previewCore.getSnapshot().preview.lastResult).toBeUndefined();

    resolveSecond?.({ ok: true, data: { request: 'latest' } });

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(true);
    expect(previewCore.getSnapshot().preview.running).toBe(false);
    expect(previewCore.getSnapshot().preview.mode).toBe('dialog');
    expect(previewCore.getSnapshot().preview.lastResult).toEqual({
      ok: true,
      data: { request: 'latest' },
    });
  });

  it('aborts in-flight preview on stopPreview without letting stale completion publish', async () => {
    let observedSignal: AbortSignal | undefined;
    let resolvePreview: ((value: { ok: boolean; data: unknown }) => void) | undefined;

    const previewCore = createReportDesignerCore({
      document: doc,
      config: {
        kind: 'report-template',
        preview: { provider: 'abortable-preview' },
      },
      adapters: {
        previews: new Map([
          [
            'abortable-preview',
            {
              id: 'abortable-preview',
              preview: vi.fn(async ({ signal }): Promise<PreviewResult> => {
                observedSignal = signal;
                return new Promise((resolve, reject) => {
                  resolvePreview = resolve as (value: { ok: boolean; data: unknown }) => void;
                  signal?.addEventListener('abort', () => {
                    reject(new DOMException('Aborted', 'AbortError'));
                  });
                });
              }),
            },
          ],
        ]),
      },
    });

    const previewPromise = previewCore.dispatch({
      type: 'report-designer:preview',
      mode: 'inline',
    });
    await Promise.resolve();

    const stopResult = await previewCore.dispatch({ type: 'report-designer:stopPreview' });
    const previewResult = await previewPromise;

    expect(stopResult.ok).toBe(true);
    expect(observedSignal?.aborted).toBe(true);
    expect(previewResult.ok).toBe(false);
    expect((previewResult.error as Error).name).toBe('AbortError');
    expect(previewCore.getSnapshot().preview.running).toBe(false);
    expect(previewCore.getSnapshot().preview.lastResult).toBeUndefined();

    resolvePreview?.({ ok: true, data: { request: 'should-not-publish' } });
    await Promise.resolve();

    expect(previewCore.getSnapshot().preview.lastResult).toBeUndefined();
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

  it('importTemplate participates in undo history', async () => {
    const baselineWorkbookMeta = cloneStructured(core.getMetadata({ kind: 'workbook' }));
    const imported = cloneStructured(doc);
    imported.semantic = {
      ...(imported.semantic ?? {}),
      workbookMeta: { title: 'Imported Report' },
    };

    const importCore = createReportDesignerCore({
      document: doc,
      config: { kind: 'report-template' },
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

    const result = await importCore.dispatch({
      type: 'report-designer:importTemplate',
      payload: { foo: 'bar' },
    });

    expect(result.ok).toBe(true);
    expect(importCore.getSnapshot().canUndo).toBe(true);
    expect(importCore.getMetadata({ kind: 'workbook' })).toEqual({ title: 'Imported Report' });

    await importCore.dispatch({ type: 'report-designer:undo' });

    expect(importCore.getMetadata({ kind: 'workbook' })).toEqual(baselineWorkbookMeta);
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

  it('resolves inspector schema from byTarget config for current selection', async () => {
    const inspectorCore = createReportDesignerCore({
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

    await inspectorCore.setSelectionTarget({ kind: 'workbook' });

    expect(inspectorCore.getSnapshot().inspector.resolvedSchema).toEqual({
      type: 'text',
      text: 'Workbook inspector',
    });
  });

  it('should refresh field sources', async () => {
    const sources = await core.refreshFieldSources();
    expect(Array.isArray(sources)).toBe(true);
  });

  it('aborts stale selection refreshes and dispose aborts in-flight work', async () => {
    const resolvers: Array<(value: any) => void> = [];

    const fieldSourceProvider = {
      id: 'async-provider',
      load: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvers.push(resolve);
          }),
      ),
    };

    const asyncCore = createReportDesignerCore({
      document: doc,
      config: {
        kind: 'report-template',
        fieldSources: [{ id: 'remote', label: 'Remote', provider: 'async-provider', groups: [] }],
      },
      adapters: {
        fieldSources: new Map([[fieldSourceProvider.id, fieldSourceProvider]]),
      },
    });

    const first = asyncCore.setSelectionTarget({ kind: 'workbook' });
    const second = asyncCore.setSelectionTarget({ kind: 'sheet', sheetId });

    expect(resolvers.length).toBe(1);

    resolvers[0]?.([{ id: 'initial', label: 'Initial', groups: [] }]);
    await Promise.allSettled([first]);
    expect(asyncCore.getSnapshot().fieldSources).toEqual([{ id: 'initial', label: 'Initial', groups: [] }]);

    asyncCore.dispose();
    await Promise.allSettled([second]);
    expect(asyncCore.getSnapshot().fieldSources).toEqual([{ id: 'initial', label: 'Initial', groups: [] }]);
  });

  it('reuses the same in-flight field-source refresh during startup and explicit refresh', async () => {
    let resolveLoad: ((value: FieldSourceSnapshot[]) => void) | undefined;
    const fieldSourceProvider: FieldSourceProvider = {
      id: 'async-provider',
      load: vi.fn(
        () =>
          new Promise<FieldSourceSnapshot[]>((resolve) => {
            resolveLoad = resolve;
          }),
      ),
    };

    const asyncCore = createReportDesignerCore({
      document: doc,
      config: {
        kind: 'report-template',
        fieldSources: [{ id: 'remote', label: 'Remote', provider: 'async-provider', groups: [] }],
      },
      adapters: {
        fieldSources: new Map([[fieldSourceProvider.id, fieldSourceProvider]]),
      },
    });

    const refreshPromise = asyncCore.refreshFieldSources();
    expect(fieldSourceProvider.load).toHaveBeenCalledTimes(1);

    resolveLoad?.([{ id: 'remote', label: 'Remote', groups: [] }]);

    await expect(refreshPromise).resolves.toEqual([{ id: 'remote', label: 'Remote', groups: [] }]);
    expect(fieldSourceProvider.load).toHaveBeenCalledTimes(1);
  });

  it('reuses one document snapshot for adapter context and designer snapshot', async () => {
    let receivedContext:
      | import('../adapters.js').ReportDesignerAdapterContext
      | undefined;

    const fieldSourceProvider: FieldSourceProvider = {
      id: 'clone-count-provider',
      load: vi.fn(async (context) => {
        receivedContext = context;
        return [];
      }),
    };

    const cloneCore = createReportDesignerCore({
      document: doc,
      config: {
        kind: 'report-template',
        fieldSources: [
          { id: 'remote', label: 'Remote', provider: 'clone-count-provider', groups: [] },
        ],
      },
      adapters: {
        fieldSources: new Map([[fieldSourceProvider.id, fieldSourceProvider]]),
      },
    });

    await cloneCore.refreshFieldSources();

    expect(receivedContext).toBeDefined();
    expect(receivedContext?.document).toBe(receivedContext?.designer.document);
  });
});
