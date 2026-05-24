// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { SavedDocumentData, Dataset } from '@nop-chaos/word-editor-core';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import './word-editor-page-host-scope.test-support.js';
import {
  createDefaultRegistry,
  createSchemaRenderer,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { registerWordEditorRenderers, defineWordEditorPageSchema } from '../index.js';
import {
  createEnv,
  datasetStore,
  defaultWordEditorConfig,
  mockedCore,
  mockState,
  renderWordEditor,
  resetMockStores,
} from './word-editor-page-host-scope.test-support.js';

describe('WordEditorPage host projections', () => {
  afterEach(() => {
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
              datasetCount: number;
              totalPages: number;
              scale: number;
            },
        );
        return (
          <div data-testid="runtime-probe">
            <span data-testid="runtime-ready">{String(runtime.ready)}</span>
            <span data-testid="runtime-dirty">{String(runtime.dirty)}</span>
            <span data-testid="runtime-word-count">{String(runtime.wordCount)}</span>
            <span data-testid="runtime-dataset-count">{String(runtime.datasetCount)}</span>
            <span data-testid="runtime-total-pages">{String(runtime.totalPages)}</span>
            <span data-testid="runtime-scale">{String(runtime.scale)}</span>
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
      expect(screen.getByTestId('runtime-total-pages').textContent).toBe('1');
      expect(screen.getByTestId('runtime-scale').textContent).toBe('1');
    });

    datasetStore.add({ name: 'Customers' });

    await waitFor(() => {
      expect(screen.getByTestId('runtime-dataset-count').textContent).toBe('1');
    });
  });

  it('projects a pure persisted host document fallback when no autosave has occurred', async () => {
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

  it('does not mix live charts and codes into host document before autosave', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();

    const DocumentProbe: RendererDefinition = {
      type: 'document-live-extra-probe',
      component: function DocumentLiveExtraProbe() {
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
        leftPanel: { type: 'document-live-extra-probe' },
        initialCharts: [{ id: 'live-chart', chartName: 'Live' }] as any,
        initialCodes: [{ id: 'live-code', codeName: 'Live' }] as any,
      },
      extraRenderers: [DocumentProbe],
    });

    await waitFor(() => {
      expect(screen.getByTestId('doc-chart-count').textContent).toBe('0');
      expect(screen.getByTestId('doc-code-count').textContent).toBe('0');
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

  it('normalizes invalid schema seed document and extras before exposing host scope', async () => {
    resetFluxI18n();
    initFluxI18n();
    resetMockStores();
    mockedCore.loadRecoveredStateMock.mockImplementationOnce((initialDatasets?: Dataset[]) => ({
      document: null,
      datasets: initialDatasets ?? [],
    }));

    const DocumentProbe: RendererDefinition = {
      type: 'schema-seed-probe',
      component: function SchemaSeedProbeComponent() {
        const summary = useScopeSelector((data: any) => ({
          mainCount: Array.isArray(data.document?.main) ? data.document.main.length : -1,
          chartCount: Array.isArray(data.document?.charts) ? data.document.charts.length : -1,
          codeCount: Array.isArray(data.document?.codes) ? data.document.codes.length : -1,
          datasetCount: Array.isArray(data.datasets) ? data.datasets.length : -1,
        }));
        return (
          <div>
            <span data-testid="schema-main-count">{String(summary.mainCount)}</span>
            <span data-testid="schema-chart-count">{String(summary.chartCount)}</span>
            <span data-testid="schema-code-count">{String(summary.codeCount)}</span>
            <span data-testid="schema-dataset-count">{String(summary.datasetCount)}</span>
          </div>
        );
      },
    };

    renderWordEditor({
      schema: {
        type: 'word-editor-page',
        config: { leftPanel: { generator: 'default' } },
        leftPanel: { type: 'schema-seed-probe' },
        initialDocument: {
          header: [null, { value: 'keep-header' }] as any,
          main: [{ value: 'keep-main' }, 123] as any,
          footer: ['bad-footer'] as any,
          charts: [
            {
              id: 'chart_1',
              chartName: 'Revenue',
              chartType: 'bar',
              showChartName: true,
              datasetId: 'ds',
              categoryField: 'month',
              valueField: ['value'],
            },
            { id: 'chart_2', chartName: '', chartType: 'bad' },
          ] as any,
          codes: [
            {
              id: 'code_1',
              codeName: 'QR',
              codeType: 'qrcode',
              datasetId: 'ds',
              valueField: 'id',
            },
            { id: 'code_2', codeName: '', codeType: 'bad' },
          ] as any,
        },
        datasets: [
          { id: 'good', name: 'Users', description: '', type: 'sql', columns: [] },
          { id: 'bad', name: '', description: '', type: 'invalid', columns: 'oops' },
        ] as any,
      },
      extraRenderers: [DocumentProbe],
    });

    await waitFor(() => {
      expect(screen.getByTestId('schema-main-count').textContent).toBe('1');
      expect(screen.getByTestId('schema-chart-count').textContent).toBe('1');
      expect(screen.getByTestId('schema-code-count').textContent).toBe('1');
      expect(screen.getByTestId('schema-dataset-count').textContent).toBe('1');
    });
  });
});
