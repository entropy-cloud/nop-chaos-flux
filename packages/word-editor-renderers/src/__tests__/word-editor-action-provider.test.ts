import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionContext, ActionResult } from '@nop-chaos/flux-core';
import type {
  CanvasEditorBridge,
  DatasetStoreApi,
  DocChart,
  DocCode,
  EditorStoreApi,
  SavedDocumentData,
} from '@nop-chaos/word-editor-core';
import { createWordEditorActionProvider } from '../word-editor-action-provider.js';

const savedDocument: SavedDocumentData = {
  data: {
    header: [],
    main: [{ value: 'saved' }] as any,
    footer: [],
    charts: [mockChart()],
    codes: [mockCode()],
  },
  paperSettings: {
    width: 595,
    height: 842,
    direction: 'vertical',
    margins: [100, 120, 100, 120],
  },
  savedAt: '2026-05-11T00:00:00.000Z',
};

vi.mock('@nop-chaos/word-editor-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/word-editor-core')>();
  return {
    ...actual,
    captureDocumentSnapshot: vi.fn(() => savedDocument),
    persistSavedDocument: vi.fn(() => savedDocument),
    saveDatasets: vi.fn(),
    validateDocChart: vi.fn((chart) => ({
      valid:
        Boolean(chart?.chartName) &&
        Boolean(chart?.datasetId) &&
        Boolean(chart?.categoryField) &&
        Array.isArray(chart?.valueField) &&
        chart.valueField.length > 0,
      errors: [],
    })),
    validateDocCode: vi.fn((code) => ({
      valid: Boolean(code?.codeName) && Boolean(code?.datasetId) && Boolean(code?.valueField),
      errors: [],
    })),
  };
});

type PartialEditorStoreApi = Partial<EditorStoreApi> & Pick<EditorStoreApi, 'setDirty'>;
type PartialDatasetStoreApi = Pick<DatasetStoreApi, 'getAll'>;

function mockChart(overrides: Partial<DocChart> = {}): DocChart {
  return {
    id: overrides.id ?? 'chart-1',
    chartName: overrides.chartName ?? 'Chart',
    chartType: 'bar',
    showChartName: true,
    datasetId: '',
    categoryField: '',
    valueField: [],
    ...overrides,
  };
}

function mockCode(overrides: Partial<DocCode> = {}): DocCode {
  return {
    id: overrides.id ?? 'code-1',
    codeName: overrides.codeName ?? 'Code',
    codeType: 'barcode',
    datasetId: '',
    valueField: '',
    ...overrides,
  };
}

function createMinimalEditorStore(): EditorStoreApi {
  return {
    setDirty: vi.fn(),
    getState: () => ({
      paperSettings: {
        width: 595,
        height: 842,
        direction: 'vertical',
        margins: [100, 120, 100, 120],
      },
    }),
  } as unknown as EditorStoreApi;
}

function defaultPaperSettings() {
  return { width: 595, height: 842, direction: 'vertical' as const, margins: [100, 120, 100, 120] as [number, number, number, number] };
}

describe('createWordEditorActionProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps dirty state when host save fails', async () => {
    const editorStore: PartialEditorStoreApi = { setDirty: vi.fn() };
    const provider = createWordEditorActionProvider({
      bridge: {} as CanvasEditorBridge,
      editorStore: editorStore as EditorStoreApi,
      datasetStore: { getAll: () => [] } as PartialDatasetStoreApi as DatasetStoreApi,
      getCharts: () => [mockChart()],
      setCharts: () => undefined,
      getCodes: () => [mockCode()],
      setCodes: () => undefined,
      getPaperSettings: defaultPaperSettings,
      saveEvent: async () => ({ ok: false, error: new Error('save failed') }),
    });

    const result = await provider.invoke('save', undefined, {} as ActionContext);

    expect(result.ok).toBe(false);
    expect(editorStore.setDirty).not.toHaveBeenCalledWith(false);
  });

  it('updates saved extras only after successful host save', async () => {
    const onDocumentSaved = vi.fn();
    const saveEvent = vi.fn(async (): Promise<ActionResult> => ({ ok: true }));
    const editorStore: PartialEditorStoreApi = { setDirty: vi.fn() };
    const provider = createWordEditorActionProvider({
      bridge: {} as CanvasEditorBridge,
      editorStore: editorStore as EditorStoreApi,
      datasetStore: { getAll: () => [] } as PartialDatasetStoreApi as DatasetStoreApi,
      getCharts: () => [mockChart()],
      setCharts: () => undefined,
      getCodes: () => [mockCode()],
      setCodes: () => undefined,
      getPaperSettings: defaultPaperSettings,
      saveEvent,
      onDocumentSaved,
    });

    const result = await provider.invoke('save', undefined, {} as ActionContext);

    expect(result.ok).toBe(true);
    expect(saveEvent).toHaveBeenCalledWith(savedDocument, expect.anything());
    expect(editorStore.setDirty).toHaveBeenCalledWith(false);
    expect(onDocumentSaved).toHaveBeenCalledWith(savedDocument);
    const { persistSavedDocument } = await import('@nop-chaos/word-editor-core');
    expect(vi.mocked(persistSavedDocument)).toHaveBeenCalledWith(savedDocument);
  });

  it('preserves snapshot root cause through the returned action error', async () => {
    const editorStore: PartialEditorStoreApi = { setDirty: vi.fn() };
    const quotaError = new Error('quota exceeded');
    const provider = createWordEditorActionProvider({
      bridge: {} as CanvasEditorBridge,
      editorStore: editorStore as EditorStoreApi,
      datasetStore: { getAll: () => [] } as PartialDatasetStoreApi as DatasetStoreApi,
      getCharts: () => [mockChart()],
      setCharts: () => undefined,
      getCodes: () => [mockCode()],
      setCodes: () => undefined,
      getPaperSettings: defaultPaperSettings,
    });

    const { captureDocumentSnapshot } = await import('@nop-chaos/word-editor-core');
    vi.mocked(captureDocumentSnapshot).mockImplementationOnce(() => {
      throw quotaError;
    });

    const result = await provider.invoke('save', undefined, {} as ActionContext);

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('Unable to save word document.');
    expect((result.error as Error).cause).toBe(quotaError);
    expect(editorStore.setDirty).not.toHaveBeenCalledWith(false);
  });

  it('does not persist recovery baseline when host save fails', async () => {
    const editorStore: PartialEditorStoreApi = { setDirty: vi.fn() };
    const onDocumentSaved = vi.fn();
    const provider = createWordEditorActionProvider({
      bridge: {} as CanvasEditorBridge,
      editorStore: editorStore as EditorStoreApi,
      datasetStore: { getAll: () => [] } as PartialDatasetStoreApi as DatasetStoreApi,
      getCharts: () => [mockChart()],
      setCharts: () => undefined,
      getCodes: () => [mockCode()],
      setCodes: () => undefined,
      getPaperSettings: defaultPaperSettings,
      saveEvent: async () => ({ ok: false, error: new Error('save failed') }),
      onDocumentSaved,
    });

    const result = await provider.invoke('save', undefined, {} as ActionContext);
    const { persistSavedDocument, saveDatasets } = await import('@nop-chaos/word-editor-core');

    expect(result.ok).toBe(false);
    expect(vi.mocked(persistSavedDocument)).not.toHaveBeenCalled();
    expect(vi.mocked(saveDatasets)).not.toHaveBeenCalled();
    expect(onDocumentSaved).not.toHaveBeenCalled();
  });

  it('persists datasets only after the save succeeds', async () => {
    const events: string[] = [];
    const editorStore: PartialEditorStoreApi = { setDirty: vi.fn(() => events.push('dirty:false')) };
    const { persistSavedDocument, saveDatasets } = await import('@nop-chaos/word-editor-core');
    vi.mocked(persistSavedDocument).mockImplementationOnce(() => {
      events.push('persist');
      return savedDocument;
    });
    vi.mocked(saveDatasets).mockImplementationOnce(() => {
      events.push('datasets');
    });
    const saveEvent = vi.fn(async (): Promise<ActionResult> => {
      events.push('save-event');
      return { ok: true };
    });
    const provider = createWordEditorActionProvider({
      bridge: {} as CanvasEditorBridge,
      editorStore: editorStore as EditorStoreApi,
      datasetStore: { getAll: () => [] } as PartialDatasetStoreApi as DatasetStoreApi,
      getCharts: () => [mockChart()],
      setCharts: () => undefined,
      getCodes: () => [mockCode()],
      setCodes: () => undefined,
      getPaperSettings: defaultPaperSettings,
      saveEvent,
    });

    const result = await provider.invoke('save', undefined, {} as ActionContext);

    expect(result.ok).toBe(true);
    expect(events).toEqual(['save-event', 'persist', 'datasets', 'dirty:false']);
  });

  it('does not clear dirty state after saveEvent when the action signal is aborted', async () => {
    const onDocumentSaved = vi.fn();
    const editorStore: PartialEditorStoreApi = { setDirty: vi.fn() };
    const provider = createWordEditorActionProvider({
      bridge: {} as CanvasEditorBridge,
      editorStore: editorStore as EditorStoreApi,
      datasetStore: { getAll: () => [] } as PartialDatasetStoreApi as DatasetStoreApi,
      getCharts: () => [mockChart()],
      setCharts: () => undefined,
      getCodes: () => [mockCode()],
      setCodes: () => undefined,
      getPaperSettings: defaultPaperSettings,
      saveEvent: async (): Promise<ActionResult> => ({ ok: true }),
      onDocumentSaved,
    });
    const controller = new AbortController();
    const abortReason = new Error('user-cancelled');
    controller.abort(abortReason);

    const result = await provider.invoke('save', undefined, {
      signal: controller.signal,
    } as ActionContext);

    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.error).toBe(abortReason);
    expect(editorStore.setDirty).not.toHaveBeenCalledWith(false);
    expect(onDocumentSaved).not.toHaveBeenCalled();
  });

  it('rejects insertChart when manifest-required fields are missing', async () => {
    const bridge = { insertChart: vi.fn() } as unknown as CanvasEditorBridge;
    const provider = createWordEditorActionProvider({
      bridge,
      editorStore: createMinimalEditorStore(),
      datasetStore: { getAll: () => [] } as PartialDatasetStoreApi as DatasetStoreApi,
      getCharts: () => [],
      setCharts: () => undefined,
      getCodes: () => [],
      setCodes: () => undefined,
      getPaperSettings: defaultPaperSettings,
    });

    const result = await provider.invoke('insertChart', {
      id: 'chart-1',
      chartName: 'Chart',
      chartType: 'bar',
      showChartName: true,
      datasetId: '',
      categoryField: '',
      valueField: [],
    } as unknown as Record<string, unknown>, {} as ActionContext);

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe('insertChart requires a complete chart payload.');
  });

  it('rejects insertCode when manifest-required fields are missing', async () => {
    const bridge = { insertCode: vi.fn() } as unknown as CanvasEditorBridge;
    const provider = createWordEditorActionProvider({
      bridge,
      editorStore: createMinimalEditorStore(),
      datasetStore: { getAll: () => [] } as PartialDatasetStoreApi as DatasetStoreApi,
      getCharts: () => [],
      setCharts: () => undefined,
      getCodes: () => [],
      setCodes: () => undefined,
      getPaperSettings: defaultPaperSettings,
    });

    const result = await provider.invoke('insertCode', {
      id: 'code-1',
      codeName: 'Code',
      codeType: 'barcode',
      datasetId: '',
      valueField: '',
    } as unknown as Record<string, unknown>, {} as ActionContext);

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe('insertCode requires a complete code payload.');
  });

  it('rejects insertChart payloads that violate the published manifest shape', async () => {
    const bridge = { insertChart: vi.fn() } as unknown as CanvasEditorBridge;
    const provider = createWordEditorActionProvider({
      bridge,
      editorStore: createMinimalEditorStore(),
      datasetStore: { getAll: () => [] } as PartialDatasetStoreApi as DatasetStoreApi,
      getCharts: () => [],
      setCharts: () => undefined,
      getCodes: () => [],
      setCodes: () => undefined,
      getPaperSettings: defaultPaperSettings,
    });

    const result = await provider.invoke(
      'insertChart',
      {
        id: 'chart-1',
        chartName: 'Chart',
        chartType: 'bar',
        showChartName: 'yes',
        datasetId: 'ds',
        categoryField: 'month',
        valueField: ['value'],
      } as unknown as Record<string, unknown>,
      {} as ActionContext,
    );

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe(
      'word-editor:insertChart payload does not match the published host args contract.',
    );
    expect(bridge.insertChart).not.toHaveBeenCalled();
  });

  it('rejects chart and code enum values outside the published manifest union', async () => {
    const bridge = { insertChart: vi.fn(), insertCode: vi.fn() } as unknown as CanvasEditorBridge;
    const provider = createWordEditorActionProvider({
      bridge,
      editorStore: createMinimalEditorStore(),
      datasetStore: { getAll: () => [] } as PartialDatasetStoreApi as DatasetStoreApi,
      getCharts: () => [],
      setCharts: () => undefined,
      getCodes: () => [],
      setCodes: () => undefined,
      getPaperSettings: defaultPaperSettings,
    });

    const chartResult = await provider.invoke(
      'insertChart',
      {
        id: 'chart-1',
        chartName: 'Chart',
        chartType: 'radar',
        showChartName: true,
        datasetId: 'ds',
        categoryField: 'month',
        valueField: ['value'],
      } as unknown as Record<string, unknown>,
      {} as ActionContext,
    );
    const codeResult = await provider.invoke(
      'insertCode',
      {
        id: 'code-1',
        codeName: 'Code',
        codeType: 'aztec',
        datasetId: 'ds',
        valueField: 'value',
      } as unknown as Record<string, unknown>,
      {} as ActionContext,
    );

    expect(chartResult.ok).toBe(false);
    expect((chartResult.error as Error).message).toBe(
      'word-editor:insertChart payload does not match the published host args contract.',
    );
    expect(codeResult.ok).toBe(false);
    expect((codeResult.error as Error).message).toBe(
      'word-editor:insertCode payload does not match the published host args contract.',
    );
  });
});
