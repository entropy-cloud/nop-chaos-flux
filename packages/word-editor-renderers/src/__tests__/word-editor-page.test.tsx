// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import {
  createDefaultRegistry,
  createSchemaRenderer,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerWordEditorRenderers, defineWordEditorPageSchema } from '../index.js';
import * as wordEditorActionProvider from '../word-editor-action-provider.js';

const mockedCore = vi.hoisted(() => ({
  saveDocumentMock: vi.fn(() => true),
  saveDatasetsMock: vi.fn(),
  loadDatasetsMock: vi.fn(() => []),
}));
const mockState: {
  shortcutOptions: { onSave?: () => void } | undefined;
  lastEditorCanvasProps: any;
  datasetState: {
    datasets: Array<{ id: string; name: string }>;
    selectedDatasetId: string | null;
  };
} = {
  shortcutOptions: undefined,
  lastEditorCanvasProps: undefined,
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
  update: vi.fn(),
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
  DatasetDialog: () => <div data-testid="dataset-dialog" />,
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

describe('WordEditorPage', () => {
  it('updates host scope dataset projection when dataset store changes', async () => {
    resetFluxI18n();
    initFluxI18n();

    const HostDatasetProbe: RendererDefinition = {
      type: 'host-dataset-probe',
      component: function HostDatasetProbeComponent() {
        const count = useScopeSelector(
          (data: Record<string, unknown>) => (data.datasets as unknown[] | undefined)?.length ?? 0,
        );
        return <span data-testid="dataset-count">{String(count)}</span>;
      },
    };

    const registry = createDefaultRegistry([HostDatasetProbe]);
    registerWordEditorRenderers(registry);
    resetMockStores();

    renderWordEditor({
      schema: { type: 'word-editor-page', leftPanel: { type: 'host-dataset-probe' } },
      extraRenderers: [HostDatasetProbe],
    });

    await waitFor(() => {
      expect(screen.getByTestId('dataset-count').textContent).toBe('0');
    });

    datasetStore.add({ name: 'Customers' });

    await waitFor(() => {
      expect(screen.getByTestId('dataset-count').textContent).toBe('1');
    });
  });

  it('projects runtime host field with editor-store-only selector and separate dataset counts', async () => {
    resetFluxI18n();
    initFluxI18n();

    const RuntimeProbe: RendererDefinition = {
      type: 'runtime-probe',
      component: function RuntimeProbeComponent() {
        const runtime = useScopeSelector(
          (data: any) =>
            data.runtime as {
              ready: boolean;
              dirty: boolean;
              wordCount: number;
              canUndo: boolean;
              canRedo: boolean;
              datasetCount: number;
              chartCount: number;
              codeCount: number;
            },
        );
        return (
          <div data-testid="runtime-probe">
            <span data-testid="runtime-ready">{String(runtime.ready)}</span>
            <span data-testid="runtime-dirty">{String(runtime.dirty)}</span>
            <span data-testid="runtime-word-count">{String(runtime.wordCount)}</span>
            <span data-testid="runtime-dataset-count">{String(runtime.datasetCount)}</span>
          </div>
        );
      },
    };

    resetMockStores();

    renderWordEditor({
      schema: { type: 'word-editor-page', leftPanel: { type: 'runtime-probe' } },
      extraRenderers: [RuntimeProbe],
    });

    await waitFor(() => {
      expect(screen.getByTestId('runtime-ready').textContent).toBe('true');
      expect(screen.getByTestId('runtime-dirty').textContent).toBe('false');
      expect(screen.getByTestId('runtime-word-count').textContent).toBe('0');
      expect(screen.getByTestId('runtime-dataset-count').textContent).toBe('0');
    });

    datasetStore.add({ name: 'Customers' });

    await waitFor(() => {
      expect(screen.getByTestId('runtime-dataset-count').textContent).toBe('1');
    });
  });

  it('projects host document fallback structure when no autosave has occurred', async () => {
    resetFluxI18n();
    initFluxI18n();

    const DocumentProbe: RendererDefinition = {
      type: 'document-probe',
      component: function DocumentProbeComponent() {
        const doc = useScopeSelector(
          (data: any) =>
            data.document as {
              header: unknown[];
              main: unknown[];
              footer: unknown[];
              charts: unknown[];
              codes: unknown[];
            },
        );
        return (
          <div data-testid="document-probe">
            <span data-testid="doc-has-header">{String(Array.isArray(doc.header))}</span>
            <span data-testid="doc-has-main">{String(Array.isArray(doc.main))}</span>
            <span data-testid="doc-has-footer">{String(Array.isArray(doc.footer))}</span>
            <span data-testid="doc-has-charts">{String(Array.isArray(doc.charts))}</span>
            <span data-testid="doc-has-codes">{String(Array.isArray(doc.codes))}</span>
          </div>
        );
      },
    };

    resetMockStores();

    renderWordEditor({
      schema: { type: 'word-editor-page', leftPanel: { type: 'document-probe' } },
      extraRenderers: [DocumentProbe],
    });

    await waitFor(() => {
      expect(screen.getByTestId('doc-has-header').textContent).toBe('true');
      expect(screen.getByTestId('doc-has-main').textContent).toBe('true');
      expect(screen.getByTestId('doc-has-footer').textContent).toBe('true');
      expect(screen.getByTestId('doc-has-charts').textContent).toBe('true');
      expect(screen.getByTestId('doc-has-codes').textContent).toBe('true');
    });
  });

  it('keeps the semantic root marker on the page shell', () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();
    const registry = createDefaultRegistry();
    registerWordEditorRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://word-editor/page"
        schema={defineWordEditorPageSchema({ type: 'word-editor-page', title: 'Word Editor' })}
        env={createEnv()}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{}}
      />,
    );
    expect(container.querySelector('.nop-word-editor-page')).toBeTruthy();
    expect(screen.getByTestId('editor-canvas')).toBeTruthy();
    expect(screen.getByTestId('ribbon-toolbar')).toBeTruthy();
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

  it('projects autosaved charts and codes into host scope', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    const DocumentProbe: RendererDefinition = {
      type: 'document-count-probe',
      component: function DocumentCountProbe() {
        const doc = useScopeSelector(
          (data: any) => data.document as { charts?: unknown[]; codes?: unknown[] },
        );
        return (
          <div>
            <span data-testid="doc-chart-count">{String(doc.charts?.length ?? 0)}</span>
            <span data-testid="doc-code-count">{String(doc.codes?.length ?? 0)}</span>
          </div>
        );
      },
    };

    renderWordEditor({
      schema: { type: 'word-editor-page', leftPanel: { type: 'document-count-probe' } },
      extraRenderers: [DocumentProbe],
    });

    mockState.lastEditorCanvasProps.onAutosave({
      data: {
        header: [],
        main: [],
        footer: [],
        charts: [{ id: 'chart-1', chartName: 'Chart' }],
        codes: [{ id: 'code-1', codeName: 'Code' }],
      },
      paperSettings: null,
      savedAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('doc-chart-count').textContent).toBe('1');
      expect(screen.getByTestId('doc-code-count').textContent).toBe('1');
    });
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

  it('publishes host status and mounts override regions with word-editor scope', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    const StatusProbe: RendererDefinition = {
      type: 'status-probe',
      component: function StatusProbeComponent() {
        const status = useScopeSelector((data: any) => data.wordEditorStatus);
        return (
          <span data-testid="word-editor-status">
            {status ? `${status.kind}:${status.datasetCount}:${status.wordCount}` : ''}
          </span>
        );
      },
    };

    const ScopeProbe: RendererDefinition = {
      type: 'scope-probe',
      component: function ScopeProbeComponent() {
        const summary = useScopeSelector((data: any) => {
          const runtime = data.runtime;
          const datasets = data.datasets;
          return `${runtime?.datasetCount ?? 'x'}:${Array.isArray(datasets) ? datasets.length : 'x'}`;
        });
        return <span data-testid="scope-probe">{String(summary)}</span>;
      },
    };

    const registry = createDefaultRegistry([StatusProbe, ScopeProbe]);
    registerWordEditorRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://word-editor/status"
        schema={defineWordEditorPageSchema({
          type: 'word-editor-page',
          statusPath: 'wordEditorStatus',
          toolbar: { type: 'scope-probe' },
          leftPanel: { type: 'scope-probe' },
          rightPanel: { type: 'scope-probe' },
        })}
        env={createEnv()}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{ wordEditorStatus: undefined }}
      />,
    );

    expect(screen.getAllByTestId('scope-probe')).toHaveLength(3);
    expect(screen.getAllByTestId('scope-probe').every((node) => node.textContent === '0:0')).toBe(
      true,
    );
  });

  it('clears word-editor host status on unmount', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    const StatusProbe: RendererDefinition = {
      type: 'status-probe',
      component: function StatusProbeComponent() {
        const status = useScopeSelector((data: any) => data.wordEditorStatus);
        return <span data-testid="word-editor-status">{status?.kind ?? ''}</span>;
      },
    };

    const pageRenderer: RendererDefinition = {
      type: 'page',
      component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
      regions: ['body'],
    };

    const registry = createDefaultRegistry([pageRenderer, StatusProbe]);
    registerWordEditorRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    const view = render(
      <SchemaRenderer
        schemaUrl="test://word-editor/status-unmount"
        schema={{
          type: 'page',
          body: [
            defineWordEditorPageSchema({
              type: 'word-editor-page',
              statusPath: 'wordEditorStatus',
            }),
            { type: 'status-probe' },
          ],
        } as any}
        env={createEnv()}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('word-editor-status').textContent).toBe('word-editor');
    });

    view.unmount();
  });
});
