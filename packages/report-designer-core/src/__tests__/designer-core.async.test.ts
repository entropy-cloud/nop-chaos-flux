import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PreviewResult, FieldSourceProvider } from '../adapters.js';
import type { FieldSourceSnapshot } from '../types.js';
import {
  createEmptyDocument,
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerConfig,
  type ReportDesignerCore,
  type ReportTemplateDocument,
} from './test-utils.js';

const defaultConfig: ReportDesignerConfig = {
  kind: 'report-template',
};

describe('createReportDesignerCore async behavior', () => {
  let core: ReportDesignerCore;
  let doc: ReportTemplateDocument;
  let sheetId: string;

  beforeEach(() => {
    const spreadsheetDoc = createEmptyDocument();
    sheetId = spreadsheetDoc.workbook.sheets[0].id;
    doc = createReportTemplateDocument(spreadsheetDoc);
    core = createReportDesignerCore({ document: doc, config: defaultConfig });
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

  it('should refresh field sources', async () => {
    const sources = await core.refreshFieldSources();
    expect(Array.isArray(sources)).toBe(true);
  });

  it('aborts stale selection refreshes and dispose aborts in-flight work', async () => {
    const resolvers: Array<(value: any) => void> = [];
    const observedSignals: AbortSignal[] = [];

    const fieldSourceProvider = {
      id: 'async-provider',
      load: vi.fn().mockImplementation(
        (_context, options?: { signal?: AbortSignal }) =>
          new Promise((resolve) => {
            if (options?.signal) {
              observedSignals.push(options.signal);
            }
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
    expect(observedSignals[0]?.aborted).toBe(false);

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

  it('aborts an explicit in-flight field-source refresh on dispose', async () => {
    let observedSignal: AbortSignal | undefined;

    const fieldSourceProvider: FieldSourceProvider = {
      id: 'async-provider',
      load: vi.fn(
        async (_context, options) =>
          await new Promise<FieldSourceSnapshot[]>((_resolve, reject) => {
            observedSignal = options?.signal;
            options?.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
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
    await Promise.resolve();

    asyncCore.dispose();

    expect(observedSignal?.aborted).toBe(true);
    await expect(refreshPromise).resolves.toEqual([]);
  });

  it('reports startup refreshDerivedState failures through onError', async () => {
    const startupError = new Error('field source failed');
    const onError = vi.fn();
    const fieldSourceProvider: FieldSourceProvider = {
      id: 'async-provider',
      load: vi.fn(async () => {
        throw startupError;
      }),
    };

    createReportDesignerCore({
      document: doc,
      config: {
        kind: 'report-template',
        fieldSources: [{ id: 'remote', label: 'Remote', provider: 'async-provider', groups: [] }],
      },
      adapters: {
        fieldSources: new Map([[fieldSourceProvider.id, fieldSourceProvider]]),
      },
      onError,
    });

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        startupError,
        expect.objectContaining({ phase: 'refresh-derived-state' }),
      );
    });
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
