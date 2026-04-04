import type {
  ComponentHandle,
  ActionContext,
  ActionScope,
  ComponentHandleRegistry,
  RendererEnv,
  RendererPlugin
} from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { appendActionErrorEvent, createDebuggerPlugin, decorateDebuggerEnv } from './adapters';
import {
  createAutomationApi,
  getNopDebuggerAutomationApi as getAutomationApi,
  installNopDebuggerWindowFlag,
  registerAutomationApi
} from './automation';
import { buildScopeChain, createRequestInstanceIdFactory, createSessionId, loadPersistedMinimized, loadPersistedPanelOpen, loadPersistedPosition, persistMinimized, persistPanelOpen, persistPosition, readWindowConfig } from './controller-helpers';
import { applyEventQuery, buildInteractionTrace, buildNodeDiagnostics, buildOverview, buildSessionExport, createDiagnosticReport, getLatestFailedAction, getLatestFailedRequest, getNodeAnomalies, getRecentFailures } from './diagnostics';
import { normalizeRedactionOptions } from './redaction';
import { createDebuggerStore } from './store';
import type {
  NopComponentInspectResult,
  NopDebugEvent,
  NopDebugEventQuery,
  NopDebuggerAutomationApi,
  NopDebuggerController,
  NopExpressionEvaluationResult,
  NopDebuggerOptions,
  NopDebuggerSessionExportOptions,
  NopDebuggerTab,
  NopDiagnosticReport,
  NopDiagnosticReportOptions,
  NopInteractionTraceQuery,
  NopNodeDiagnosticsOptions,
  NopWaitForEventOptions
} from './types';

function pickRecord(source: Record<string, unknown> | undefined, keys: readonly string[]) {
  if (!source) {
    return undefined;
  }

  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));
}

function getAvailableMethods(handle: ComponentHandle | undefined) {
  return handle?.capabilities?.listMethods?.();
}

function buildInspectResult(
  cid: number,
  handle: ReturnType<NonNullable<ComponentHandleRegistry['getHandleByCid']>> | undefined,
  mounted: boolean,
  element?: HTMLElement,
  registry?: ComponentHandleRegistry
): NopComponentInspectResult {
  const debugData = registry?.getHandleDebugData?.(cid);
  const result: NopComponentInspectResult = {
    cid,
    mounted
  };
  if (handle) {
    result.handleId = handle.id;
    result.handleName = handle.name;
    result.handleType = handle.type;
  }

  result.nodeId = debugData?.nodeId;
  result.path = debugData?.path;
  result.rendererType = debugData?.rendererType;
  result.availableMethods = getAvailableMethods(handle);
  result.registryEntry = handle ? {
    id: handle.id,
    name: handle.name,
    type: handle.type,
    mounted: handle._mounted !== false
  } : undefined;
  result.debugData = handle?.capabilities?.getDebugData?.();

  if (debugData?.scope) {
    result.scopeChain = buildScopeChain(debugData.scope);
    result.scopeData = debugData.scope.read();
  }

  result.metaSummary = pickRecord(debugData?.resolvedMeta as Record<string, unknown> | undefined, ['id', 'name', 'label', 'title', 'className', 'visible', 'hidden', 'disabled', 'testid', 'cid']);
  result.propsSummary = pickRecord(debugData?.resolvedProps as Record<string, unknown> | undefined, ['id', 'name', 'label', 'title', 'type', 'value', 'placeholder', 'options']);

  const capabilityStore = handle?.capabilities?.store as {
    getState(): {
      values?: Record<string, unknown>;
      errors?: Record<string, unknown>;
      touched?: Record<string, boolean>;
      dirty?: Record<string, boolean>;
      visited?: Record<string, boolean>;
      submitting?: boolean;
    };
  } | undefined;

  if (capabilityStore) {
    try {
      const state = capabilityStore.getState();
      result.formState = {
        values: state.values ?? {},
        errors: state.errors ?? {},
        touched: state.touched ?? {},
        dirty: state.dirty ?? {},
        visited: state.visited ?? {},
        submitting: state.submitting ?? false
      };
      result.scopeData = state.values ?? {};
    } catch {
      void 0;
    }
  }

  if (element) {
    result.tagName = element.tagName.toLowerCase();
    result.className = element.className || undefined;
  }

  return result;
}

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
  let actionScope: ActionScope | undefined;

  const inspectByCid = (cid: number): NopComponentInspectResult | undefined => {
    if (!componentRegistry) return undefined;
    const element = document.querySelector(`[data-cid="${cid}"]`);
    const handle = element ? componentRegistry.getHandleByCid?.(cid) : undefined;
    if (!handle && !element) return undefined;
    return buildInspectResult(cid, handle, !!element, (element as HTMLElement) ?? undefined, componentRegistry);
  };

  const inspectByElement = (element: HTMLElement): NopComponentInspectResult | undefined => {
    const cidAttr = element.getAttribute('data-cid');
    if (!cidAttr) return undefined;
    const cid = Number(cidAttr);
    if (!Number.isFinite(cid)) return undefined;
    const handle = componentRegistry?.getHandleByCid?.(cid);
    return buildInspectResult(cid, handle, true, element, componentRegistry);
  };

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
  const createReport = (reportOptions?: NopDiagnosticReportOptions) => createDiagnosticReport(debuggerId, getSnapshot(), reportOptions);
  const exportSession = (sessionOptions?: NopDebuggerSessionExportOptions) => buildSessionExport(debuggerId, sessionId, getSnapshot(), redaction, sessionOptions);
  const evaluateNodeExpression = (args: { cid: number; expression: string }): NopExpressionEvaluationResult => {
    const inspectResult = inspectByCid(args.cid);

    if (!inspectResult?.scopeChain?.[0]) {
      return {
        expression: args.expression,
        ok: false,
        error: 'Node scope is unavailable for expression evaluation.'
      };
    }

    try {
      const compiler = createFormulaCompiler();
      const compiled = compiler.compileExpression(args.expression);

      return {
        expression: args.expression,
        ok: true,
        value: compiled.exec(inspectResult.scopeChain[0].data, {
          fetcher: async () => { throw new Error('API calls are not available during expression evaluation.'); },
          notify() {
            return undefined;
          }
        }),
        usedScopeLabel: inspectResult.scopeChain[0].label
      };
    } catch (error) {
      return {
        expression: args.expression,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        usedScopeLabel: inspectResult.scopeChain[0].label
      };
    }
  };
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
    getOverview,
    createDiagnosticReport: createReport,
    exportSession,
    waitForEvent,
    subscribe(listener: () => void) {
      return store.subscribe(listener);
    },
    getSnapshot,
    setComponentRegistry(registry: ComponentHandleRegistry | null) {
      componentRegistry = registry ?? undefined;
    },
    setActionScope(nextActionScope: ActionScope | null) {
      actionScope = nextActionScope ?? undefined;
      if (actionScope) {
        appendActionScopeSnapshotEvent({
          store,
          actionScope
        });
      }
    },
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
