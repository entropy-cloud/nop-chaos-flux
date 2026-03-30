import type {
  ActionContext,
  ComponentHandleRegistry,
  RendererEnv,
  RendererPlugin
} from '@nop-chaos/flux-core';
import { appendActionErrorEvent, createDebuggerPlugin, decorateDebuggerEnv } from './adapters';
import {
  createAutomationApi,
  getNopDebuggerAutomationApi as getAutomationApi,
  installNopDebuggerWindowFlag,
  registerAutomationApi
} from './automation';
import { createSessionId, loadPersistedPanelOpen, loadPersistedPosition, persistPanelOpen, persistPosition, readWindowConfig } from './controller-helpers';
import { applyEventQuery, buildInteractionTrace, buildNodeDiagnostics, buildOverview, buildSessionExport, createDiagnosticReport } from './diagnostics';
import { normalizeRedactionOptions } from './redaction';
import { createDebuggerStore } from './store';
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
  NopWaitForEventOptions
} from './types';

type InternalComponentHandle = {
  _cid?: number;
  id?: string;
  name?: string;
  type: string;
  _mounted?: boolean;
};

function findHandleByCid(registry: ComponentHandleRegistry, cid: number): InternalComponentHandle | undefined {
  const typed = registry as unknown as {
    handles?: Map<number, InternalComponentHandle>;
  };
  if (typed.handles) {
    for (const handle of typed.handles.values()) {
      if (handle._cid === cid) return handle;
    }
  }
  if (registry.parent) {
    return findHandleByCid(registry.parent, cid);
  }
  return undefined;
}

function buildInspectResult(
  cid: number,
  handle: InternalComponentHandle | undefined,
  mounted: boolean
): NopComponentInspectResult {
  const result: NopComponentInspectResult = {
    cid,
    mounted
  };
  if (handle) {
    result.handleId = handle.id;
    result.handleName = handle.name;
    result.handleType = handle.type;
  }
  return result;
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

  const requestState = new Map<string, { startedAt: number }>();
  let componentRegistry: ComponentHandleRegistry | undefined;

  const inspectByCid = (cid: number): NopComponentInspectResult | undefined => {
    if (!componentRegistry) return undefined;
    const element = document.querySelector(`[data-cid="${cid}"]`);
    const handle = element ? findHandleByCid(componentRegistry, cid) : undefined;
    if (!handle && !element) return undefined;
    return buildInspectResult(cid, handle, !!element);
  };

  const inspectByElement = (element: HTMLElement): NopComponentInspectResult | undefined => {
    const cidAttr = element.getAttribute('data-cid');
    if (!cidAttr) return undefined;
    const cid = Number(cidAttr);
    if (!Number.isFinite(cid)) return undefined;
    const handle = componentRegistry ? findHandleByCid(componentRegistry, cid) : undefined;
    return buildInspectResult(cid, handle, true);
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
    inspectByElement
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
        requestState
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
    inspectByCid,
    inspectByElement
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

