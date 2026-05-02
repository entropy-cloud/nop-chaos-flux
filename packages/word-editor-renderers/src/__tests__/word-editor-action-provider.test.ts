import { describe, expect, it, vi } from 'vitest';
import { createWordEditorActionProvider } from '../word-editor-action-provider.js';

vi.mock('@nop-chaos/word-editor-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/word-editor-core')>();
  return {
    ...actual,
    saveDocument: vi.fn(() => true),
    saveDatasets: vi.fn(),
  };
});

describe('createWordEditorActionProvider', () => {
  it('keeps dirty state when host save fails', async () => {
    const editorStore = { setDirty: vi.fn() };
    const provider = createWordEditorActionProvider({
      bridge: {} as any,
      editorStore: editorStore as any,
      datasetStore: { getAll: () => [] } as any,
      getCharts: () => [{ id: 'chart-1', chartName: 'Chart' } as any],
      setCharts: () => undefined,
      getCodes: () => [{ id: 'code-1', codeName: 'Code' } as any],
      setCodes: () => undefined,
      saveEvent: async () => ({ ok: false, error: new Error('save failed') }),
    });

    const result = await provider.invoke('save', undefined, {} as any);

    expect(result.ok).toBe(false);
    expect(editorStore.setDirty).not.toHaveBeenCalledWith(false);
  });

  it('updates saved extras only after successful host save', async () => {
    const onDocumentSaved = vi.fn();
    const editorStore = { setDirty: vi.fn() };
    const provider = createWordEditorActionProvider({
      bridge: {} as any,
      editorStore: editorStore as any,
      datasetStore: { getAll: () => [] } as any,
      getCharts: () => [{ id: 'chart-1', chartName: 'Chart' } as any],
      setCharts: () => undefined,
      getCodes: () => [{ id: 'code-1', codeName: 'Code' } as any],
      setCodes: () => undefined,
      saveEvent: async () => ({ ok: true }),
      onDocumentSaved,
    });

    const result = await provider.invoke('save', undefined, {} as any);

    expect(result.ok).toBe(true);
    expect(editorStore.setDirty).toHaveBeenCalledWith(false);
    expect(onDocumentSaved).toHaveBeenCalledWith({
      charts: [{ id: 'chart-1', chartName: 'Chart' }],
      codes: [{ id: 'code-1', codeName: 'Code' }],
    });
  });
});
