// @vitest-environment happy-dom
import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createDefaultRegistry, createSchemaRenderer } from '@nop-chaos/flux-react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { defineWordEditorPageSchema, registerWordEditorRenderers } from '../index.js';

const hoistedMockedCore = vi.hoisted(() => ({
  captureDocumentSnapshotMock: vi.fn(() => ({
    data: {
      header: [],
      main: [{ value: 'saved' }],
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
    savedAt: '2026-05-14T00:00:00.000Z',
  })),
  persistSavedDocumentMock: vi.fn((saved) => saved),
  saveDatasetsMock: vi.fn(),
  loadDatasetsMock: vi.fn(() => []),
}));

export const mockedCore = hoistedMockedCore;

export const mockState: {
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

export const originalWindowConfirm = {
  hasOwn: Object.prototype.hasOwnProperty.call(window, 'confirm'),
  value: window.confirm,
};

function createEditorStoreSnapshot() {
  return {
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
}

let editorStoreState = createEditorStoreSnapshot();

export { editorStoreState };

const editorListeners = new Set<() => void>();

export const editorStore = {
  subscribe: (listener: () => void) => {
    editorListeners.add(listener);
    return () => editorListeners.delete(listener);
  },
  getState: () => editorStoreState,
  setDirty: vi.fn(),
  setSelection: vi.fn((selection: Record<string, unknown>) => {
    editorStoreState = {
      ...editorStoreState,
      selection: {
        ...editorStoreState.selection,
        ...selection,
      },
    };
    for (const listener of editorListeners) listener();
  }),
};

const datasetListeners = new Set<() => void>();

export const datasetStore = {
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

export function resetWordEditorActionMocks() {
  resetFluxI18n();
  initFluxI18n();
  mockState.datasetState = {
    datasets: [],
    selectedDatasetId: null,
  };
  editorStoreState = createEditorStoreSnapshot();
  editorStore.setDirty.mockClear();
  editorStore.setSelection.mockClear();
  mockedCore.captureDocumentSnapshotMock.mockClear();
  mockedCore.persistSavedDocumentMock.mockClear();
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
    captureDocumentSnapshot: hoistedMockedCore.captureDocumentSnapshotMock,
    persistSavedDocument: hoistedMockedCore.persistSavedDocumentMock,
    loadDocument: vi.fn(() => null),
    saveDatasets: hoistedMockedCore.saveDatasetsMock,
    loadDatasets: hoistedMockedCore.loadDatasetsMock,
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

export function createEnv(notify: RendererEnv['notify'] = () => undefined): RendererEnv {
  return {
    fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
    notify,
  };
}

export function renderWordEditor(input?: {
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
