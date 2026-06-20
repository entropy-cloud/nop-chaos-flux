import type {
  ActionContext,
  ActionScope,
  ComponentHandleRegistry,
  RendererEnv,
  RendererPlugin,
  RendererRuntime,
} from '@nop-chaos/flux-core';
import { setStrictValidationGlobal } from '@nop-chaos/flux-core';
import { appendActionErrorEvent, createDebuggerPlugin, decorateDebuggerEnv } from './adapters.js';
import {
  createAutomationApi,
  getNopDebuggerAutomationApi as getAutomationApi,
  installNopDebuggerWindowFlag,
  registerAutomationApi,
} from './automation.js';
import {
  buildGetComponentTree,
  buildInspectByCid,
  buildInspectByElement,
  buildEvaluateNodeExpression,
} from './controller-component-inspector.js';
import {
  createRequestInstanceIdFactory,
  createSessionId,
  loadPersistedMinimized,
  loadPersistedPanelOpen,
  loadPersistedPosition,
  persistMinimized,
  persistPanelOpen,
  persistPosition,
  readWindowConfig,
} from './controller-helpers.js';
import {
  applyEventQuery,
  buildInteractionTrace,
  buildNodeDiagnostics,
  buildOverview,
  buildSessionExport,
  createDiagnosticReport,
  getLatestFailedAction,
  getLatestFailedRequest,
  getNodeAnomalies,
  getRecentFailures,
} from './diagnostics.js';
import {
  explainNodeAsync,
  explainNodeFailure,
  explainNodeMeta,
  explainNodeValue,
} from './explanations.js';
import { normalizeRedactionOptions, redactData } from './redaction.js';
import { createDebuggerStore } from './store.js';
import type {
  NopComponentInspectResult,
  NopDebugEvent,
  NopDebugEventQuery,
  NopDebuggerAutomationApi,
  NopDebuggerController,
  NopDebuggerOptions,
  NopDebuggerSessionExportOptions,
  NopDebuggerTab,
  NopDiagnosticReport,
  NopDiagnosticReportOptions,
  NopInteractionTraceQuery,
  NopNodeDiagnosticsOptions,
  NopWaitForEventOptions,
} from './types.js';

function appendActionScopeSnapshotEvent(args: {
  store: ReturnType<typeof createDebuggerStore>;
  actionScope: ActionScope;
}) {
  const debugSnapshot = args.actionScope.getDebugSnapshot?.();
  if (!debugSnapshot) {
    return;
  }

  args.store.append({
    kind: 'state:snapshot',
    group: 'node',
    level: 'info',
    source: 'controller.setActionScope',
    summary: `action scope snapshot (${debugSnapshot.namespaces.length} namespace${debugSnapshot.namespaces.length === 1 ? '' : 's'})`,
    detail: `scopeId=${debugSnapshot.id} | parentId=${debugSnapshot.parentId ?? 'none'}`,
    exportedData: debugSnapshot,
  });
}

export function createNopDebugger(options: NopDebuggerOptions = {}): NopDebuggerController {
  const windowConfig = readWindowConfig();
  const enabled = options.enabled ?? windowConfig.enabled;
  const capturePerformance = options.capturePerformance ?? enabled;
  const debuggerId = options.id ?? 'default';
  const sessionId = createSessionId(debuggerId);
  const maxEvents = options.maxEvents ?? 400;
  const exposeAutomationApi = options.exposeAutomationApi ?? false;
  const redaction = normalizeRedactionOptions(options.redaction);
  const persistedPosition = loadPersistedPosition(debuggerId);
  const persistedPanelOpen = loadPersistedPanelOpen(debuggerId);
  const persistedMinimized = loadPersistedMinimized(debuggerId);
  const initialPosition = persistedPosition ?? windowConfig.position;
  const initialPanelOpen = persistedPanelOpen ?? windowConfig.defaultOpen;

  const store = createDebuggerStore({
    enabled,
    sessionId,
    maxEvents,
    defaultOpen: initialPanelOpen,
    defaultTab: windowConfig.defaultTab,
    position: initialPosition,
    errorBufferKeepEarliest: options.errorBuffer?.keepEarliest ?? 3,
    errorBufferKeepLatest: options.errorBuffer?.keepLatest ?? 5,
  });

  if (persistedMinimized) {
    store.minimize();
  }

  const requestState = new Map<
    string,
    {
      startedAt: number;
      requestInstanceId: string;
      interactionId?: string;
      nodeId?: string;
      path?: string;
    }
  >();
  const nextRequestInstanceId = createRequestInstanceIdFactory();
  let componentRegistry: ComponentHandleRegistry | undefined;
  let runtime: RendererRuntime | undefined;

  const getRuntime = () => runtime;
  let currentInspectByCid = buildInspectByCid(componentRegistry, getRuntime);
  let currentInspectByElement = buildInspectByElement(componentRegistry, getRuntime);
  let currentGetComponentTree = buildGetComponentTree(componentRegistry, getRuntime);
  let currentEvaluateNodeExpression = buildEvaluateNodeExpression(currentInspectByCid);

  const getSnapshot = () => store.getSnapshot();
  const getOverview = () => buildOverview(getSnapshot().events);
  const queryEvents = (query?: NopDebugEventQuery) => applyEventQuery(getSnapshot().events, query);
  const getLatestEvent = (query?: NopDebugEventQuery) => queryEvents({ ...query, limit: 1 })[0];
  const getLatestError = () => getLatestEvent({ group: 'error' });
  const getEarliestErrors = () => getSnapshot().pinnedErrors.earliest;
  const getLatestErrors = () => getSnapshot().pinnedErrors.latest;
  const getPinnedErrors = () => getSnapshot().pinnedErrors;
  const getNodeDiagnostics = (nodeOptions: NopNodeDiagnosticsOptions) =>
    buildNodeDiagnostics(getSnapshot().events, nodeOptions);
  const getInteractionTrace = (traceQuery: NopInteractionTraceQuery) =>
    buildInteractionTrace(getSnapshot().events, traceQuery);
  const getLatestFailedRequestSummary = () => getLatestFailedRequest(getSnapshot().events);
  const getLatestFailedActionSummary = () => getLatestFailedAction(getSnapshot().events);
  const getNodeAnomaliesSummary = (nodeOptions: NopNodeDiagnosticsOptions) =>
    getNodeAnomalies(getSnapshot().events, nodeOptions);
  const getRecentFailuresSummary = (options?: { sinceTimestamp?: number; limit?: number }) =>
    getRecentFailures(getSnapshot().events, options);
  const getAsyncOwnerDebugSnapshot = () =>
    runtime?.getAsyncOwnerDebugSnapshot?.() ?? { owners: [] };
  const listFormStoreDiagnosticsOwners = () =>
    runtime?.getFormStoreDiagnosticsBridge?.().listOwners() ?? [];
  const startFormStoreDiagnosticsSession = (
    query: Parameters<NopDebuggerController['startFormStoreDiagnosticsSession']>[0],
    options?: Parameters<NopDebuggerController['startFormStoreDiagnosticsSession']>[1],
  ): boolean => runtime?.getFormStoreDiagnosticsBridge?.().startSession(query, options) ?? false;
  const stopFormStoreDiagnosticsSession = (
    query: Parameters<NopDebuggerController['stopFormStoreDiagnosticsSession']>[0],
  ): boolean => runtime?.getFormStoreDiagnosticsBridge?.().stopSession(query) ?? false;
  const clearFormStoreDiagnosticsSession = (
    query: Parameters<NopDebuggerController['clearFormStoreDiagnosticsSession']>[0],
  ): boolean => runtime?.getFormStoreDiagnosticsBridge?.().clearSession(query) ?? false;
  const getFormStoreDiagnosticsSnapshot = (
    query: Parameters<NopDebuggerController['getFormStoreDiagnosticsSnapshot']>[0],
  ) => runtime?.getFormStoreDiagnosticsBridge?.().getSnapshot(query);
  const explainValue = (query: Parameters<NopDebuggerController['explainNodeValue']>[0]) =>
    explainNodeValue({
      query,
      inspect: currentInspectByCid(query.cid),
      redaction,
    });
  const explainMeta = (query: Parameters<NopDebuggerController['explainNodeMeta']>[0]) =>
    explainNodeMeta({
      query,
      inspect: currentInspectByCid(query.cid),
      redaction,
    });
  const explainFailure = (query?: Parameters<NopDebuggerController['explainNodeFailure']>[0]) =>
    explainNodeFailure({
      query,
      inspectByCid: currentInspectByCid,
      events: getSnapshot().events,
    });
  const explainAsyncSummary = (query?: Parameters<NopDebuggerController['explainNodeAsync']>[0]) =>
    explainNodeAsync({
      query,
      inspectByCid: currentInspectByCid,
      asyncSnapshot: getAsyncOwnerDebugSnapshot(),
    });
  const createReport = (reportOptions?: NopDiagnosticReportOptions) =>
    createDiagnosticReport(debuggerId, getSnapshot(), reportOptions);
  const exportSession = (sessionOptions?: NopDebuggerSessionExportOptions) =>
    buildSessionExport(debuggerId, sessionId, getSnapshot(), redaction, sessionOptions);
  const waitForEvent = (waitOptions?: NopWaitForEventOptions) => {
    const timeoutMs = waitOptions?.timeoutMs ?? 5000;
    const immediate = getLatestEvent(waitOptions);

    if (immediate) {
      return Promise.resolve(immediate);
    }

    return new Promise<NopDebugEvent>((resolve, reject) => {
      const startedAt = Date.now();
      const unsubscribe = store.subscribe(() => {
        const next = getLatestEvent({
          ...waitOptions,
          sinceTimestamp: waitOptions?.sinceTimestamp ?? startedAt,
        });

        if (next) {
          clearTimeout(timer);
          unsubscribe();
          resolve(next);
        }
      });

      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timed out waiting for debugger event after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  };

  const automation: NopDebuggerAutomationApi = createAutomationApi({
    controllerId: debuggerId,
    sessionId,
    getSnapshot,
    getOverview,
    queryEvents,
    getLatestEvent,
    getLatestError,
    getEarliestErrors,
    getLatestErrors,
    getPinnedErrors,
    getNodeDiagnostics,
    getInteractionTrace,
    getLatestFailedRequest: getLatestFailedRequestSummary,
    getLatestFailedAction: getLatestFailedActionSummary,
    getNodeAnomalies: getNodeAnomaliesSummary,
    getRecentFailures: getRecentFailuresSummary,
    getAsyncOwnerDebugSnapshot,
    listFormStoreDiagnosticsOwners,
    startFormStoreDiagnosticsSession,
    stopFormStoreDiagnosticsSession,
    clearFormStoreDiagnosticsSession,
    getFormStoreDiagnosticsSnapshot,
    createDiagnosticReport: createReport,
    exportSession,
    waitForEvent,
    clear() {
      store.clear();
    },
    pause() {
      store.pause();
    },
    resume() {
      store.resume();
    },
    show() {
      store.show();
      persistPanelOpen(debuggerId, true);
    },
    hide() {
      store.hide();
      persistPanelOpen(debuggerId, false);
    },
    minimize() {
      store.minimize();
      persistMinimized(debuggerId, true);
    },
    unminimize() {
      store.unminimize();
      persistMinimized(debuggerId, false);
    },
    toggle() {
      store.toggle();
      const snap = store.getSnapshot();
      persistPanelOpen(debuggerId, snap.panelOpen);
    },
    setActiveTab(tab: NopDebuggerTab) {
      store.setActiveTab(tab);
    },
    setPanelPosition(position: { x: number; y: number }) {
      store.setPosition(position);
      persistPosition(debuggerId, position);
    },
    inspectByCid(cid: number) {
      const raw = currentInspectByCid(cid);
      return raw ? (redactData(raw, redaction) as NopComponentInspectResult) : undefined;
    },
    inspectByElement(element: HTMLElement) {
      const raw = currentInspectByElement(element);
      return raw ? (redactData(raw, redaction) as NopComponentInspectResult) : undefined;
    },
    evaluateNodeExpression(args: { cid: number; expression: string }) {
      const raw = currentEvaluateNodeExpression(args);
      if (!raw.ok || raw.value === undefined) {
        return raw;
      }
      return {
        ...raw,
        value: redactData(raw.value, redaction),
      };
    },
    explainNodeValue: explainValue,
    explainNodeMeta: explainMeta,
    explainNodeFailure: explainFailure,
    explainNodeAsync: explainAsyncSummary,
  });

  const plugin: RendererPlugin = createDebuggerPlugin(store, enabled);

  const controller = {
    id: debuggerId,
    enabled,
    plugin,
    sessionId,
    automation,
    decorateEnv(env: RendererEnv) {
        return decorateDebuggerEnv({
          enabled,
          capturePerformance,
          env,
          store,
          redaction,
        requestState,
        nextRequestInstanceId,
      });
    },
    onActionError(error: unknown, ctx: ActionContext) {
      appendActionErrorEvent(store, error, ctx, enabled);
    },
    show() {
      store.show();
      persistPanelOpen(debuggerId, true);
    },
    hide() {
      store.hide();
      persistPanelOpen(debuggerId, false);
    },
    minimize() {
      store.minimize();
      persistMinimized(debuggerId, true);
    },
    unminimize() {
      store.unminimize();
      persistMinimized(debuggerId, false);
    },
    toggle() {
      store.toggle();
      const snap = store.getSnapshot();
      persistPanelOpen(debuggerId, snap.panelOpen);
    },
    clear() {
      store.clear();
    },
    pause() {
      store.pause();
    },
    resume() {
      store.resume();
    },
    setActiveTab(tab: NopDebuggerTab) {
      store.setActiveTab(tab);
    },
    setPanelPosition(position: { x: number; y: number }) {
      store.setPosition(position);
      persistPosition(debuggerId, position);
    },
    toggleFilter(filter) {
      store.toggleFilter(filter);
    },
    queryEvents,
    getLatestEvent,
    getLatestError,
    getEarliestErrors,
    getLatestErrors,
    getPinnedErrors,
    getNodeDiagnostics,
    getInteractionTrace,
    getLatestFailedRequest: getLatestFailedRequestSummary,
    getLatestFailedAction: getLatestFailedActionSummary,
    getNodeAnomalies: getNodeAnomaliesSummary,
    getRecentFailures: getRecentFailuresSummary,
    getAsyncOwnerDebugSnapshot,
    listFormStoreDiagnosticsOwners,
    startFormStoreDiagnosticsSession,
    stopFormStoreDiagnosticsSession,
    clearFormStoreDiagnosticsSession,
    getFormStoreDiagnosticsSnapshot,
    getOverview,
    createDiagnosticReport: createReport,
    exportSession,
    waitForEvent,
    explainNodeValue: explainValue,
    explainNodeMeta: explainMeta,
    explainNodeFailure: explainFailure,
    explainNodeAsync: explainAsyncSummary,
    setRuntime(nextRuntime: RendererRuntime | null) {
      runtime = nextRuntime ?? undefined;
      currentInspectByCid = buildInspectByCid(componentRegistry, getRuntime);
      currentInspectByElement = buildInspectByElement(componentRegistry, getRuntime);
      currentEvaluateNodeExpression = buildEvaluateNodeExpression(currentInspectByCid);
      store.setStrictMode(runtime?.strictMode ?? false);
    },
    subscribe(listener: () => void) {
      return store.subscribe(listener);
    },
    getSnapshot,
    setComponentRegistry(registry: ComponentHandleRegistry | null) {
      if (componentRegistry) {
        componentRegistry.setDebugEnabled?.(false);
      }
      componentRegistry = registry ?? undefined;
      if (componentRegistry) {
        componentRegistry.setDebugEnabled?.(enabled);
      }
      currentInspectByCid = buildInspectByCid(componentRegistry, getRuntime);
      currentInspectByElement = buildInspectByElement(componentRegistry, getRuntime);
      currentGetComponentTree = buildGetComponentTree(componentRegistry, getRuntime);
      currentEvaluateNodeExpression = buildEvaluateNodeExpression(currentInspectByCid);
    },
    setActionScope(nextActionScope: ActionScope | null) {
      const actionScope = nextActionScope ?? undefined;
      if (enabled && actionScope) {
        appendActionScopeSnapshotEvent({
          store,
          actionScope,
        });
      }
    },
    setStrictMode(enabled: boolean) {
      setStrictValidationGlobal(enabled);
      store.setStrictMode(enabled);
    },
    getComponentTree() {
      return currentGetComponentTree();
    },
    inspectByCid(cid: number) {
      return currentInspectByCid(cid);
    },
    inspectByElement(element: HTMLElement) {
      return currentInspectByElement(element);
    },
    evaluateNodeExpression(args: { cid: number; expression: string }) {
      return currentEvaluateNodeExpression(args);
    },
  } satisfies NopDebuggerController;

  if (exposeAutomationApi) {
    registerAutomationApi(debuggerId, automation);
  }

  return controller;
}

export function getNopDebuggerAutomationApi(
  controllerId?: string,
): NopDebuggerAutomationApi | undefined {
  return getAutomationApi(controllerId);
}

export { installNopDebuggerWindowFlag };

export function createNopDiagnosticReport(
  controller: NopDebuggerController,
  options?: NopDiagnosticReportOptions,
): NopDiagnosticReport {
  return controller.createDiagnosticReport(options);
}
