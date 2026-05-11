// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { SavedDocumentData, Dataset } from '@nop-chaos/word-editor-core';
import {
  createDefaultRegistry,
  createSchemaRenderer,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import {
  registerWordEditorRenderers,
  defineWordEditorPageSchema,
  wordEditorRendererDefinitions,
} from '../index.js';

const mockedCore = vi.hoisted(() => ({
  saveDocumentMock: vi.fn(() => true),
  saveDatasetsMock: vi.fn(),
  loadRecoveredStateMock: vi.fn<() => { document: SavedDocumentData | null; datasets: Dataset[] }>(
    () => ({ document: null, datasets: [] }),
  ),
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
  mockedCore.loadRecoveredStateMock.mockClear();
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
    loadRecoveredState: mockedCore.loadRecoveredStateMock,
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

  return render(
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

const defaultWordEditorConfig = {
  leftPanel: { generator: 'default' as const },
  rightPanel: { generator: 'default' as const },
};

describe('WordEditorPage host scope', () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

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

    resetMockStores();

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        config: { leftPanel: { generator: 'default' } },
        leftPanel: { type: 'host-dataset-probe' },
      },
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
      schema: {
        type: 'word-editor-page',
        config: { leftPanel: { generator: 'default' } },
        leftPanel: { type: 'runtime-probe' },
      },
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
      schema: {
        type: 'word-editor-page',
        config: { leftPanel: { generator: 'default' } },
        leftPanel: { type: 'document-probe' },
      },
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
      schema: {
        type: 'word-editor-page',
        config: { leftPanel: { generator: 'default' } },
        leftPanel: { type: 'document-count-probe' },
      },
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

  it('publishes host status and mounts override regions with word-editor scope', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

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

    const registry = createDefaultRegistry([ScopeProbe]);
    registerWordEditorRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://word-editor/status"
        schema={defineWordEditorPageSchema({
          type: 'word-editor-page',
          statusPath: 'wordEditorStatus',
          config: defaultWordEditorConfig,
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
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    };

    const registry = createDefaultRegistry([pageRenderer, StatusProbe]);
    registerWordEditorRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    const view = render(
      <SchemaRenderer
        schemaUrl="test://word-editor/status-unmount"
        schema={
          {
            type: 'page',
            body: [
              defineWordEditorPageSchema({
                type: 'word-editor-page',
                statusPath: 'wordEditorStatus',
              }),
              { type: 'status-probe' },
            ],
          } as any
        }
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

  it('publishes recovered document into host scope instead of stale schema seed', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();
    const recoveredDocument: SavedDocumentData = {
      data: {
        header: [],
        main: [{ value: 'persisted-main' }],
        footer: [],
        charts: [],
        codes: [],
      },
      paperSettings: {
        width: 595,
        height: 842,
        direction: 'vertical',
        margins: [100, 120, 100, 120],
      },
      savedAt: '2026-05-07T00:00:00.000Z',
    };
    mockedCore.loadRecoveredStateMock.mockReturnValueOnce({
      document: recoveredDocument,
      datasets: [],
    });

    const DocumentValueProbe: RendererDefinition = {
      type: 'document-value-probe',
      component: function DocumentValueProbeComponent() {
        const text = useScopeSelector((data: any) => data.document?.main?.[0]?.value ?? '');
        return <span data-testid="document-value-probe">{String(text)}</span>;
      },
    };

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        initialDocument: { header: [], main: [{ value: 'schema-seed' }], footer: [] },
        config: { leftPanel: { generator: 'default' } },
        leftPanel: { type: 'document-value-probe' },
      },
      extraRenderers: [DocumentValueProbe],
    });

    await waitFor(() => {
      expect(screen.getByTestId('document-value-probe').textContent).toBe('persisted-main');
    });
  });

  it('registers a window probe with recovered document state and removes it on unmount', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();
    const recoveredDocument: SavedDocumentData = {
      data: {
        header: [],
        main: [{ value: 'persisted-main' }],
        footer: [],
        charts: [],
        codes: [],
      },
      paperSettings: {
        width: 595,
        height: 842,
        direction: 'vertical',
        margins: [100, 120, 100, 120],
      },
      savedAt: '2026-05-07T00:00:00.000Z',
    };
    mockedCore.loadRecoveredStateMock.mockReturnValueOnce({
      document: recoveredDocument,
      datasets: [],
    });

    const view = renderWordEditor();

    await waitFor(() => {
      expect(window.__NOP_WORD_EDITOR_PROBE__?.getState().document?.main?.[0]?.value).toBe(
        'persisted-main',
      );
    });

    view.unmount();
    expect(window.__NOP_WORD_EDITOR_PROBE__).toBeUndefined();
  });

  it('keeps persisted datasets instead of overwriting them with schema datasets on mount', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();
    const persistedDatasets: Dataset[] = [
      {
        id: 'persisted-1',
        name: 'Persisted Dataset',
        description: '',
        type: 'static',
        columns: [],
      },
    ];
    mockedCore.loadRecoveredStateMock.mockReturnValueOnce({
      document: null,
      datasets: persistedDatasets,
    });

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        datasets: [{ id: 'schema-1', name: 'Schema Dataset' }] as any,
      },
    });

    await waitFor(() => {
      expect(datasetStore.load).toHaveBeenCalledWith(persistedDatasets);
    });
  });

  it('hides override regions when no panel config resolves that side', () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    const HiddenProbe: RendererDefinition = {
      type: 'hidden-probe',
      component: () => <span>Hidden probe</span>,
    };

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        leftPanel: { type: 'hidden-probe' },
        rightPanel: { type: 'hidden-probe' },
      },
      extraRenderers: [HiddenProbe],
    });

    expect(screen.queryByText('Hidden probe')).toBeNull();
    expect(screen.queryByTestId('left-panel-expanded')).toBeNull();
    expect(screen.queryByTestId('right-panel-expanded')).toBeNull();
  });

  it('renders default generators only when config resolves side panels', () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        config: { leftPanel: { generator: 'default' }, rightPanel: { generator: 'default' } },
      },
    });

    expect(screen.getByTestId('dataset-panel')).toBeTruthy();
    expect(screen.getByTestId('outline-panel')).toBeTruthy();
  });

  it('exposes shared collapse controls for expanded workbench sides', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        config: defaultWordEditorConfig,
      },
    });

    expect(screen.getByTestId('left-panel-expanded')).toBeTruthy();
    expect(screen.getByTestId('right-panel-expanded')).toBeTruthy();

    fireEvent.click(screen.getByTestId('collapse-field-panel'));
    fireEvent.click(screen.getByTestId('collapse-outline-panel'));

    await waitFor(() => {
      expect(screen.getByTestId('left-panel-collapsed')).toBeTruthy();
      expect(screen.getByTestId('right-panel-collapsed')).toBeTruthy();
    });
  });

  it('exposes domain host metadata on the registered renderer definition', () => {
    const definition = wordEditorRendererDefinitions.find(
      (candidate) => candidate.type === 'word-editor-page',
    );

    expect(definition?.rendererClass).toBe('domain-host-renderer');
    expect(definition?.rendererTraits).toEqual(
      expect.arrayContaining(['workbench-shell', 'builder-facing']),
    );
    expect(definition?.propContracts?.statusPath?.shape.kind).toBe('string');
    expect(definition?.eventContracts?.onBack?.displayName).toBe('Back');
  });
});
