import { describe, expect, it, vi } from 'vitest';
import type { ActionContext, ActionResult } from '@nop-chaos/flux-core';
import type {
  CanvasEditorBridge,
  DatasetStoreApi,
  DocChart,
  DocCode,
  EditorStoreApi,
} from '@nop-chaos/word-editor-core';
import { createWordEditorActionProvider } from '../word-editor-action-provider.js';

vi.mock('@nop-chaos/word-editor-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/word-editor-core')>();
  return {
    ...actual,
    saveDocument: vi.fn(() => true),
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
    expect(onDocumentSaved).toHaveBeenCalledWith({
      charts: [mockChart()],
      codes: [mockCode()],
    });
  });
});
