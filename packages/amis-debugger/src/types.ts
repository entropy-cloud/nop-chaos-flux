import type { ActionContext, RendererEnv, RendererPlugin } from '@nop-chaos/amis-schema';

export type AmisDebuggerTab = 'overview' | 'timeline' | 'network';

export type AmisDebugEventKind =
  | 'compile:start'
  | 'compile:end'
  | 'render:start'
  | 'render:end'
  | 'action:start'
  | 'action:end'
  | 'api:start'
  | 'api:end'
  | 'api:abort'
  | 'notify'
  | 'error';

export type AmisDebugEventLevel = 'info' | 'success' | 'warning' | 'error';

export type AmisDebuggerFilterKind = 'render' | 'action' | 'api' | 'compile' | 'notify' | 'error';

export type DebuggerWindowDock = 'floating';

export interface AmisDebuggerWindowConfig {
  enabled?: boolean;
  defaultOpen?: boolean;
  defaultTab?: AmisDebuggerTab;
  position?: { x: number; y: number };
  dock?: DebuggerWindowDock;
}

export interface AmisDebugEventQuery {
  kind?: AmisDebugEventKind | AmisDebugEventKind[];
  group?: AmisDebuggerFilterKind | AmisDebuggerFilterKind[];
  level?: AmisDebugEventLevel | AmisDebugEventLevel[];
  source?: string | string[];
  nodeId?: string;
  path?: string;
  rendererType?: string;
  actionType?: string;
  requestKey?: string;
  text?: string;
  sinceTimestamp?: number;
  untilTimestamp?: number;
  limit?: number;
}

export interface AmisDebugEventNetworkSummary {
  method: string;
  url: string;
  status?: number;
  ok?: boolean;
  aborted?: boolean;
  requestDataKeys?: string[];
  responseDataKeys?: string[];
  responseType?: string;
}

export interface AmisDebugEvent {
  id: number;
  sessionId: string;
  timestamp: number;
  kind: AmisDebugEventKind;
  group: AmisDebuggerFilterKind;
  level: AmisDebugEventLevel;
  source: string;
  summary: string;
  detail?: string;
  nodeId?: string;
  path?: string;
  rendererType?: string;
  actionType?: string;
  requestKey?: string;
  durationMs?: number;
  network?: AmisDebugEventNetworkSummary;
  exportedData?: unknown;
}

export interface AmisDebuggerSnapshot {
  enabled: boolean;
  panelOpen: boolean;
  paused: boolean;
  activeTab: AmisDebuggerTab;
  position: { x: number; y: number };
  events: AmisDebugEvent[];
  filters: AmisDebuggerFilterKind[];
}

export interface AmisDebuggerOverview {
  latestCompile?: AmisDebugEvent;
  latestAction?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  latestError?: AmisDebugEvent;
  errorCount: number;
  totalEvents: number;
  countsByGroup: Record<AmisDebuggerFilterKind, number>;
}

export interface AmisNodeDiagnosticsOptions {
  nodeId?: string;
  path?: string;
  limit?: number;
}

export interface AmisNodeDiagnostics {
  nodeId?: string;
  path?: string;
  rendererTypes: string[];
  totalEvents: number;
  countsByGroup: Partial<Record<AmisDebuggerFilterKind, number>>;
  countsByKind: Partial<Record<AmisDebugEventKind, number>>;
  latestRender?: AmisDebugEvent;
  latestAction?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  latestError?: AmisDebugEvent;
  recentEvents: AmisDebugEvent[];
}

export type AmisInteractionTraceMode = 'exact' | 'related';

export interface AmisInteractionTraceQuery {
  eventId?: number;
  requestKey?: string;
  actionType?: string;
  nodeId?: string;
  path?: string;
  sinceTimestamp?: number;
  untilTimestamp?: number;
  limit?: number;
  mode?: AmisInteractionTraceMode;
  inferFromLatest?: boolean;
}

export interface AmisInteractionTrace {
  query: AmisInteractionTraceQuery;
  resolvedQuery: AmisInteractionTraceQuery;
  anchorEvent?: AmisDebugEvent;
  totalEvents: number;
  matchedEvents: AmisDebugEvent[];
  relatedErrors: AmisDebugEvent[];
  latestAction?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  latestError?: AmisDebugEvent;
  requestKeys: string[];
  actionTypes: string[];
  nodeIds: string[];
  paths: string[];
}

export interface AmisDebuggerSessionExportOptions {
  query?: AmisDebugEventQuery;
  eventLimit?: number;
}

export interface AmisDebuggerRedactionMatchContext {
  key: string;
  path: string[];
  value: unknown;
}

export interface AmisDebuggerRedactionOptions {
  enabled?: boolean;
  redactKeys?: string[];
  mask?: string;
  maxDepth?: number;
  redactValue?(context: AmisDebuggerRedactionMatchContext): unknown;
  allowValue?(context: AmisDebuggerRedactionMatchContext): boolean;
}

export interface AmisDebuggerSessionExport {
  controllerId: string;
  sessionId: string;
  generatedAt: number;
  snapshot: AmisDebuggerSnapshot;
  overview: AmisDebuggerOverview;
  latestError?: AmisDebugEvent;
  latestAction?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  events: AmisDebugEvent[];
}

export interface AmisDiagnosticReport {
  controllerId: string;
  sessionId: string;
  generatedAt: number;
  snapshot: Pick<AmisDebuggerSnapshot, 'enabled' | 'panelOpen' | 'paused' | 'activeTab' | 'filters'>;
  overview: AmisDebuggerOverview;
  latestError?: AmisDebugEvent;
  latestAction?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  latestInteractionTrace?: AmisInteractionTrace;
  recentEvents: AmisDebugEvent[];
}

export interface AmisDiagnosticReportOptions {
  query?: AmisDebugEventQuery;
  eventLimit?: number;
  includeLatestInteractionTrace?: boolean;
  latestInteractionTraceQuery?: AmisInteractionTraceQuery;
}

export interface AmisWaitForEventOptions extends AmisDebugEventQuery {
  timeoutMs?: number;
}

export interface AmisDebuggerAutomationApi {
  readonly controllerId: string;
  readonly sessionId: string;
  readonly version: '1';
  getSnapshot(): AmisDebuggerSnapshot;
  getOverview(): AmisDebuggerOverview;
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
}

export interface AmisDebuggerHub {
  activeControllerId?: string;
  controllers: Record<string, AmisDebuggerAutomationApi>;
  listControllers(): string[];
  getController(controllerId?: string): AmisDebuggerAutomationApi | undefined;
}

export interface InstallAmisDebuggerWindowFlagOptions {
  config: boolean | AmisDebuggerWindowConfig;
}

export interface AmisDebuggerOptions {
  id?: string;
  enabled?: boolean;
  maxEvents?: number;
  exposeAutomationApi?: boolean;
  redaction?: AmisDebuggerRedactionOptions;
}

export interface AmisDebuggerController {
  readonly id: string;
  readonly enabled: boolean;
  readonly plugin: RendererPlugin;
  readonly sessionId: string;
  readonly automation: AmisDebuggerAutomationApi;
  decorateEnv(env: RendererEnv): RendererEnv;
  onActionError(error: unknown, ctx: ActionContext): void;
  show(): void;
  hide(): void;
  toggle(): void;
  clear(): void;
  pause(): void;
  resume(): void;
  setActiveTab(tab: AmisDebuggerTab): void;
  setPanelPosition(position: { x: number; y: number }): void;
  toggleFilter(filter: AmisDebuggerFilterKind): void;
  queryEvents(query?: AmisDebugEventQuery): AmisDebugEvent[];
  getLatestEvent(query?: AmisDebugEventQuery): AmisDebugEvent | undefined;
  getLatestError(): AmisDebugEvent | undefined;
  getNodeDiagnostics(options: AmisNodeDiagnosticsOptions): AmisNodeDiagnostics;
  getInteractionTrace(query: AmisInteractionTraceQuery): AmisInteractionTrace;
  getOverview(): AmisDebuggerOverview;
  createDiagnosticReport(options?: AmisDiagnosticReportOptions): AmisDiagnosticReport;
  exportSession(options?: AmisDebuggerSessionExportOptions): AmisDebuggerSessionExport;
  waitForEvent(options?: AmisWaitForEventOptions): Promise<AmisDebugEvent>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): AmisDebuggerSnapshot;
}

declare global {
  interface Window {
    __NOP_AMIS_DEBUGGER__?: boolean | AmisDebuggerWindowConfig;
    __NOP_AMIS_DEBUGGER_API__?: AmisDebuggerAutomationApi;
    __NOP_AMIS_DEBUGGER_HUB__?: AmisDebuggerHub;
  }
}
