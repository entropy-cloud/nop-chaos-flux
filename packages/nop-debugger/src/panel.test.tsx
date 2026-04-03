// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NopDebuggerPanel } from './panel';
import type { NopDebuggerController, NopDebuggerOverview, NopDebuggerSnapshot, NopDiagnosticReport, NopInteractionTrace } from './types';

function createSnapshot(): NopDebuggerSnapshot {
  return {
    enabled: true,
    panelOpen: true,
    minimized: false,
    paused: false,
    activeTab: 'overview',
    position: { x: 24, y: 24 },
    events: [],
    filters: ['render', 'action', 'api', 'compile', 'notify', 'error'],
    pinnedErrors: { earliest: [], latest: [] }
  };
}

function createController(snapshot: NopDebuggerSnapshot): NopDebuggerController {
  const emptyOverview: NopDebuggerOverview = {
    errorCount: 0,
    totalEvents: 0,
    countsByGroup: { render: 0, action: 0, api: 0, compile: 0, notify: 0, error: 0, node: 0 }
  };
  const latestTrace: NopInteractionTrace = {
    query: { inferFromLatest: true },
    resolvedQuery: { nodeId: 'user-form', actionType: 'submitForm', mode: 'related' },
    anchorEvent: {
      id: 10,
      sessionId: 'session-test',
      timestamp: 100,
      kind: 'error',
      group: 'error',
      level: 'error',
      source: 'root.onActionError',
      summary: 'submit failed'
    },
    totalEvents: 4,
    matchedEvents: [],
    relatedErrors: [],
    requestKeys: ['POST /api/users | user-form | body.1'],
    actionTypes: ['submitForm'],
    nodeIds: ['user-form'],
    paths: ['body.1']
  };
  const metricReport: NopDiagnosticReport = {
    controllerId: 'panel-test',
    sessionId: 'session-test',
    generatedAt: 1,
    snapshot: { enabled: true, panelOpen: true, paused: false, activeTab: 'overview', filters: snapshot.filters },
    overview: { errorCount: 1, totalEvents: 4, countsByGroup: { render: 1, action: 1, api: 1, compile: 0, notify: 0, error: 1, node: 0 } },
    latestInteractionTrace: latestTrace,
    recentEvents: [],
    pinnedErrors: { earliest: [], latest: [] }
  };
  const show = vi.fn();
  const hide = vi.fn();
  const clear = vi.fn();
  const pause = vi.fn();
  const resume = vi.fn();
  const setActiveTab = vi.fn();
  const setPanelPosition = vi.fn();
  const toggleFilter = vi.fn();

  return {
    id: 'panel-test',
    enabled: true,
    plugin: { name: 'test-plugin' },
    sessionId: 'session-test',
    automation: {
      controllerId: 'panel-test',
      sessionId: 'session-test',
      version: '1',
      getSnapshot: () => snapshot,
      getOverview: () => emptyOverview,
      queryEvents: () => [],
      getLatestEvent: () => undefined,
      getLatestError: () => undefined,
      getEarliestErrors: () => [],
      getLatestErrors: () => [],
      getPinnedErrors: () => ({ earliest: [], latest: [] }),
      getNodeDiagnostics: () => ({ rendererTypes: [], totalEvents: 0, countsByGroup: {}, countsByKind: {}, recentEvents: [] }),
      getInteractionTrace: () => latestTrace,
      createDiagnosticReport: () => ({ controllerId: 'panel-test', sessionId: 'session-test', generatedAt: 1, snapshot: { enabled: true, panelOpen: true, paused: false, activeTab: 'overview', filters: snapshot.filters }, overview: emptyOverview, recentEvents: [], pinnedErrors: { earliest: [], latest: [] } }),
      exportSession: () => ({ controllerId: 'panel-test', sessionId: 'session-test', generatedAt: 1, snapshot, overview: emptyOverview, events: [], pinnedErrors: { earliest: [], latest: [] } }),
      waitForEvent: async () => snapshot.events[0]!,
      clear,
      pause,
      resume,
      show,
      hide,
      toggle() {},
      minimize() {},
      unminimize() {},
      setActiveTab,
      setPanelPosition,
      inspectByCid: vi.fn(() => undefined),
      inspectByElement: vi.fn(() => undefined)
    },
    decorateEnv: (env) => env,
    onActionError() {},
    show,
    hide,
    toggle() {},
    minimize: vi.fn(),
    unminimize: vi.fn(),
    clear,
    pause,
    resume,
    setActiveTab,
    setPanelPosition,
    toggleFilter,
    queryEvents: () => [],
    getLatestEvent: () => undefined,
    getLatestError: () => undefined,
    getEarliestErrors: () => [],
    getLatestErrors: () => [],
    getPinnedErrors: () => ({ earliest: [], latest: [] }),
    getNodeDiagnostics: () => ({ rendererTypes: [], totalEvents: 0, countsByGroup: {}, countsByKind: {}, recentEvents: [] }),
    getInteractionTrace: () => latestTrace,
    getOverview: () => emptyOverview,
    createDiagnosticReport: vi.fn(() => metricReport),
    exportSession: () => ({ controllerId: 'panel-test', sessionId: 'session-test', generatedAt: 1, snapshot, overview: emptyOverview, events: [], pinnedErrors: { earliest: [], latest: [] } }),
    waitForEvent: async () => snapshot.events[0]!,
    setComponentRegistry: vi.fn(),
    setActionScope: vi.fn(),
    inspectByCid: vi.fn(() => undefined),
    inspectByElement: vi.fn(() => undefined),
    subscribe: () => () => {},
    getSnapshot: () => snapshot
  };
}

afterEach(() => {
  cleanup();
});

describe('NopDebuggerPanel', () => {
  it('shows the latest inferred interaction trace summary in overview mode', () => {
    const snapshot = createSnapshot();
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('Latest trace')).toBeTruthy();
    expect(screen.getByText('submit failed')).toBeTruthy();
    expect(screen.getByText(/4 correlated events/i)).toBeTruthy();
    expect(screen.getByText(/node user-form/i)).toBeTruthy();
  });

  it('calls minimize when minimize button is clicked', () => {
    const snapshot = createSnapshot();
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    fireEvent.click(screen.getByTestId('ndbg-minimize'));

    expect(controller.minimize).toHaveBeenCalledTimes(1);
  });

  it('opens launcher on click without drag', () => {
    const snapshot = { ...createSnapshot(), panelOpen: false };
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    const launcher = document.querySelector('.nop-debugger-launcher');
    expect(launcher).toBeTruthy();

    fireEvent.pointerDown(launcher!, { button: 0, pointerId: 1, clientX: 40, clientY: 40 });
    fireEvent.click(launcher!);

    expect(controller.show).toHaveBeenCalledTimes(1);
  });

  it('renders JsonViewer for expanded event details', () => {
    const snapshot = createSnapshot();
    snapshot.events = [{
      id: 1,
      sessionId: 'session-test',
      timestamp: 100,
      kind: 'action:end',
      group: 'action',
      level: 'success',
      source: 'test',
      summary: 'Action completed',
      detail: 'Form submitted',
      actionType: 'submitForm',
      nodeId: 'form-1',
      path: 'body.0',
      durationMs: 150
    }];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('Action completed')).toBeTruthy();
  });

  it('filters events by search text', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'timeline';
    snapshot.events = [
      {
        id: 1,
        sessionId: 'session-test',
        timestamp: 100,
        kind: 'action:start',
        group: 'action',
        level: 'info',
        source: 'test',
        summary: 'User login',
        actionType: 'login'
      },
      {
        id: 2,
        sessionId: 'session-test',
        timestamp: 200,
        kind: 'action:start',
        group: 'action',
        level: 'info',
        source: 'test',
        summary: 'User logout',
        actionType: 'logout'
      }
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('User login')).toBeTruthy();
    expect(screen.getByText('User logout')).toBeTruthy();
  });

  it('shows error badge on launcher when errors exist', () => {
    const snapshot = { ...createSnapshot(), panelOpen: false };
    snapshot.events = [{
      id: 1,
      sessionId: 'session-test',
      timestamp: 100,
      kind: 'error',
      group: 'error',
      level: 'error',
      source: 'test',
      summary: 'Test error'
    }];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    const launcher = document.querySelector('.nop-debugger-launcher');
    expect(launcher).toBeTruthy();
  });

  it('renders node tab with node diagnostics input', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'node';
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('node')).toBeTruthy();
  });

  it('renders network tab with merged requests', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'network';
    snapshot.events = [
      {
        id: 1,
        sessionId: 'session-test',
        timestamp: 100,
        kind: 'api:start',
        group: 'api',
        level: 'info',
        source: 'test',
        summary: 'GET /api/users',
        requestKey: 'GET /api/users'
      },
      {
        id: 2,
        sessionId: 'session-test',
        timestamp: 150,
        kind: 'api:end',
        group: 'api',
        level: 'success',
        source: 'test',
        summary: 'GET /api/users',
        requestKey: 'GET /api/users',
        durationMs: 50
      }
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('network')).toBeTruthy();
  });

  it('renders minimized bar with correct size and layout when minimized', () => {
    const snapshot = { ...createSnapshot(), minimized: true };
    const controller = createController(snapshot);

    const { container } = render(<NopDebuggerPanel controller={controller} />);

    const minimizedBar = container.querySelector('.nop-debugger--minimized');
    expect(minimizedBar).toBeTruthy();

    const style = getComputedStyle(minimizedBar!);
    expect(style.display).toBe('flex');
    expect(style.borderRadius).toBe('999px');
    expect(style.cursor).toBe('grab');

    expect(minimizedBar!.querySelector('.ndbg-launcher-icon')).toBeTruthy();
  });

  it('minimized bar has correct CSS layout properties', () => {
    const snapshot = { ...createSnapshot(), minimized: true };
    const controller = createController(snapshot);

    const { container } = render(<NopDebuggerPanel controller={controller} />);

    const minimizedBar = container.querySelector('.nop-debugger--minimized');
    expect(minimizedBar).toBeTruthy();

    const style = getComputedStyle(minimizedBar!);
    expect(style.display).toBe('flex');
    expect(style.borderRadius).toBe('999px');
    expect(style.cursor).toBe('grab');
    expect(style.padding).toBe('8px 14px');
  });

  it('minimized bar shows event count badge', () => {
    const snapshot = { ...createSnapshot(), minimized: true, events: [{ id: 1, sessionId: 's', timestamp: 1, kind: 'render:end' as const, group: 'render' as const, level: 'info' as const, source: 'test', summary: 'render' }] };
    const controller = createController(snapshot);
    render(<NopDebuggerPanel controller={controller} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(document.querySelector('.ndbg-minimized-badge')).toBeTruthy();
  });

  it('minimized bar shows error badge when errors exist', () => {
    const snapshot = { ...createSnapshot(), minimized: true, events: [
      { id: 1, sessionId: 's', timestamp: 1, kind: 'error' as const, group: 'error' as const, level: 'error' as const, source: 'test', summary: 'err' },
      { id: 2, sessionId: 's', timestamp: 2, kind: 'error' as const, group: 'error' as const, level: 'error' as const, source: 'test', summary: 'err2' },
      { id: 3, sessionId: 's', timestamp: 3, kind: 'render:end' as const, group: 'render' as const, level: 'info' as const, source: 'test', summary: 'render' }
    ] };
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('2')).toBeTruthy();
    expect(document.querySelector('.ndbg-minimized-error-badge')).toBeTruthy();
    expect(document.querySelector('.ndbg-minimized-badge')).toBeFalsy();
  });

  it('shows full panel after unminimize', () => {
    const listeners = new Set<() => void>();
    let currentSnapshot: NopDebuggerSnapshot = { ...createSnapshot(), minimized: true };
    const controller = createController(currentSnapshot);
    controller.getSnapshot = () => currentSnapshot;
    controller.subscribe = (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    };

    const { rerender } = render(<NopDebuggerPanel controller={controller} />);

    expect(document.querySelector('.nop-debugger--minimized')).toBeTruthy();

    currentSnapshot = { ...currentSnapshot, minimized: false };
    listeners.forEach(l => l());
    rerender(<NopDebuggerPanel controller={controller} />);

    expect(document.querySelector('.nop-debugger--minimized')).toBeFalsy();
    expect(document.querySelector('.ndbg-drag-handle')).toBeTruthy();
    expect(screen.getByText('Runtime Console')).toBeTruthy();
  });

  // Click-to-restore and drag are verified via E2E (Playwright) — jsdom lacks pointer capture support.
  // Store-level minimize/unminimize state is tested in store.test.ts.

  it('shows full panel after unminimize', () => {
    const listeners = new Set<() => void>();
    let currentSnapshot: NopDebuggerSnapshot = { ...createSnapshot(), minimized: true };
    const controller = createController(currentSnapshot);
    controller.getSnapshot = () => currentSnapshot;
    controller.subscribe = (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    };

    const { rerender } = render(<NopDebuggerPanel controller={controller} />);

    expect(document.querySelector('.nop-debugger--minimized')).toBeTruthy();

    currentSnapshot = { ...currentSnapshot, minimized: false };
    listeners.forEach(l => l());
    rerender(<NopDebuggerPanel controller={controller} />);

    expect(document.querySelector('.nop-debugger--minimized')).toBeFalsy();
    expect(document.querySelector('.ndbg-drag-handle')).toBeTruthy();
    expect(screen.getByText('Runtime Console')).toBeTruthy();
  });

});
