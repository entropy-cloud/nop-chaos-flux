import { vi } from 'vitest';
import type { NopComponentTreeItem } from './types.js';
import type {
  NopDebuggerController,
  NopDebuggerOverview,
  NopDebuggerSnapshot,
  NopDiagnosticReport,
  NopInteractionTrace,
} from './types.js';

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
    renderCommitCount: 0,
    renderBurstCount: 0,
    renderUniqueNodeCount: 0,
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
      renderCommitCount: 1,
      renderBurstCount: 0,
      renderUniqueNodeCount: 1,
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
        renderCommitCount: 0,
        renderBurstCount: 0,
        recentEvents: [],
      }),
      getInteractionTrace: () => latestTrace,
      getLatestFailedRequest: () => undefined,
      getLatestFailedAction: () => undefined,
      getNodeAnomalies: () => undefined,
      getRecentFailures: () => [],
      getAsyncOwnerDebugSnapshot: () => ({ owners: [] }),
      listFormStoreDiagnosticsOwners: () => [],
      startFormStoreDiagnosticsSession: () => false,
      stopFormStoreDiagnosticsSession: () => false,
      clearFormStoreDiagnosticsSession: () => false,
      getFormStoreDiagnosticsSnapshot: () => undefined,
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
      renderCommitCount: 0,
      renderBurstCount: 0,
      recentEvents: [],
    }),
    getInteractionTrace: () => latestTrace,
    getLatestFailedRequest: () => undefined,
    getLatestFailedAction: () => undefined,
    getNodeAnomalies: () => undefined,
    getRecentFailures: () => [],
    getAsyncOwnerDebugSnapshot: () => ({ owners: [] }),
    listFormStoreDiagnosticsOwners: () => [],
    startFormStoreDiagnosticsSession: () => false,
    stopFormStoreDiagnosticsSession: () => false,
    clearFormStoreDiagnosticsSession: () => false,
    getFormStoreDiagnosticsSnapshot: () => undefined,
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
