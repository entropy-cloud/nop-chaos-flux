import type {
  ActionContext,
  ActionScope,
  ComponentHandleRegistry,
  RendererEnv,
  RendererPlugin,
  RendererRuntime
} from '@nop-chaos/flux-core';
import { appendActionErrorEvent, createDebuggerPlugin, decorateDebuggerEnv } from './adapters';
import {
  createAutomationApi,
  getNopDebuggerAutomationApi as getAutomationApi,
  installNopDebuggerWindowFlag,
  registerAutomationApi
} from './automation';
import {
  buildGetComponentTree,
  buildInspectByCid,
  buildInspectByElement,
  buildEvaluateNodeExpression
} from './controller-component-inspector';
import { createRequestInstanceIdFactory, createSessionId, loadPersistedMinimized, loadPersistedPanelOpen, loadPersistedPosition, persistMinimized, persistPanelOpen, persistPosition, readWindowConfig } from './controller-helpers';
import { applyEventQuery, buildInteractionTrace, buildNodeDiagnostics, buildOverview, buildSessionExport, createDiagnosticReport, getLatestFailedAction, getLatestFailedRequest, getNodeAnomalies, getRecentFailures } from './diagnostics';
import { normalizeRedactionOptions } from './redaction';
import { createDebuggerStore } from './store';
import type {
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
  NopWaitForEventOptions
} from './types';

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
    exportedData: debugSnapshot
  });
}

export function createNopDebugger(options: NopDebuggerOptions = {}): NopDebuggerController {
  const windowConfig = readWindowConfig();
  const enabled = options.enabled ?? windowConfig.enabled;
  const debuggerId = options.id ?? 'default';
  const sessionId = createSessionId(debuggerId);
  const maxEvents = options.maxEvents ?? 400;
  const exposeAutomationApi = options.exposeAutomationApi ?? true;
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
    errorBufferKeepLatest: options.errorBuffer?.keepLatest ?? 5
  });

  if (persistedMinimized) {
    store.minimize();
  }

  const requestState = new Map<string, { startedAt: number; requestInstanceId: string; interactionId?: string; nodeId?: string; path?: string }>();
  const nextRequestInstanceId = createRequestInstanceIdFactory();
  let componentRegistry: ComponentHandleRegistry | undefined;
  let runtime: RendererRuntime | undefined;

  const inspectByCid = buildInspectByCid(componentRegistry);
  const inspectByElement = buildInspectByElement(componentRegistry);
  const getComponentTree = buildGetComponentTree(componentRegistry);
  const evaluateNodeExpression = buildEvaluateNodeExpression(inspectByCid);

  const inspectNode = (cid: number) => inspectByCid(cid);

  const getSnapshot = () => store.getSnapshot();
  const getOverview = () => buildOverview(getSnapshot().events);
  const queryEvents = (query?: NopDebugEventQuery) => applyEventQuery(getSnapshot().events, query);
  const getLatestEvent = (query?: NopDebugEventQuery) => queryEvents({ ...query, limit: 1 })[0];
  const getLatestError = () => getLatestEvent({ group: 'error' });
  const getEarliestErrors = () => getSnapshot().pinnedErrors.earliest;
  const getLatestErrors = () => getSnapshot().pinnedErrors.latest;
  const getPinnedErrors = () => getSnapshot().pinnedErrors;
  const getNodeDiagnostics = (nodeOptions: NopNodeDiagnosticsOptions) => buildNodeDiagnostics(getSnapshot().events, nodeOptions);
  const getInteractionTrace = (traceQuery: NopInteractionTraceQuery) => buildInteractionTrace(getSnapshot().events, traceQuery);
  const getLatestFailedRequestSummary = () => getLatestFailedRequest(getSnapshot().events);
  const getLatestFailedActionSummary = () => getLatestFailedAction(getSnapshot().events);
  const getNodeAnomaliesSummary = (nodeOptions: NopNodeDiagnosticsOptions) => getNodeAnomalies(getSnapshot().events, nodeOptions);
  const getRecentFailuresSummary = (options?: { sinceTimestamp?: number; limit?: number }) => getRecentFailures(getSnapshot().events, options);
  const getAsyncOwnerDebugSnapshot = () => runtime?.getAsyncOwnerDebugSnapshot?.() ?? { owners: [] };
  const createReport = (reportOptions?: NopDiagnosticReportOptions) => createDiagnosticReport(debuggerId, getSnapshot(), reportOptions);
  const exportSession = (sessionOptions?: NopDebuggerSessionExportOptions) => buildSessionExport(debuggerId, sessionId, getSnapshot(), redaction, sessionOptions);
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
          sinceTimestamp: waitOptions?.sinceTimestamp ?? startedAt
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
    createDiagnosticReport: createReport,
    exportSession,
    waitForEvent,
    inspectNode,
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
    inspectByCid,
    inspectByElement,
    evaluateNodeExpression
  });

  const plugin: RendererPlugin = createDebuggerPlugin(store);

  const controller = {
    id: debuggerId,
    enabled,
    plugin,
    sessionId,
    automation,
    decorateEnv(env: RendererEnv) {
      return decorateDebuggerEnv({
        enabled,
        env,
        store,
        redaction,
        requestState,
        nextRequestInstanceId
      });
    },
    onActionError(error: unknown, ctx: ActionContext) {
      appendActionErrorEvent(store, error, ctx);
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
    getOverview,
    createDiagnosticReport: createReport,
    exportSession,
    waitForEvent,
    setRuntime(nextRuntime: RendererRuntime | null) {
      runtime = nextRuntime ?? undefined;
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
        componentRegistry.setDebugEnabled?.(true);
      }
      const updatedInspectByCid = buildInspectByCid(componentRegistry);
      Object.assign(controller, {
        inspectByCid: updatedInspectByCid,
        inspectByElement: buildInspectByElement(componentRegistry),
        getComponentTree: buildGetComponentTree(componentRegistry),
        evaluateNodeExpression: buildEvaluateNodeExpression(updatedInspectByCid),
        inspectNode: updatedInspectByCid
      });
    },
    setActionScope(nextActionScope: ActionScope | null) {
      const actionScope = nextActionScope ?? undefined;
      if (actionScope) {
        appendActionScopeSnapshotEvent({
          store,
          actionScope
        });
      }
    },
    getComponentTree,
    inspectNode,
    inspectByCid,
    inspectByElement,
    evaluateNodeExpression
  } satisfies NopDebuggerController;

  if (exposeAutomationApi) {
    registerAutomationApi(debuggerId, automation);
  }

  return controller;
}

export function getNopDebuggerAutomationApi(controllerId?: string): NopDebuggerAutomationApi | undefined {
  return getAutomationApi(controllerId);
}

export { installNopDebuggerWindowFlag };

export function createNopDiagnosticReport(
  controller: NopDebuggerController,
  options?: NopDiagnosticReportOptions
): NopDiagnosticReport {
  return controller.createDiagnosticReport(options);
}
