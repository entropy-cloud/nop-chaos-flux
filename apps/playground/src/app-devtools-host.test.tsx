import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';

// Regression test (E1 smoke, 2026-11-18): NopDebuggerPanel must never mount
// against the M7 trimmedControllerStub — the stub's getSnapshot() returns
// undefined and the panel crashes on its first store read, killing the whole
// React tree (white playground page). The fix routes both the kernel assignment
// and the panel mount through a single `devtoolsReady` promise; this test is
// discriminative because the pre-fix two-import race mounted the panel with the
// stale stub prop while the kernel promise was still settling.

const capturedPanelProps: Array<{ controller: unknown }> = [];
const realController = {
  id: 'sentinel-real-kernel',
  subscribe: () => () => undefined,
  getSnapshot: () => ({ enabled: true, events: [], filters: [] }),
};

vi.mock('@nop-chaos/nop-debugger', () => ({
  NopDebuggerPanel: (props: { controller: unknown }) => {
    capturedPanelProps.push(props);
    return React.createElement('div', { 'data-testid': 'nop-debugger-panel' });
  },
  createNopDebugger: () => realController,
}));

vi.mock('@nop-chaos/flux-formula', () => ({
  createFormulaCompiler: () => ({}),
  createFormulaRegistry: () => ({ registerNamespace: () => undefined }),
}));
vi.mock('@nop-chaos/flux-react', () => ({
  createDefaultRegistry: () => ({ register: () => undefined }),
  createLazyRendererComponent: () => () => null,
  createSchemaRenderer: () => () => null,
}));
vi.mock('@nop-chaos/flux-renderers-basic', () => ({ registerBasicRenderers: () => undefined }));
vi.mock('@nop-chaos/flux-renderers-form', () => ({ registerFormRenderers: () => undefined }));
vi.mock('@nop-chaos/flux-renderers-form-advanced', () => ({ registerFormAdvancedRenderers: () => undefined }));
vi.mock('@nop-chaos/flux-renderers-data', () => ({ registerDataRenderers: () => undefined }));
vi.mock('@nop-chaos/flux-renderers-map', () => ({ registerMapRenderers: () => undefined }));
vi.mock('@nop-chaos/flux-renderers-pivot', () => ({ registerPivotRenderers: () => undefined }));
vi.mock('@nop-chaos/flux-renderers-industrial', () => ({ registerScadaRenderers: () => undefined, registerScadaSymbols: () => undefined }));
vi.mock('@nop-chaos/flux-renderers-industrial/editor', () => ({
  registerScadaEditorRenderers: () => undefined,
  createInMemoryTemplateStorage: () => ({ listTemplates: async () => [], saveTemplate: async () => undefined, deleteTemplate: async () => undefined }),
  createInMemoryStationStorage: () => ({ loadStation: async () => null, saveStation: async () => undefined, loadScreen: async () => null, saveScreen: async () => undefined, deleteScreen: async () => undefined }),
}));
vi.mock('@nop-chaos/flow-designer-renderers', () => ({ registerFlowDesignerRenderers: () => undefined }));
vi.mock('./pages/home-page', () => ({ HomePage: () => <div data-testid="home-page" /> }));
vi.mock('./domain-route-pages.js', () => ({ DOMAIN_ROUTE_PAGES: [] }));
vi.mock('./component-lab', () => ({ ComponentLabPage: () => <div data-testid="component-lab-page" /> }));
vi.mock('./pages/code-editor-page', () => ({ CodeEditorPage: () => null }));
vi.mock('./pages/flow-designer-page', () => ({ FlowDesignerPage: () => null }));
vi.mock('./pages/report-designer-page', () => ({ ReportDesignerPage: () => null }));
vi.mock('./pages/spreadsheet-page', () => ({ SpreadsheetPage: () => null }));
vi.mock('./pages/debugger-lab-page', () => ({ DebuggerLabPage: () => null }));
vi.mock('./pages/xlang-debug-page', () => ({ XlangDebugPage: () => null }));

describe('DevToolsHost kernel/panel ordering', () => {
  it('mounts NopDebuggerPanel with the real kernel controller, never the trimmed stub', async () => {
    const { App } = await import('./App.js');
    render(<App />);
    try {
      await waitFor(() => expect(capturedPanelProps.length).toBeGreaterThan(0), { timeout: 3_000 });
    const received = capturedPanelProps.at(-1)?.controller as { id?: string } | undefined;
    expect(received?.id).toBe('sentinel-real-kernel');
    } finally {
      cleanup();
    }
  });
});
