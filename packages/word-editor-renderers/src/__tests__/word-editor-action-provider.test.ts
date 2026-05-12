import { describe, expect, it, vi } from 'vitest';
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
    saveDocument: vi.fn(() => savedDocument),
    saveDatasets: vi.fn(),
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

describe('createWordEditorActionProvider', () => {
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
      saveEvent: async () => ({ ok: false, error: new Error('save failed') }),
    });

    const result = await provider.invoke('save', undefined, {} as ActionContext);

    expect(result.ok).toBe(false);
    expect(editorStore.setDirty).not.toHaveBeenCalledWith(false);
  });

  it('updates saved extras only after successful host save', async () => {
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
      saveEvent: async (): Promise<ActionResult> => ({ ok: true }),
      onDocumentSaved,
    });

    const result = await provider.invoke('save', undefined, {} as ActionContext);

    expect(result.ok).toBe(true);
    expect(editorStore.setDirty).toHaveBeenCalledWith(false);
    expect(onDocumentSaved).toHaveBeenCalledWith(savedDocument);
  });

  it('preserves saveDocument root cause through the returned action error', async () => {
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
    });

    const { saveDocument } = await import('@nop-chaos/word-editor-core');
    vi.mocked(saveDocument).mockImplementationOnce(() => {
      throw quotaError;
    });

    const result = await provider.invoke('save', undefined, {} as ActionContext);

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('Unable to save word document.');
    expect((result.error as Error).cause).toBe(quotaError);
    expect(editorStore.setDirty).not.toHaveBeenCalledWith(false);
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
      saveEvent: async (): Promise<ActionResult> => ({ ok: true }),
      onDocumentSaved,
    });
    const controller = new AbortController();
    controller.abort();

    const result = await provider.invoke('save', undefined, {
      signal: controller.signal,
    } as ActionContext);

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe('Word document save was aborted.');
    expect(editorStore.setDirty).not.toHaveBeenCalledWith(false);
    expect(onDocumentSaved).not.toHaveBeenCalled();
  });
});
