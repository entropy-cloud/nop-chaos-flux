import type {
  ActionContext,
  ActionScope,
  AsyncOwnerDebugSnapshot,
  AsyncOwnerKind,
  ComponentHandleRegistry,
  InstanceFrame,
  RendererEnv,
  RendererPlugin,
  RendererRuntime
} from '@nop-chaos/flux-core';

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
  | 'state:snapshot'
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
  requestInstanceId?: string;
  interactionId?: string;
  parentEventId?: number;
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
  instancePath?: readonly InstanceFrame[];
  nodeId?: string;
  path?: string;
  rendererType?: string;
  actionType?: string;
  requestKey?: string;
  requestInstanceId?: string;
  interactionId?: string;
  parentEventId?: number;
  durationMs?: number;
  network?: NopDebugEventNetworkSummary;
  exportedData?: unknown;
}

export interface NopScopeChainEntry {
  id?: string;
  path?: string;
  label: string;
  data: Record<string, unknown>;
}

export interface NopDebuggerPinnedErrors {
  earliest: NopDebugEvent[];
  latest: NopDebugEvent[];
}

export interface NopDebuggerSnapshot {
  enabled: boolean;
  panelOpen: boolean;
  minimized: boolean;
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
  requestInstanceId?: string;
  interactionId?: string;
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
  requestInstanceIds: string[];
  interactionIds: string[];
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
  instancePath?: readonly InstanceFrame[];
  handleId?: string;
  handleName?: string;
  handleType?: string;
  mounted: boolean;
  nodeId?: string;
  path?: string;
  rendererType?: string;
  formState?: {
    values: Record<string, unknown>;
    errors: Record<string, unknown>;
    touched: Record<string, boolean>;
    dirty: Record<string, boolean>;
    visited: Record<string, boolean>;
    submitting: boolean;
  };
  scopeData?: Record<string, unknown>;
  scopeChain?: NopScopeChainEntry[];
  metaSummary?: Record<string, unknown>;
  propsSummary?: Record<string, unknown>;
  availableMethods?: readonly string[];
  registryEntry?: Record<string, unknown>;
  debugData?: Record<string, unknown>;
  tagName?: string;
  className?: string;
}

export interface NopComponentTreeItem {
  cid: number;
  type: string;
  label: string;
  depth: number;
  mounted: boolean;
  instancePath?: readonly InstanceFrame[];
  nodeId?: string;
  path?: string;
  rendererType?: string;
  tagName?: string;
  className?: string;
}

export interface NopDebuggerFailureSummary {
  event?: NopDebugEvent;
  requestInstanceId?: string;
  interactionId?: string;
  nodeId?: string;
  path?: string;
  actionType?: string;
  requestKey?: string;
  hints: string[];
}

export interface NopNodeAnomalySummary {
  nodeId?: string;
  path?: string;
  recentEvents: NopDebugEvent[];
  hints: string[];
}

export interface NopExpressionEvaluationResult {
  expression: string;
  ok: boolean;
  value?: unknown;
  error?: string;
  usedScopeLabel?: string;
}

export type NopDebuggerExplanationKind = 'value' | 'meta' | 'failure' | 'async';

export type NopDebuggerExplanationConfidence = 'high' | 'medium' | 'low';

export interface NopDebuggerExplanationSubject {
  cid?: number;
  nodeId?: string;
  path?: string;
  field?: string;
  requestInstanceId?: string;
  interactionId?: string;
  ownerId?: string;
  ownerKind?: AsyncOwnerKind;
}

export interface NopDebuggerEvidenceRef {
  kind: 'inspect' | 'scope' | 'form-state' | 'props' | 'meta' | 'event' | 'async-owner';
  summary: string;
  cid?: number;
  nodeId?: string;
  path?: string;
  eventId?: number;
  requestInstanceId?: string;
  interactionId?: string;
  ownerId?: string;
  ownerKind?: AsyncOwnerKind;
}

export interface NopDebuggerExplanationRelated {
  cid?: number;
  nodeId?: string;
  path?: string;
  requestInstanceId?: string;
  interactionId?: string;
  ownerIds?: string[];
}

export interface NopDebuggerExplanationBase<TKind extends NopDebuggerExplanationKind, TData> {
  kind: TKind;
  subject: NopDebuggerExplanationSubject;
  answer: string;
  confidence: NopDebuggerExplanationConfidence;
  limitations: string[];
  evidenceRefs: NopDebuggerEvidenceRef[];
  related: NopDebuggerExplanationRelated;
  truncated: boolean;
  data: TData;
}

export type NopNodeValueSource =
  | 'form-state'
  | 'current-scope'
  | 'ancestor-scope'
  | 'resolved-props'
  | 'resolved-meta'
  | 'unknown';

export interface NopNodeValueExplanationQuery {
  cid: number;
  field?: string;
}

export interface NopNodeValueExplanationData {
  field: string;
  valueSource: NopNodeValueSource;
  value?: unknown;
  scopeLabel?: string;
}

export type NopNodeValueExplanation = NopDebuggerExplanationBase<'value', NopNodeValueExplanationData>;

export type NopNodeMetaExplanationField = 'visible' | 'hidden' | 'disabled' | 'label' | 'title' | 'className';

export interface NopNodeMetaExplanationQuery {
  cid: number;
  field: NopNodeMetaExplanationField;
}

export type NopNodeMetaSource = 'resolved-meta' | 'resolved-props' | 'unknown';

export interface NopNodeMetaExplanationData {
  field: NopNodeMetaExplanationField;
  source: NopNodeMetaSource;
  value?: unknown;
  dependencyPaths: string[];
}

export type NopNodeMetaExplanation = NopDebuggerExplanationBase<'meta', NopNodeMetaExplanationData>;

export interface NopNodeFailureExplanationQuery {
  cid?: number;
  nodeId?: string;
  path?: string;
  inferFromLatest?: boolean;
}

export type NopNodeFailureType = 'request-failed' | 'request-aborted' | 'action-error' | 'unknown';

export interface NopNodeFailureExplanationData {
  failureType: NopNodeFailureType;
  eventId?: number;
  summary?: string;
  hints: string[];
  relatedEventIds: number[];
}

export type NopNodeFailureExplanation = NopDebuggerExplanationBase<'failure', NopNodeFailureExplanationData>;

export interface NopNodeAsyncExplanationQuery {
  cid?: number;
  nodeId?: string;
  path?: string;
}

export interface NopNodeAsyncOwnerSummary {
  ownerKind: AsyncOwnerKind;
  ownerId: string;
  scopeId: string;
  outcome?: string;
  currentRunId?: number;
  cancelled?: boolean;
  timedOut?: boolean;
  supersededBy?: number;
  recentRunIds: number[];
}

export interface NopNodeAsyncExplanationData {
  ownerCount: number;
  owners: NopNodeAsyncOwnerSummary[];
}

export type NopNodeAsyncExplanation = NopDebuggerExplanationBase<'async', NopNodeAsyncExplanationData>;

export type NopDebuggerExplanation =
  | NopNodeValueExplanation
  | NopNodeMetaExplanation
  | NopNodeFailureExplanation
  | NopNodeAsyncExplanation;

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
  getLatestFailedRequest(): NopDebuggerFailureSummary | undefined;
  getLatestFailedAction(): NopDebuggerFailureSummary | undefined;
  getNodeAnomalies(options: NopNodeDiagnosticsOptions): NopNodeAnomalySummary | undefined;
  getRecentFailures(options?: { sinceTimestamp?: number; limit?: number }): NopDebuggerFailureSummary[];
  getAsyncOwnerDebugSnapshot(): AsyncOwnerDebugSnapshot;
  createDiagnosticReport(options?: NopDiagnosticReportOptions): NopDiagnosticReport;
  exportSession(options?: NopDebuggerSessionExportOptions): NopDebuggerSessionExport;
  waitForEvent(options?: NopWaitForEventOptions): Promise<NopDebugEvent>;
  inspectNode(cid: number): NopComponentInspectResult | undefined;
  inspectByCid(cid: number): NopComponentInspectResult | undefined;
  inspectByElement(element: HTMLElement): NopComponentInspectResult | undefined;
  evaluateNodeExpression(args: { cid: number; expression: string }): NopExpressionEvaluationResult;
  explainNodeValue(query: NopNodeValueExplanationQuery): NopNodeValueExplanation;
  explainNodeMeta(query: NopNodeMetaExplanationQuery): NopNodeMetaExplanation;
  explainNodeFailure(query?: NopNodeFailureExplanationQuery): NopNodeFailureExplanation;
  explainNodeAsync(query?: NopNodeAsyncExplanationQuery): NopNodeAsyncExplanation;
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
  minimize(): void;
  unminimize(): void;
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
  getLatestFailedRequest(): NopDebuggerFailureSummary | undefined;
  getLatestFailedAction(): NopDebuggerFailureSummary | undefined;
  getNodeAnomalies(options: NopNodeDiagnosticsOptions): NopNodeAnomalySummary | undefined;
  getRecentFailures(options?: { sinceTimestamp?: number; limit?: number }): NopDebuggerFailureSummary[];
  getAsyncOwnerDebugSnapshot(): AsyncOwnerDebugSnapshot;
  getOverview(): NopDebuggerOverview;
  createDiagnosticReport(options?: NopDiagnosticReportOptions): NopDiagnosticReport;
  exportSession(options?: NopDebuggerSessionExportOptions): NopDebuggerSessionExport;
  waitForEvent(options?: NopWaitForEventOptions): Promise<NopDebugEvent>;
  setRuntime(runtime: RendererRuntime | null): void;
  setComponentRegistry(registry: ComponentHandleRegistry | null): void;
  setActionScope(actionScope: ActionScope | null): void;
  getComponentTree(): NopComponentTreeItem[];
  inspectNode(cid: number): NopComponentInspectResult | undefined;
  inspectByCid(cid: number): NopComponentInspectResult | undefined;
  inspectByElement(element: HTMLElement): NopComponentInspectResult | undefined;
  evaluateNodeExpression(args: { cid: number; expression: string }): NopExpressionEvaluationResult;
  explainNodeValue(query: NopNodeValueExplanationQuery): NopNodeValueExplanation;
  explainNodeMeta(query: NopNodeMetaExplanationQuery): NopNodeMetaExplanation;
  explainNodeFailure(query?: NopNodeFailureExplanationQuery): NopNodeFailureExplanation;
  explainNodeAsync(query?: NopNodeAsyncExplanationQuery): NopNodeAsyncExplanation;
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
