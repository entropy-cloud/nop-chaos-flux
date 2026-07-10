import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const rendererSnapshots: Array<{ env: unknown; data: Record<string, unknown> | undefined }> = [];

vi.mock('@nop-chaos/flux-formula', () => ({
  createFormulaCompiler: () => ({}),
  createFormulaRegistry: () => ({ registerNamespace: () => undefined }),
}));

vi.mock('@nop-chaos/flux-renderers-basic', () => ({
  registerBasicRenderers: () => undefined,
}));

vi.mock('@nop-chaos/flux-renderers-form', () => ({
  registerFormRenderers: () => undefined,
}));

vi.mock('@nop-chaos/flux-renderers-form-advanced', () => ({
  registerFormAdvancedRenderers: () => undefined,
}));

vi.mock('@nop-chaos/flux-renderers-data', () => ({
  registerDataRenderers: () => undefined,
}));

vi.mock('@nop-chaos/flux-react', () => ({
  createDefaultRegistry: () => ({ register: () => undefined }),
  createSchemaRenderer: () => {
    return function MockSchemaRenderer(props: { env: any; data?: Record<string, unknown> }) {
      rendererSnapshots.push({ env: props.env, data: props.data });

      return (
        <div>
          <output data-testid="user-count">
            {String(((props.data?.users as unknown[]) ?? []).length)}
          </output>
          <output data-testid="search-count">
            {String(((props.data?.searchResults as unknown[]) ?? []).length)}
          </output>
          <button
            type="button"
            onClick={() =>
              void props.env.fetcher(
                {
                  method: 'post',
                  url: '/api/search',
                  data: { query: 'bob' },
                },
                {
                  env: props.env,
                  scope: {
                    readOwn: () => ({}),
                  },
                },
              )
            }
          >
            Trigger search
          </button>
          <button
            type="button"
            onClick={() =>
              void props.env.fetcher(
                {
                  method: 'post',
                  url: '/api/users',
                },
                {
                  env: props.env,
                  scope: {
                    readOwn: () => ({
                      username: 'zoe',
                      email: 'zoe@example.com',
                      role: 'viewer',
                    }),
                  },
                },
              )
            }
          >
            Trigger create user
          </button>
        </div>
      );
    };
  },
}));

vi.mock('@nop-chaos/nop-debugger', () => ({
  NopDebuggerPanel: () => null,
  createNopDebugger: () => ({
    id: 'test',
    getSnapshot: () => ({
      enabled: true,
      panelOpen: false,
      paused: false,
      events: [],
      filters: [],
      activeTab: 'timeline',
      position: { x: 24, y: 24 },
    }),
    subscribe: () => () => undefined,
    decorateEnv: (env: unknown) => env,
    plugin: {},
    onActionError: () => undefined,
  }),
}));

vi.mock('@nop-chaos/flow-designer-renderers', () => ({
  registerFlowDesignerRenderers: () => undefined,
}));

vi.mock('./pages/home-page', () => ({
  HomePage: () => <div data-testid="home-page" />,
}));

vi.mock('./component-lab', () => ({
  ComponentLabPage: () => <div data-testid="component-lab-page" />,
}));

vi.mock('./pages/code-editor-page', () => ({
  CodeEditorPage: () => <div data-testid="code-editor-page" />,
}));

vi.mock('./pages/flow-designer-page', () => ({
  FlowDesignerPage: () => <div data-testid="flow-designer-page" />,
}));

vi.mock('./pages/ding-talk-flow-demo', () => ({
  DingTalkFlowDemo: () => <div data-testid="dingtalk-flow-demo-page" />,
}));

vi.mock('./pages/report-designer-page', () => ({
  ReportDesignerPage: () => <div data-testid="report-designer-page" />,
}));

vi.mock('./pages/debugger-lab-page', () => ({
  DebuggerLabPage: () => <div data-testid="debugger-lab-page" />,
}));

vi.mock('./pages/condition-builder-page', () => ({
  ConditionBuilderPage: () => <div data-testid="condition-builder-page" />,
}));

vi.mock('./pages/word-editor-page', () => ({
  WordEditorPage: () => <div data-testid="word-editor-page" />,
}));

import { FluxBasicPage } from './pages/flux-basic-page';
import { App } from './App';

describe('FluxBasicPage', () => {
  beforeEach(() => {
    rendererSnapshots.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('keeps env stable across search and directory updates', async () => {
    const mockDebuggerController = {
      id: 'test',
      getSnapshot: () => ({
        enabled: true,
        panelOpen: false,
        paused: false,
        events: [],
        filters: [],
        activeTab: 'timeline' as const,
        position: { x: 24, y: 24 },
      }),
      subscribe: () => () => undefined,
      decorateEnv: (env: unknown) => env,
      plugin: {},
      onActionError: () => undefined,
    };

    render(
      <FluxBasicPage debuggerController={mockDebuggerController as any} onBack={() => undefined} />,
    );

    const initialSnapshot = rendererSnapshots.at(-1);
    expect(initialSnapshot).toBeTruthy();

    fireEvent.click(screen.getByText('Trigger search'));

    await waitFor(
      () => {
        expect(screen.getByTestId('search-count').textContent).toBe('1');
      },
      { timeout: 3000 },
    );

    expect(rendererSnapshots.at(-1)?.env).toBe(initialSnapshot?.env);

    fireEvent.click(screen.getByText('Trigger create user'));

    await waitFor(
      () => {
        expect(screen.getByTestId('user-count').textContent).toBe('4');
      },
      { timeout: 3000 },
    );

    expect(rendererSnapshots.at(-1)?.env).toBe(initialSnapshot?.env);
  }, 10000);
});

describe('App performance-table routing', () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/#/');
  });

  it('keeps #/performance-table on the ordinary performance page without diagnostics controls', async () => {
    window.history.replaceState({}, '', '/#/performance-table');

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Table Performance Playground' })).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Run 20 Host Mutations' })).toBeTruthy();
    });

    expect(screen.queryByRole('button', { name: 'Run Single Row Locality Diagnostic' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Run Array Item Locality Diagnostic' })).toBeNull();
    expect(screen.queryByText(/Diagnostics mode is active through/)).toBeNull();
  });

  it('keeps diagnostics URL on the same performance page and enables diagnostics mode', async () => {
    window.history.replaceState({}, '', '/?diagnostics=1#/performance-table');

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Table Performance Playground' })).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Run 20 Host Mutations' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Run Single Row Locality Diagnostic' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Run Array Item Locality Diagnostic' })).toBeTruthy();
      expect(screen.getByText(/Diagnostics mode is active through/)).toBeTruthy();
    });
  });
});
