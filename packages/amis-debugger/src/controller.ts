import type {
  ActionContext,
  RendererEnv,
  RendererPlugin
} from '@nop-chaos/flux-core';
import { appendActionErrorEvent, createDebuggerPlugin, decorateDebuggerEnv } from './adapters';
import {
  createAutomationApi,
  getAmisDebuggerAutomationApi as getAutomationApi,
  installAmisDebuggerWindowFlag,
  registerAutomationApi
} from './automation';
import { createSessionId, readWindowConfig } from './controller-helpers';
import { applyEventQuery, buildInteractionTrace, buildNodeDiagnostics, buildOverview, buildSessionExport, createDiagnosticReport } from './diagnostics';
import { normalizeRedactionOptions } from './redaction';
import { createDebuggerStore } from './store';
import type {
  AmisDebugEvent,
  AmisDebugEventQuery,
  AmisDebuggerAutomationApi,
  AmisDebuggerController,
  AmisDebuggerOptions,
  AmisDebuggerSessionExportOptions,
  AmisDebuggerTab,
  AmisDiagnosticReport,
  AmisDiagnosticReportOptions,
  AmisInteractionTraceQuery,
  AmisNodeDiagnosticsOptions,
  AmisWaitForEventOptions
} from './types';

export function createAmisDebugger(options: AmisDebuggerOptions = {}): AmisDebuggerController {
  const windowConfig = readWindowConfig();
  const enabled = options.enabled ?? windowConfig.enabled;
  const debuggerId = options.id ?? 'default';
  const sessionId = createSessionId(debuggerId);
  const maxEvents = options.maxEvents ?? 400;
  const exposeAutomationApi = options.exposeAutomationApi ?? true;
  const redaction = normalizeRedactionOptions(options.redaction);

  const store = createDebuggerStore({
    enabled,
    sessionId,
    maxEvents,
    defaultOpen: windowConfig.defaultOpen,
    defaultTab: windowConfig.defaultTab,
    position: windowConfig.position
  });

  const requestState = new Map<string, { startedAt: number }>();

  const getSnapshot = () => store.getSnapshot();
  const getOverview = () => buildOverview(getSnapshot().events);
  const queryEvents = (query?: AmisDebugEventQuery) => applyEventQuery(getSnapshot().events, query);
  const getLatestEvent = (query?: AmisDebugEventQuery) => queryEvents({ ...query, limit: 1 })[0];
  const getLatestError = () => getLatestEvent({ group: 'error' });
  const getNodeDiagnostics = (nodeOptions: AmisNodeDiagnosticsOptions) => buildNodeDiagnostics(getSnapshot().events, nodeOptions);
  const getInteractionTrace = (traceQuery: AmisInteractionTraceQuery) => buildInteractionTrace(getSnapshot().events, traceQuery);
  const createReport = (reportOptions?: AmisDiagnosticReportOptions) => createDiagnosticReport(debuggerId, getSnapshot(), reportOptions);
  const exportSession = (sessionOptions?: AmisDebuggerSessionExportOptions) => buildSessionExport(debuggerId, sessionId, getSnapshot(), redaction, sessionOptions);
  const waitForEvent = (waitOptions?: AmisWaitForEventOptions) => {
    const timeoutMs = waitOptions?.timeoutMs ?? 5000;
    const immediate = getLatestEvent(waitOptions);

    if (immediate) {
      return Promise.resolve(immediate);
    }

    return new Promise<AmisDebugEvent>((resolve, reject) => {
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

  const automation: AmisDebuggerAutomationApi = createAutomationApi({
    controllerId: debuggerId,
    sessionId,
    getSnapshot,
    getOverview,
    queryEvents,
    getLatestEvent,
    getLatestError,
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
    },
    hide() {
      store.hide();
    },
    toggle() {
      store.toggle();
    },
    setActiveTab(tab: AmisDebuggerTab) {
      store.setActiveTab(tab);
    },
    setPanelPosition(position: { x: number; y: number }) {
      store.setPosition(position);
    }
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
    },
    hide() {
      store.hide();
    },
    toggle() {
      store.toggle();
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
    setActiveTab(tab: AmisDebuggerTab) {
      store.setActiveTab(tab);
    },
    setPanelPosition(position: { x: number; y: number }) {
      store.setPosition(position);
    },
    toggleFilter(filter) {
      store.toggleFilter(filter);
    },
    queryEvents,
    getLatestEvent,
    getLatestError,
    getNodeDiagnostics,
    getInteractionTrace,
    getOverview,
    createDiagnosticReport: createReport,
    exportSession,
    waitForEvent,
    subscribe(listener: () => void) {
      return store.subscribe(listener);
    },
    getSnapshot
  } satisfies AmisDebuggerController;

  if (exposeAutomationApi) {
    registerAutomationApi(debuggerId, automation);
  }

  return controller;
}

export function getAmisDebuggerAutomationApi(controllerId?: string): AmisDebuggerAutomationApi | undefined {
  return getAutomationApi(controllerId);
}

export { installAmisDebuggerWindowFlag };

export function createAmisDiagnosticReport(
  controller: AmisDebuggerController,
  options?: AmisDiagnosticReportOptions
): AmisDiagnosticReport {
  return controller.createDiagnosticReport(options);
}

