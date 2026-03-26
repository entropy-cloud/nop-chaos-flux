// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NopDebuggerPanel } from './panel';
import type { NopDebuggerController, NopDebuggerOverview, NopDebuggerSnapshot, NopDiagnosticReport, NopInteractionTrace } from './types';

function createSnapshot(): NopDebuggerSnapshot {
  return {
    enabled: true,
    panelOpen: true,
    paused: false,
    activeTab: 'overview',
    position: { x: 24, y: 24 },
    events: [],
    filters: ['render', 'action', 'api', 'compile', 'notify', 'error']
  };
}

function createController(snapshot: NopDebuggerSnapshot): NopDebuggerController {
  const emptyOverview: NopDebuggerOverview = {
    errorCount: 0,
    totalEvents: 0,
    countsByGroup: { render: 0, action: 0, api: 0, compile: 0, notify: 0, error: 0 }
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
    overview: { errorCount: 1, totalEvents: 4, countsByGroup: { render: 1, action: 1, api: 1, compile: 0, notify: 0, error: 1 } },
    latestInteractionTrace: latestTrace,
    recentEvents: []
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
      getNodeDiagnostics: () => ({ rendererTypes: [], totalEvents: 0, countsByGroup: {}, countsByKind: {}, recentEvents: [] }),
      getInteractionTrace: () => latestTrace,
      createDiagnosticReport: () => ({ controllerId: 'panel-test', sessionId: 'session-test', generatedAt: 1, snapshot: { enabled: true, panelOpen: true, paused: false, activeTab: 'overview', filters: snapshot.filters }, overview: emptyOverview, recentEvents: [] }),
      exportSession: () => ({ controllerId: 'panel-test', sessionId: 'session-test', generatedAt: 1, snapshot, overview: emptyOverview, events: [] }),
      waitForEvent: async () => snapshot.events[0]!,
      clear,
      pause,
      resume,
      show,
      hide,
      toggle() {},
      setActiveTab,
      setPanelPosition
    },
    decorateEnv: (env) => env,
    onActionError() {},
    show,
    hide,
    toggle() {},
    clear,
    pause,
    resume,
    setActiveTab,
    setPanelPosition,
    toggleFilter,
    queryEvents: () => [],
    getLatestEvent: () => undefined,
    getLatestError: () => undefined,
    getNodeDiagnostics: () => ({ rendererTypes: [], totalEvents: 0, countsByGroup: {}, countsByKind: {}, recentEvents: [] }),
    getInteractionTrace: () => latestTrace,
    getOverview: () => emptyOverview,
    createDiagnosticReport: vi.fn(() => metricReport),
    exportSession: () => ({ controllerId: 'panel-test', sessionId: 'session-test', generatedAt: 1, snapshot, overview: emptyOverview, events: [] }),
    waitForEvent: async () => snapshot.events[0]!,
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

  it('calls hide when minimize button is clicked', () => {
    const snapshot = createSnapshot();
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    fireEvent.click(screen.getByTitle('Minimize'));

    expect(controller.hide).toHaveBeenCalledTimes(1);
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

});
