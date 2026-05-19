// @vitest-environment happy-dom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { readDiagnosticsEnabled } from './route-model';

const performanceTablePageSpy = vi.fn();

vi.mock('@nop-chaos/flux-react', () => ({
  createDefaultRegistry: () => ({ register: () => undefined }),
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

vi.mock('@nop-chaos/nop-debugger', () => ({
  NopDebuggerPanel: () => null,
  createNopDebugger: () => ({
    id: 'test-debugger',
    decorateEnv: (env: unknown) => env,
    plugin: {},
    onActionError: () => undefined,
    setRuntime: () => undefined,
    setComponentRegistry: () => undefined,
    setActionScope: () => undefined,
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
  }),
}));

vi.mock('./pages/home-page', () => ({
  HomePage: () => <div data-testid="home-page">home</div>,
}));

vi.mock('./component-lab', () => ({
  ComponentLabPage: () => <div data-testid="component-lab-page">lab</div>,
}));

vi.mock('./pages/flux-basic-page', () => ({
  FluxBasicPage: () => <div data-testid="flux-basic-page">flux-basic</div>,
}));

vi.mock('./pages/code-editor-page', () => ({
  CodeEditorPage: () => <div data-testid="code-editor-page">code-editor</div>,
}));

vi.mock('./pages/flow-designer-page', () => ({
  FlowDesignerPage: () => <div data-testid="flow-designer-page">flow-designer</div>,
}));

vi.mock('./pages/ding-talk-flow-demo', () => ({
  DingTalkFlowDemo: () => <div data-testid="dingtalk-flow-page">dingtalk</div>,
}));

vi.mock('./pages/performance-table-page', () => ({
  PerformanceTablePage: (props: unknown) => {
    performanceTablePageSpy(props);
    return <div data-testid="performance-table-page">performance-table</div>;
  },
}));

import { App } from './App';

describe('App diagnostics routing', () => {
  beforeEach(() => {
    performanceTablePageSpy.mockClear();
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
  });

  it('reads diagnostics query flag from search params', () => {
    expect(readDiagnosticsEnabled('')).toBe(false);
    expect(readDiagnosticsEnabled('?diagnostics=0')).toBe(false);
    expect(readDiagnosticsEnabled('?diagnostics=1')).toBe(true);
    expect(readDiagnosticsEnabled('diagnostics=1')).toBe(true);
  });

  it('keeps ordinary performance-table route lightweight by default', () => {
    window.history.replaceState({}, '', '/#/performance-table');

    render(<App />);

    expect(screen.getByTestId('performance-table-page')).toBeTruthy();
    expect(performanceTablePageSpy).toHaveBeenCalledTimes(1);
    expect(performanceTablePageSpy.mock.calls[0][0]).toMatchObject({
      diagnosticsEnabled: false,
      debuggerController: expect.objectContaining({ id: 'test-debugger' }),
    });
  });

  it('enters the same page in diagnostics mode for query-before-hash URLs', () => {
    window.history.replaceState({}, '', '/?diagnostics=1#/performance-table');

    render(<App />);

    expect(screen.getByTestId('performance-table-page')).toBeTruthy();
    expect(performanceTablePageSpy).toHaveBeenCalledTimes(1);
    expect(performanceTablePageSpy.mock.calls[0][0]).toMatchObject({
      diagnosticsEnabled: true,
      debuggerController: expect.objectContaining({ id: 'test-debugger' }),
    });
  });
});
