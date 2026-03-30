import type { ActionContext, RendererEnv, RendererPlugin } from '@nop-chaos/flux-core';

export type NopDebuggerTab = 'overview' | 'timeline' | 'network' | 'node';

export type NopDebugEventKind =
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

export type NopDebugEventLevel = 'info' | 'success' | 'warning' | 'error';

export type NopDebuggerFilterKind = 'render' | 'action' | 'api' | 'compile' | 'notify' | 'error' | 'node';

export type DebuggerWindowDock = 'floating';

export interface NopDebuggerWindowConfig {
  enabled?: boolean;
  defaultOpen?: boolean;
  defaultTab?: NopDebuggerTab;
  position?: { x: number; y: number };
  dock?: DebuggerWindowDock;
}

export interface NopDebugEventQuery {
  kind?: NopDebugEventKind | NopDebugEventKind[];
  group?: NopDebuggerFilterKind | NopDebuggerFilterKind[];
  level?: NopDebugEventLevel | NopDebugEventLevel[];
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

export interface NopDebugEventNetworkSummary {
  method: string;
  url: string;
  status?: number;
  ok?: boolean;
  aborted?: boolean;
  requestDataKeys?: string[];
  responseDataKeys?: string[];
  responseType?: string;
}

export interface NopDebugEvent {
  id: number;
  sessionId: string;
  timestamp: number;
  kind: NopDebugEventKind;
  group: NopDebuggerFilterKind;
  level: NopDebugEventLevel;
  source: string;
  summary: string;
  detail?: string;
  nodeId?: string;
  path?: string;
  rendererType?: string;
  actionType?: string;
  requestKey?: string;
  durationMs?: number;
  network?: NopDebugEventNetworkSummary;
  exportedData?: unknown;
}

export interface NopDebuggerPinnedErrors {
  earliest: NopDebugEvent[];
  latest: NopDebugEvent[];
}

export interface NopDebuggerSnapshot {
  enabled: boolean;
  panelOpen: boolean;
  paused: boolean;
  activeTab: NopDebuggerTab;
  position: { x: number; y: number };
  events: NopDebugEvent[];
  filters: NopDebuggerFilterKind[];
  pinnedErrors: NopDebuggerPinnedErrors;
}

export interface NopDebuggerOverview {
  latestCompile?: NopDebugEvent;
  latestAction?: NopDebugEvent;
  latestApi?: NopDebugEvent;
  latestError?: NopDebugEvent;
  errorCount: number;
  totalEvents: number;
  countsByGroup: Record<NopDebuggerFilterKind, number>;
  slowestRenderMs?: number;
}

export interface NopNodeDiagnosticsOptions {
  nodeId?: string;
  path?: string;
  limit?: number;
}

export interface NopNodeDiagnostics {
  nodeId?: string;
  path?: string;
  rendererTypes: string[];
  totalEvents: number;
  countsByGroup: Partial<Record<NopDebuggerFilterKind, number>>;
  countsByKind: Partial<Record<NopDebugEventKind, number>>;
  latestRender?: NopDebugEvent;
  latestAction?: NopDebugEvent;
  latestApi?: NopDebugEvent;
  latestError?: NopDebugEvent;
  recentEvents: NopDebugEvent[];
}

export type NopInteractionTraceMode = 'exact' | 'related';

export interface NopInteractionTraceQuery {
  eventId?: number;
  requestKey?: string;
  actionType?: string;
  nodeId?: string;
  path?: string;
  sinceTimestamp?: number;
  untilTimestamp?: number;
  limit?: number;
  mode?: NopInteractionTraceMode;
  inferFromLatest?: boolean;
}

export interface NopInteractionTrace {
  query: NopInteractionTraceQuery;
  resolvedQuery: NopInteractionTraceQuery;
  anchorEvent?: NopDebugEvent;
  totalEvents: number;
  matchedEvents: NopDebugEvent[];
  relatedErrors: NopDebugEvent[];
  latestAction?: NopDebugEvent;
  latestApi?: NopDebugEvent;
  latestError?: NopDebugEvent;
  requestKeys: string[];
  actionTypes: string[];
  nodeIds: string[];
  paths: string[];
}

export interface NopDebuggerSessionExportOptions {
  query?: NopDebugEventQuery;
  eventLimit?: number;
}

export interface NopDebuggerRedactionMatchContext {
  key: string;
  path: string[];
  value: unknown;
}

export interface NopDebuggerRedactionOptions {
  enabled?: boolean;
  redactKeys?: string[];
  mask?: string;
  maxDepth?: number;
  redactValue?(context: NopDebuggerRedactionMatchContext): unknown;
  allowValue?(context: NopDebuggerRedactionMatchContext): boolean;
}

export interface NopDebuggerSessionExport {
  controllerId: string;
  sessionId: string;
  generatedAt: number;
  snapshot: NopDebuggerSnapshot;
  overview: NopDebuggerOverview;
  latestError?: NopDebugEvent;
  latestAction?: NopDebugEvent;
  latestApi?: NopDebugEvent;
  events: NopDebugEvent[];
  pinnedErrors: NopDebuggerPinnedErrors;
}

export interface NopDiagnosticReport {
  controllerId: string;
  sessionId: string;
  generatedAt: number;
  snapshot: Pick<NopDebuggerSnapshot, 'enabled' | 'panelOpen' | 'paused' | 'activeTab' | 'filters'>;
  overview: NopDebuggerOverview;
  latestError?: NopDebugEvent;
  latestAction?: NopDebugEvent;
  latestApi?: NopDebugEvent;
  latestInteractionTrace?: NopInteractionTrace;
  recentEvents: NopDebugEvent[];
  pinnedErrors: NopDebuggerPinnedErrors;
}

export interface NopDiagnosticReportOptions {
  query?: NopDebugEventQuery;
  eventLimit?: number;
  includeLatestInteractionTrace?: boolean;
  latestInteractionTraceQuery?: NopInteractionTraceQuery;
}

export interface NopWaitForEventOptions extends NopDebugEventQuery {
  timeoutMs?: number;
}

export interface NopComponentInspectResult {
  cid: number;
  handleId?: string;
  handleName?: string;
  handleType?: string;
  mounted: boolean;
  formState?: {
    values: Record<string, unknown>;
    errors: Record<string, unknown>;
    touched: Record<string, boolean>;
    dirty: Record<string, boolean>;
    visited: Record<string, boolean>;
    submitting: boolean;
  };
  scopeData?: Record<string, unknown>;
}

export interface NopDebuggerAutomationApi {
  readonly controllerId: string;
  readonly sessionId: string;
  readonly version: '1';
  getSnapshot(): NopDebuggerSnapshot;
  getOverview(): NopDebuggerOverview;
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
  inspectByCid(cid: number): NopComponentInspectResult | undefined;
  inspectByElement(element: HTMLElement): NopComponentInspectResult | undefined;
  clear(): void;
  pause(): void;
  resume(): void;
  show(): void;
  hide(): void;
  toggle(): void;
  setActiveTab(tab: NopDebuggerTab): void;
  setPanelPosition(position: { x: number; y: number }): void;
}

export interface NopDebuggerHub {
  activeControllerId?: string;
  controllers: Record<string, NopDebuggerAutomationApi>;
  listControllers(): string[];
  getController(controllerId?: string): NopDebuggerAutomationApi | undefined;
}

export interface InstallNopDebuggerWindowFlagOptions {
  config: boolean | NopDebuggerWindowConfig;
}

export interface NopErrorBufferOptions {
  keepEarliest?: number;
  keepLatest?: number;
}

export interface NopDebuggerOptions {
  id?: string;
  enabled?: boolean;
  maxEvents?: number;
  exposeAutomationApi?: boolean;
  redaction?: NopDebuggerRedactionOptions;
  errorBuffer?: NopErrorBufferOptions;
}

export interface NopDebuggerController {
  readonly id: string;
  readonly enabled: boolean;
  readonly plugin: RendererPlugin;
  readonly sessionId: string;
  readonly automation: NopDebuggerAutomationApi;
  decorateEnv(env: RendererEnv): RendererEnv;
  onActionError(error: unknown, ctx: ActionContext): void;
  show(): void;
  hide(): void;
  toggle(): void;
  clear(): void;
  pause(): void;
  resume(): void;
  setActiveTab(tab: NopDebuggerTab): void;
  setPanelPosition(position: { x: number; y: number }): void;
  toggleFilter(filter: NopDebuggerFilterKind): void;
  queryEvents(query?: NopDebugEventQuery): NopDebugEvent[];
  getLatestEvent(query?: NopDebugEventQuery): NopDebugEvent | undefined;
  getLatestError(): NopDebugEvent | undefined;
  getEarliestErrors(): NopDebugEvent[];
  getLatestErrors(): NopDebugEvent[];
  getPinnedErrors(): NopDebuggerPinnedErrors;
  getNodeDiagnostics(options: NopNodeDiagnosticsOptions): NopNodeDiagnostics;
  getInteractionTrace(query: NopInteractionTraceQuery): NopInteractionTrace;
  getOverview(): NopDebuggerOverview;
  createDiagnosticReport(options?: NopDiagnosticReportOptions): NopDiagnosticReport;
  exportSession(options?: NopDebuggerSessionExportOptions): NopDebuggerSessionExport;
  waitForEvent(options?: NopWaitForEventOptions): Promise<NopDebugEvent>;
  setComponentRegistry(registry: import('@nop-chaos/flux-core').ComponentHandleRegistry | null): void;
  inspectByCid(cid: number): NopComponentInspectResult | undefined;
  inspectByElement(element: HTMLElement): NopComponentInspectResult | undefined;
  subscribe(listener: () => void): () => void;
  getSnapshot(): NopDebuggerSnapshot;
}

declare global {
  interface Window {
    __NOP_DEBUGGER__?: boolean | NopDebuggerWindowConfig;
    __NOP_DEBUGGER_API__?: NopDebuggerAutomationApi;
    __NOP_DEBUGGER_HUB__?: NopDebuggerHub;
  }
}

