import type {
  AmisDebugEvent,
  AmisDebugEventQuery,
  AmisDebuggerAutomationApi,
  AmisDebuggerController,
  AmisDebuggerHub,
  AmisDebuggerSessionExport,
  AmisDebuggerSessionExportOptions,
  AmisDebuggerSnapshot,
  AmisDebuggerTab,
  AmisDebuggerWindowConfig,
  AmisDiagnosticReport,
  AmisDiagnosticReportOptions,
  AmisInteractionTrace,
  AmisInteractionTraceQuery,
  AmisNodeDiagnostics,
  AmisNodeDiagnosticsOptions,
  AmisWaitForEventOptions,
  InstallAmisDebuggerWindowFlagOptions
} from './types';

export function createAutomationApi(input: {
  controllerId: string;
  sessionId: string;
  getSnapshot(): AmisDebuggerSnapshot;
  getOverview(): ReturnType<AmisDebuggerController['getOverview']>;
  queryEvents(query?: AmisDebugEventQuery): AmisDebugEvent[];
  getLatestEvent(query?: AmisDebugEventQuery): AmisDebugEvent | undefined;
  getLatestError(): AmisDebugEvent | undefined;
  getNodeDiagnostics(options: AmisNodeDiagnosticsOptions): AmisNodeDiagnostics;
  getInteractionTrace(query: AmisInteractionTraceQuery): AmisInteractionTrace;
  createDiagnosticReport(options?: AmisDiagnosticReportOptions): AmisDiagnosticReport;
  exportSession(options?: AmisDebuggerSessionExportOptions): AmisDebuggerSessionExport;
  waitForEvent(options?: AmisWaitForEventOptions): Promise<AmisDebugEvent>;
  clear(): void;
  pause(): void;
  resume(): void;
  show(): void;
  hide(): void;
  toggle(): void;
  setActiveTab(tab: AmisDebuggerTab): void;
  setPanelPosition(position: { x: number; y: number }): void;
}): AmisDebuggerAutomationApi {
  return {
    controllerId: input.controllerId,
    sessionId: input.sessionId,
    version: '1',
    getSnapshot: input.getSnapshot,
    getOverview: input.getOverview,
    queryEvents: input.queryEvents,
    getLatestEvent: input.getLatestEvent,
    getLatestError: input.getLatestError,
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
    setActiveTab: input.setActiveTab,
    setPanelPosition: input.setPanelPosition
  };
}

export function registerAutomationApi(controllerId: string, automation: AmisDebuggerAutomationApi) {
  if (typeof window === 'undefined') {
    return;
  }

  const existingHub = window.__NOP_AMIS_DEBUGGER_HUB__;
  const hub: AmisDebuggerHub = existingHub ?? {
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

  window.__NOP_AMIS_DEBUGGER_HUB__ = hub;
  window.__NOP_AMIS_DEBUGGER_API__ = automation;
}

export function getAmisDebuggerAutomationApi(controllerId?: string): AmisDebuggerAutomationApi | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  if (!controllerId) {
    return window.__NOP_AMIS_DEBUGGER_API__;
  }

  return window.__NOP_AMIS_DEBUGGER_HUB__?.getController(controllerId);
}

export function installAmisDebuggerWindowFlag(input: boolean | AmisDebuggerWindowConfig | InstallAmisDebuggerWindowFlagOptions) {
  if (typeof window !== 'undefined') {
    window.__NOP_AMIS_DEBUGGER__ = typeof input === 'object' && input !== null && 'config' in input ? input.config : input;
  }
}
