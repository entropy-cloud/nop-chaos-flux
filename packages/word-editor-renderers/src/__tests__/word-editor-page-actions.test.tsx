// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import * as FluxReact from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createDefaultRegistry, createSchemaRenderer } from '@nop-chaos/flux-react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { registerWordEditorRenderers, defineWordEditorPageSchema } from '../index.js';
import * as wordEditorActionProvider from '../word-editor-action-provider.js';
import { WordEditorPage } from '../word-editor-page.js';

const mockedCore = vi.hoisted(() => ({
  saveDocumentMock: vi.fn(() => true),
  saveDatasetsMock: vi.fn(),
  loadDatasetsMock: vi.fn(() => []),
}));

const mockState: {
  shortcutOptions: { onSave?: () => void } | undefined;
  lastEditorCanvasProps: any;
  lastDatasetDialogProps: any;
  datasetState: {
    datasets: Array<{ id: string; name: string }>;
    selectedDatasetId: string | null;
  };
} = {
  shortcutOptions: undefined,
  lastEditorCanvasProps: undefined,
  lastDatasetDialogProps: undefined,
  datasetState: {
    datasets: [],
    selectedDatasetId: null,
  },
};

const editorStoreState = {
  isReady: true,
  isDirty: false,
  wordCount: 0,
  currentPage: 1,
  totalPages: 1,
  scale: 1,
  selection: {
    bold: false,
    italic: false,
    underline: false,
    strikeout: false,
    superscript: false,
    subscript: false,
    font: null,
    size: 16,
    color: null,
    highlight: null,
    rowFlex: null,
    level: null,
    listType: null,
    listStyle: null,
    rowMargin: 0,
    undo: false,
    redo: false,
  },
};

const editorStore = {
  subscribe: () => () => undefined,
  getState: () => editorStoreState,
  setDirty: vi.fn(),
};

const datasetListeners = new Set<() => void>();

const datasetStore = {
  subscribe: (listener: () => void) => {
    datasetListeners.add(listener);
    return () => datasetListeners.delete(listener);
  },
  getState: () => mockState.datasetState,
  load: vi.fn((datasets: Array<{ id: string; name: string }>) => {
    mockState.datasetState = { ...mockState.datasetState, datasets };
    for (const listener of datasetListeners) listener();
  }),
  getAll: vi.fn(() => mockState.datasetState.datasets),
  getById: vi.fn(
    (id: string) => mockState.datasetState.datasets.find((dataset) => dataset.id === id) ?? null,
  ),
  add: vi.fn((dataset: { name: string }) => {
    const next = { id: `dataset-${mockState.datasetState.datasets.length + 1}`, ...dataset };
    mockState.datasetState = {
      ...mockState.datasetState,
      datasets: [...mockState.datasetState.datasets, next],
    };
    for (const listener of datasetListeners) listener();
    return next;
  }),
  update: vi.fn((id: string, updates: { name?: string }) => {
    const current = mockState.datasetState.datasets.find((dataset) => dataset.id === id);
    if (!current) {
      return null;
    }

    const next = { ...current, ...updates };
    mockState.datasetState = {
      ...mockState.datasetState,
      datasets: mockState.datasetState.datasets.map((dataset) => (dataset.id === id ? next : dataset)),
    };
    for (const listener of datasetListeners) listener();
    return next;
  }),
};

function resetMockStores() {
  mockState.datasetState = {
    datasets: [],
    selectedDatasetId: null,
  };
  editorStore.setDirty.mockClear();
  mockedCore.saveDocumentMock.mockClear();
  mockedCore.saveDatasetsMock.mockClear();
  mockedCore.loadDatasetsMock.mockClear();
  mockState.shortcutOptions = undefined;
  datasetStore.load.mockClear();
  datasetStore.getAll.mockClear();
  datasetStore.getById.mockClear();
  datasetStore.add.mockClear();
  datasetStore.update.mockClear();
  mockState.lastEditorCanvasProps = undefined;
  mockState.lastDatasetDialogProps = undefined;
}

vi.mock('@nop-chaos/word-editor-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/word-editor-core')>();
  class CanvasEditorBridge {}
  return {
    ...actual,
    CanvasEditorBridge,
    RowFlex: actual.RowFlex ?? {
      LEFT: 'left',
      CENTER: 'center',
      RIGHT: 'right',
      JUSTIFY: 'justify',
    },
    TitleLevel: actual.TitleLevel ?? {
      FIRST: 'first',
      SECOND: 'second',
      THIRD: 'third',
      FOURTH: 'fourth',
      FIFTH: 'fifth',
      SIXTH: 'sixth',
    },
    ListType: actual.ListType ?? {
      UL: 'ul',
      OL: 'ol',
    },
    createEditorStore: () => editorStore,
    createDatasetStore: () => datasetStore,
    saveDocument: mockedCore.saveDocumentMock,
    loadDocument: vi.fn(() => null),
    saveDatasets: mockedCore.saveDatasetsMock,
    loadDatasets: mockedCore.loadDatasetsMock,
  };
});

vi.mock('../editor-canvas.js', () => ({
  EditorCanvas: (props: any) => {
    mockState.lastEditorCanvasProps = props;
    return <div data-testid="editor-canvas" />;
  },
}));

vi.mock('../toolbar/ribbon-toolbar.js', () => ({
  RibbonToolbar: () => <div data-testid="ribbon-toolbar" />,
}));

vi.mock('../panels/outline-panel.js', () => ({
  OutlinePanel: () => <div data-testid="outline-panel" />,
}));

vi.mock('../panels/dataset-panel.js', () => ({
  DatasetPanel: () => <div data-testid="dataset-panel" />,
}));

vi.mock('../panels/field-list.js', () => ({
  FieldList: () => <div data-testid="field-list" />,
}));

vi.mock('../dialogs/dataset-dialog.js', () => ({
  DatasetDialog: (props: any) => {
    mockState.lastDatasetDialogProps = props;
    return <div data-testid="dataset-dialog" />;
  },
}));

vi.mock('../hooks/use-word-editor-shortcuts.js', () => ({
  useWordEditorShortcuts: (options: { onSave?: () => void }) => {
    mockState.shortcutOptions = options;
  },
}));

function createEnv(notify: RendererEnv['notify'] = () => undefined): RendererEnv {
  return {
    fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
    notify,
  };
}

function renderWordEditor(input?: {
  schema?: Parameters<typeof defineWordEditorPageSchema>[0];
  extraRenderers?: RendererDefinition[];
  env?: RendererEnv;
}) {
  const registry = createDefaultRegistry(input?.extraRenderers ?? []);
  registerWordEditorRenderers(registry);
  const SchemaRenderer = createSchemaRenderer();

  render(
    <SchemaRenderer
      schemaUrl="test://word-editor/page"
      schema={defineWordEditorPageSchema({
        type: 'word-editor-page',
        ...(input?.schema ?? {}),
      })}
      env={input?.env ?? createEnv()}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
      data={{}}
    />,
  );
}

describe('WordEditorPage actions and events', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves through the word-editor action provider and forwards onSave', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();
    const notify = vi.fn();

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        onSave: { action: 'showToast', args: { message: 'save event fired' } },
      },
      env: createEnv(notify),
    });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(mockedCore.saveDocumentMock).toHaveBeenCalledTimes(1);
      expect(mockedCore.saveDatasetsMock).toHaveBeenCalledTimes(1);
      expect(editorStore.setDirty).toHaveBeenCalledWith(false);
      expect(notify).toHaveBeenCalledWith('info', 'save event fired');
    });
  });

  it('wires shortcut save through the same save handler', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    renderWordEditor();
    mockState.shortcutOptions?.onSave?.();

    await waitFor(() => {
      expect(mockedCore.saveDocumentMock).toHaveBeenCalledTimes(1);
      expect(mockedCore.saveDatasetsMock).toHaveBeenCalledTimes(1);
      expect(editorStore.setDirty).toHaveBeenCalledWith(false);
    });
  });

  it('persists datasets immediately after creating one from the dialog flow', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    renderWordEditor();

    expect(screen.getByTestId('dataset-dialog')).toBeTruthy();
    expect(mockState.lastDatasetDialogProps).toBeTruthy();

    mockState.lastDatasetDialogProps.onSave({
      name: 'Orders',
      description: 'Order dataset',
      type: 'static',
      columns: [],
    });

    await waitFor(() => {
      expect(datasetStore.add).toHaveBeenCalledTimes(1);
      expect(mockedCore.saveDatasetsMock).toHaveBeenCalledTimes(1);
      expect(mockedCore.saveDatasetsMock).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'Orders', description: 'Order dataset', type: 'static' }),
      ]);
    });
  });

  it('passes an AbortSignal into word-editor save actions', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    const invoke = vi.fn(async () => ({ ok: true }));
    const providerSpy = vi
      .spyOn(wordEditorActionProvider, 'createWordEditorActionProvider')
      .mockReturnValue({
        kind: 'host',
        listMethods() {
          return ['save'];
        },
        invoke,
      } as any);

    renderWordEditor();
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(1);
      const invokeCall = invoke.mock.calls[0] as unknown[] | undefined;
      const invokeCtx = invokeCall?.[2] as { signal?: AbortSignal } | undefined;
      expect(invokeCtx?.signal).toBeInstanceOf(AbortSignal);
    });

    providerSpy.mockRestore();
  });

  it('ignores concurrent save triggers while a save is already running', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    let resolveSave: ((value: { ok: boolean }) => void) | undefined;
    const saveProviderResult = new Promise<{ ok: boolean }>((resolve) => {
      resolveSave = resolve;
    });
    const invoke = vi.fn(async (method: string) => {
      if (method !== 'save') {
        return { ok: false, error: new Error('unexpected method') };
      }
      await saveProviderResult;
      return { ok: true };
    });
    const providerSpy = vi
      .spyOn(wordEditorActionProvider, 'createWordEditorActionProvider')
      .mockReturnValue({
        kind: 'host',
        listMethods() {
          return ['save'];
        },
        invoke,
      } as any);

    renderWordEditor();

    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(invoke).toHaveBeenCalledTimes(1);
    resolveSave?.({ ok: true });
    await waitFor(() => {
      expect(screen.getByText('已保存')).toBeTruthy();
    });
    providerSpy.mockRestore();
  });

  it('invokes onBack directly without local confirm handling', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();
    const notify = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        onBack: { action: 'showToast', args: { message: 'back event fired' } },
      },
      env: createEnv(notify),
    });

    fireEvent.click(screen.getByRole('button', { name: '返回' }));

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('info', 'back event fired');
    });
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('forwards the click event through onBack', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();
    const useHostScopeSpy = vi.spyOn(FluxReact, 'useHostScope').mockReturnValue({} as any);
    const useCurrentActionScopeSpy = vi
      .spyOn(FluxReact, 'useCurrentActionScope')
      .mockReturnValue(undefined as any);
    const useNamespaceRegistrationSpy = vi
      .spyOn(FluxReact, 'useNamespaceRegistration')
      .mockImplementation(() => undefined);
    const useRendererEnvSpy = vi
      .spyOn(FluxReact, 'useRendererEnv')
      .mockReturnValue({ notify: vi.fn() } as any);
    const useStatusPathPublicationSpy = vi
      .spyOn(FluxReact, 'useStatusPathPublication')
      .mockImplementation(() => undefined);
    const hasRendererSlotContentSpy = vi
      .spyOn(FluxReact, 'hasRendererSlotContent')
      .mockReturnValue(false);
    const resolveRendererSlotContentSpy = vi
      .spyOn(FluxReact, 'resolveRendererSlotContent')
      .mockReturnValue(undefined);
    const onBack = vi.fn(async () => ({ ok: true }));

    render(
      <WordEditorPage
        id="word-editor"
        path="$.body[0]"
        schema={{ type: 'word-editor-page' } as any}
        templateNode={{ validationOwnerPlan: undefined } as any}
        node={{ scope: { parent: null } } as any}
        props={{} as any}
        meta={{} as any}
        regions={{} as any}
        events={{ onBack }}
        helpers={{
          render: vi.fn(),
          evaluate: vi.fn(),
          createScope: vi.fn(),
          dispatch: vi.fn(),
          executeSource: vi.fn(),
        } as any}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '返回' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    const firstCall = onBack.mock.calls[0] as unknown[] | undefined;
    const forwardedEvent = firstCall?.[0];
    expect(forwardedEvent).toBeTruthy();
    expect((forwardedEvent as MouseEvent).type).toBe('click');

    useHostScopeSpy.mockRestore();
    useCurrentActionScopeSpy.mockRestore();
    useNamespaceRegistrationSpy.mockRestore();
    useRendererEnvSpy.mockRestore();
    useStatusPathPublicationSpy.mockRestore();
    hasRendererSlotContentSpy.mockRestore();
    resolveRendererSlotContentSpy.mockRestore();
  });

  it('does not publish save message updates after unmount', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();
    vi.useFakeTimers();

    let resolveSave: ((value: { ok: boolean }) => void) | undefined;
    const saveProviderResult = new Promise<{ ok: boolean }>((resolve) => {
      resolveSave = resolve;
    });
    const invoke = vi.fn(async (method: string) => {
      if (method !== 'save') {
        return { ok: false, error: new Error('unexpected method') };
      }

      await saveProviderResult;
      return { ok: true };
    });
    const providerSpy = vi
      .spyOn(wordEditorActionProvider, 'createWordEditorActionProvider')
      .mockReturnValue({
        kind: 'host',
        listMethods() {
          return ['save'];
        },
        invoke,
      } as any);

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWordEditor();

    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(invoke).toHaveBeenCalledTimes(1);

    cleanup();
    resolveSave?.({ ok: true });
    await Promise.resolve();
    await vi.runAllTimersAsync();

    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
    providerSpy.mockRestore();
  });

});
