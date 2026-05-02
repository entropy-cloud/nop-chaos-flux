// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { NopDebuggerPanel } from './panel';
import type { NopComponentTreeItem } from './types';
import type {
  NopDebuggerController,
  NopDebuggerOverview,
  NopDebuggerSnapshot,
  NopDiagnosticReport,
  NopInteractionTrace,
} from './types';

function createValueExplanation() {
  return {
    kind: 'value' as const,
    subject: { cid: 1, field: 'value' },
    answer: 'value explanation',
    confidence: 'low' as const,
    limitations: [],
    evidenceRefs: [],
    related: { cid: 1 },
    truncated: false,
    data: { field: 'value', valueSource: 'unknown' as const },
  };
}

function createMetaExplanation() {
  return {
    kind: 'meta' as const,
    subject: { cid: 1, field: 'visible' as const },
    answer: 'meta explanation',
    confidence: 'low' as const,
    limitations: [],
    evidenceRefs: [],
    related: { cid: 1 },
    truncated: false,
    data: { field: 'visible' as const, source: 'unknown' as const, dependencyPaths: [] },
  };
}

function createFailureExplanation() {
  return {
    kind: 'failure' as const,
    subject: { cid: 1 },
    answer: 'failure explanation',
    confidence: 'low' as const,
    limitations: [],
    evidenceRefs: [],
    related: { cid: 1 },
    truncated: false,
    data: { failureType: 'unknown' as const, hints: [], relatedEventIds: [] },
  };
}

function createAsyncExplanation() {
  return {
    kind: 'async' as const,
    subject: { cid: 1 },
    answer: 'async explanation',
    confidence: 'low' as const,
    limitations: [],
    evidenceRefs: [],
    related: { cid: 1, ownerIds: [] },
    truncated: false,
    data: { ownerCount: 0, owners: [] },
  };
}

export function createSnapshot(): NopDebuggerSnapshot {
  return {
    enabled: true,
    panelOpen: true,
    minimized: false,
    paused: false,
    activeTab: 'overview',
    position: { x: 24, y: 24 },
    events: [],
    filters: ['render', 'action', 'api', 'compile', 'notify', 'error'],
    pinnedErrors: { earliest: [], latest: [] },
    strictMode: false,
  };
}

export function createController(snapshot: NopDebuggerSnapshot): NopDebuggerController {
  const emptyOverview: NopDebuggerOverview = {
    errorCount: 0,
    totalEvents: 0,
    countsByGroup: { render: 0, action: 0, api: 0, compile: 0, notify: 0, error: 0, node: 0 },
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
      summary: 'submit failed',
    },
    totalEvents: 4,
    matchedEvents: [],
    relatedErrors: [],
    requestKeys: ['POST /api/users | user-form | body.1'],
    requestInstanceIds: ['req-1'],
    interactionIds: ['interaction-1'],
    actionTypes: ['submitForm'],
    nodeIds: ['user-form'],
    paths: ['body.1'],
  };
  const metricReport: NopDiagnosticReport = {
    controllerId: 'panel-test',
    sessionId: 'session-test',
    generatedAt: 1,
    snapshot: {
      enabled: true,
      panelOpen: true,
      paused: false,
      activeTab: 'overview',
      filters: snapshot.filters,
    },
    overview: {
      errorCount: 1,
      totalEvents: 4,
      countsByGroup: { render: 1, action: 1, api: 1, compile: 0, notify: 0, error: 1, node: 0 },
    },
    latestInteractionTrace: latestTrace,
    recentEvents: [],
    pinnedErrors: { earliest: [], latest: [] },
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
      getNodeDiagnostics: () => ({
        rendererTypes: [],
        totalEvents: 0,
        countsByGroup: {},
        countsByKind: {},
        recentEvents: [],
      }),
      getInteractionTrace: () => latestTrace,
      getLatestFailedRequest: () => undefined,
      getLatestFailedAction: () => undefined,
      getNodeAnomalies: () => undefined,
      getRecentFailures: () => [],
      getAsyncOwnerDebugSnapshot: () => ({ owners: [] }),
      createDiagnosticReport: () => ({
        controllerId: 'panel-test',
        sessionId: 'session-test',
        generatedAt: 1,
        snapshot: {
          enabled: true,
          panelOpen: true,
          paused: false,
          activeTab: 'overview',
          filters: snapshot.filters,
        },
        overview: emptyOverview,
        recentEvents: [],
        pinnedErrors: { earliest: [], latest: [] },
      }),
      exportSession: () => ({
        controllerId: 'panel-test',
        sessionId: 'session-test',
        generatedAt: 1,
        snapshot,
        overview: emptyOverview,
        events: [],
        pinnedErrors: { earliest: [], latest: [] },
      }),
      waitForEvent: async () => snapshot.events[0]!,
      inspectNode: vi.fn(() => undefined),
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
      inspectByElement: vi.fn(() => undefined),
      evaluateNodeExpression: vi.fn(() => ({ expression: 'x', ok: true, value: 1 })),
      explainNodeValue: vi.fn(() => createValueExplanation()),
      explainNodeMeta: vi.fn(() => createMetaExplanation()),
      explainNodeFailure: vi.fn(() => createFailureExplanation()),
      explainNodeAsync: vi.fn(() => createAsyncExplanation()),
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
    setStrictMode: vi.fn(),
    queryEvents: () => [],
    getLatestEvent: () => undefined,
    getLatestError: () => undefined,
    getEarliestErrors: () => [],
    getLatestErrors: () => [],
    getPinnedErrors: () => ({ earliest: [], latest: [] }),
    getNodeDiagnostics: () => ({
      rendererTypes: [],
      totalEvents: 0,
      countsByGroup: {},
      countsByKind: {},
      recentEvents: [],
    }),
    getInteractionTrace: () => latestTrace,
    getLatestFailedRequest: () => undefined,
    getLatestFailedAction: () => undefined,
    getNodeAnomalies: () => undefined,
    getRecentFailures: () => [],
    getAsyncOwnerDebugSnapshot: () => ({ owners: [] }),
    getOverview: () => emptyOverview,
    createDiagnosticReport: vi.fn(() => metricReport),
    exportSession: () => ({
      controllerId: 'panel-test',
      sessionId: 'session-test',
      generatedAt: 1,
      snapshot,
      overview: emptyOverview,
      events: [],
      pinnedErrors: { earliest: [], latest: [] },
    }),
    waitForEvent: async () => snapshot.events[0]!,
    setRuntime: vi.fn(),
    setComponentRegistry: vi.fn(),
    setActionScope: vi.fn(),
    getComponentTree: () => [] as NopComponentTreeItem[],
    inspectNode: vi.fn(() => undefined),
    inspectByCid: vi.fn(() => undefined),
    inspectByElement: vi.fn(() => undefined),
    evaluateNodeExpression: vi.fn(() => ({ expression: 'x', ok: true, value: 1 })),
    explainNodeValue: vi.fn(() => createValueExplanation()),
    explainNodeMeta: vi.fn(() => createMetaExplanation()),
    explainNodeFailure: vi.fn(() => createFailureExplanation()),
    explainNodeAsync: vi.fn(() => createAsyncExplanation()),
    subscribe: () => () => {},
    getSnapshot: () => snapshot,
  };
}

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
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

  it('renders controller-backed component tree entries and inspects them by cid', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'node';
    const controller = createController(snapshot);
    const inspectByCid = vi.fn(() => ({ cid: 41, mounted: true, handleType: 'form' }));

    controller.getComponentTree = () => [
      {
        cid: 41,
        type: 'form',
        label: 'user-form',
        depth: 0,
        mounted: true,
      },
    ];
    controller.inspectByCid = inspectByCid;

    render(<NopDebuggerPanel controller={controller} />);

    fireEvent.click(screen.getByText('user-form'));

    expect(inspectByCid).toHaveBeenCalledWith(41);
    expect(screen.getByText('Component Inspector')).toBeTruthy();
  });

  it('marks the selected component tree entry with the selected class', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'node';
    const controller = createController(snapshot);

    controller.getComponentTree = () => [
      {
        cid: 41,
        type: 'form',
        label: 'user-form',
        depth: 0,
        mounted: true,
      },
    ];
    controller.inspectByCid = vi.fn(() => ({ cid: 41, mounted: true, handleType: 'form' }));

    render(<NopDebuggerPanel controller={controller} />);

    const treeItem = screen.getByText('user-form').closest('.ndbg-tree-item');
    expect(treeItem?.className).toBe('ndbg-tree-item');

    fireEvent.click(screen.getByText('user-form'));

    expect(treeItem?.className).toBe('ndbg-tree-item selected');
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
    snapshot.events = [
      {
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
        durationMs: 150,
      },
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('Action completed')).toBeTruthy();
  });

  it('shows error badge on launcher when errors exist', () => {
    const snapshot = { ...createSnapshot(), panelOpen: false };
    snapshot.events = [
      {
        id: 1,
        sessionId: 'session-test',
        timestamp: 100,
        kind: 'error',
        group: 'error',
        level: 'error',
        source: 'test',
        summary: 'Test error',
      },
    ];
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

  it('creates debugger inspect overlays with data-overlay-state markers', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'node';
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick element' }));

    expect(
      document.querySelector('.nop-debugger-overlay[data-overlay-state="hover"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('.nop-debugger-overlay[data-overlay-state="active"]'),
    ).toBeTruthy();
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
        requestKey: 'GET /api/users',
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
        durationMs: 50,
      },
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('network')).toBeTruthy();
  });
});
