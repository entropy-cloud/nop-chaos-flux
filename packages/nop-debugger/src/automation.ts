import type {
  NopComponentInspectResult,
  NopDebugEvent,
  NopDebugEventQuery,
  NopDebuggerAutomationApi,
  NopDebuggerController,
  NopDebuggerHub,
  NopDebuggerPinnedErrors,
  NopDebuggerSessionExport,
  NopDebuggerSessionExportOptions,
  NopDebuggerSnapshot,
  NopDebuggerTab,
  NopDebuggerWindowConfig,
  NopDiagnosticReport,
  NopDiagnosticReportOptions,
  NopInteractionTrace,
  NopInteractionTraceQuery,
  NopNodeDiagnostics,
  NopNodeDiagnosticsOptions,
  NopWaitForEventOptions,
  InstallNopDebuggerWindowFlagOptions
} from './types';

export function createAutomationApi(input: {
  controllerId: string;
  sessionId: string;
  getSnapshot(): NopDebuggerSnapshot;
  getOverview(): ReturnType<NopDebuggerController['getOverview']>;
  queryEvents(query?: NopDebugEventQuery): NopDebugEvent[];
  getLatestEvent(query?: NopDebugEventQuery): NopDebugEvent | undefined;
  getLatestError(): NopDebugEvent | undefined;
  getEarliestErrors(): NopDebugEvent[];
  getLatestErrors(): NopDebugEvent[];
  getPinnedErrors(): NopDebuggerPinnedErrors;
  getNodeDiagnostics(options: NopNodeDiagnosticsOptions): NopNodeDiagnostics;
  getInteractionTrace(query: NopInteractionTraceQuery): NopInteractionTrace;
  createDiagnosticReport(options?: NopDiagnosticReportOptions): NopDiagnosticReport;
  exportSession(options?: NopDebuggerSessionExportOptions): NopDebuggerSessionExport;
  waitForEvent(options?: NopWaitForEventOptions): Promise<NopDebugEvent>;
  clear(): void;
  pause(): void;
  resume(): void;
  show(): void;
  hide(): void;
  toggle(): void;
  minimize(): void;
  unminimize(): void;
  setActiveTab(tab: NopDebuggerTab): void;
  setPanelPosition(position: { x: number; y: number }): void;
  inspectByCid(cid: number): NopComponentInspectResult | undefined;
  inspectByElement(element: HTMLElement): NopComponentInspectResult | undefined;
}): NopDebuggerAutomationApi {
  return {
    controllerId: input.controllerId,
    sessionId: input.sessionId,
    version: '1',
    getSnapshot: input.getSnapshot,
    getOverview: input.getOverview,
    queryEvents: input.queryEvents,
    getLatestEvent: input.getLatestEvent,
    getLatestError: input.getLatestError,
    getEarliestErrors: input.getEarliestErrors,
    getLatestErrors: input.getLatestErrors,
    getPinnedErrors: input.getPinnedErrors,
    getNodeDiagnostics: input.getNodeDiagnostics,
    getInteractionTrace: input.getInteractionTrace,
    createDiagnosticReport: input.createDiagnosticReport,
    exportSession: input.exportSession,
    waitForEvent: input.waitForEvent,
    clear: input.clear,
    pause: input.pause,
    resume: input.resume,
    show: input.show,
    hide: input.hide,
    toggle: input.toggle,
    minimize: input.minimize,
    unminimize: input.unminimize,
    setActiveTab: input.setActiveTab,
    setPanelPosition: input.setPanelPosition,
    inspectByCid: input.inspectByCid,
    inspectByElement: input.inspectByElement
  };
}

export function registerAutomationApi(controllerId: string, automation: NopDebuggerAutomationApi) {
  if (typeof window === 'undefined') {
    return;
  }

  const existingHub = window.__NOP_DEBUGGER_HUB__;
  const hub: NopDebuggerHub = existingHub ?? {
    activeControllerId: controllerId,
    controllers: {},
    listControllers() {
      return Object.keys(this.controllers);
    },
    getController(targetControllerId?: string) {
      const resolvedId = targetControllerId ?? this.activeControllerId;
      return resolvedId ? this.controllers[resolvedId] : undefined;
    }
  };

  hub.controllers[controllerId] = automation;
  hub.activeControllerId = controllerId;

  window.__NOP_DEBUGGER_HUB__ = hub;
  window.__NOP_DEBUGGER_API__ = automation;
}

export function getNopDebuggerAutomationApi(controllerId?: string): NopDebuggerAutomationApi | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  if (!controllerId) {
    return window.__NOP_DEBUGGER_API__;
  }

  return window.__NOP_DEBUGGER_HUB__?.getController(controllerId);
}

export function installNopDebuggerWindowFlag(input: boolean | NopDebuggerWindowConfig | InstallNopDebuggerWindowFlagOptions) {
  if (typeof window !== 'undefined') {
    window.__NOP_DEBUGGER__ = typeof input === 'object' && input !== null && 'config' in input ? input.config : input;
  }
}
