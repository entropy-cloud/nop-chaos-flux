export type RpcRequestId = string;

export interface RpcRequest {
  id: RpcRequestId;
  method: string;
  params?: unknown;
}

export interface RpcError {
  code: string;
  message: string;
}

export interface RpcResponse {
  id: RpcRequestId;
  result?: unknown;
  error?: RpcError;
}

export interface RpcEvent {
  event: string;
  payload: unknown;
}

export type RpcMessage = RpcRequest | RpcResponse | RpcEvent;

export type DevLogKind =
  | 'action'
  | 'api'
  | 'render'
  | 'eval'
  | 'state'
  | 'assertion'
  | 'capture'
  | 'error'
  | 'intercept'
  | 'lifecycle';

export type DevLogStatus = 'pending' | 'passed' | 'failed' | 'skipped';

export interface DevLogRefs {
  interactionId?: string;
  cid?: string;
  nodeId?: string;
  epoch?: number;
  snapshotId?: string;
  screenshotId?: string;
  spanId?: string;
}

export interface DevLogEntry {
  id: string;
  parentId?: string;
  kind: DevLogKind;
  label: string;
  status: DevLogStatus;
  startedAt: number;
  endedAt?: number;
  refs?: DevLogRefs;
  display?: Record<string, unknown>;
}

export interface FetcherMatcher {
  url?: string;
  method?: string;
  service?: string;
}

export interface SessionAttachParams {
  sessionId?: string;
  appVersion?: string;
  schemaFingerprint?: string;
  capabilities?: string[];
  userAgent?: string;
  locale?: string;
}

export interface SessionAttachResult {
  sessionId: string;
  capabilities?: string[];
  heartbeatIntervalMs?: number;
}

export interface SessionDetachParams {
  sessionId: string;
  reason?: string;
}

export interface SessionHeartbeatParams {
  sessionId: string;
  ts: number;
}

export interface SessionHeartbeatResult {
  ok: true;
  ts: number;
}

export interface LogEmitParams {
  log: DevLogEntry;
}

export interface OkResult {
  ok: true;
}

export interface InterceptRegisterParams {
  eventId: string;
  matcher: FetcherMatcher;
}

export interface InterceptResolveParams {
  eventId: string;
  action: 'continue' | 'modify' | 'shortCircuit';
  patch?: Array<{ op: string; path: string; value?: unknown }>;
  response?: unknown;
}

export type CaptureKind = 'screenshot' | 'video' | 'session';

export interface CaptureRefs {
  epoch?: number;
  cid?: string;
  interactionId?: string;
  tag?: string;
}

export interface CaptureUploadParams {
  id: string;
  kind: CaptureKind;
  encoding: 'base64';
  bytes: string;
  mime: string;
  refs?: CaptureRefs;
  redactionProof?: { maskApplied: boolean; ruleSetVersion?: string };
}

export interface CaptureUploadResult {
  mediaId: string;
  url: string;
}

export interface BaselineGetParams {
  key: string;
}

export interface BaselineGetResult {
  baseline: VisualBaseline | null;
}

export interface BaselinePutParams {
  baseline: VisualBaseline;
}

export interface VisualBaselineRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisualBaselineIgnoreRegion {
  cid?: string;
  rect?: VisualBaselineRect;
  reason: string;
}

export interface VisualBaseline {
  key: string;
  imageRef: string;
  createdAt: number;
  schemaFingerprint?: string;
  viewport?: { width: number; height: number };
  ignoreRegions?: VisualBaselineIgnoreRegion[];
}

export type InterceptPhase = 'before:handler' | 'after:handler';

export interface InterceptFramePayload {
  eventId: string;
  phase: InterceptPhase;
  service: string;
  requestId: string;
  interactionId?: string;
  args?: unknown;
  result?: unknown;
  durationMs?: number;
  timeoutMs: number;
}

export interface InterceptFrameEvent {
  event: 'intercept.frame';
  payload: InterceptFramePayload;
}

export interface InterceptDegradedEvent {
  event: 'intercept.degraded';
  payload: { eventId: string; reason: 'timeout' | 'gateway-error'; detail?: string };
}

export type CaptureBackend = 'cdp' | 'foreign-object' | 'raster-fallback';

export interface ScreenshotResultWire {
  id: string;
  backend: CaptureBackend;
  width: number;
  height: number;
  encoding: 'base64';
  bytes: string;
  mime: 'image/png' | 'image/webp' | 'image/jpeg';
  hash: string;
  createdAt: number;
  refs?: CaptureRefs;
  degraded?: { reasons: string[] };
}

export interface ClockEvent {
  at: number;
  kind: 'setTimeout' | 'setInterval' | 'clearTimeout' | 'clearInterval' | 'date-now' | 'tick';
  timerId?: string;
  delayMs?: number;
}

export interface SessionInputEvent {
  seq: number;
  at: number;
  type: string;
  cid?: string;
  nodeId?: string;
  payload?: unknown;
}

export interface EnvStreamFrame {
  at: number;
  data?: unknown;
  close?: boolean;
}

export interface SessionEnvFrame {
  requestId: string;
  channel: 'fetcher' | 'stream' | 'socket';
  at?: number;
  request?: unknown;
  response?: unknown;
  frames?: EnvStreamFrame[];
  status?: number;
  error?: { code: string; message: string };
}

export interface SessionCheckpoint {
  step: number;
  epoch?: number;
  revisions: Record<string, number>;
  pathHashes: Record<string, string>;
}

export interface DevSession {
  version: 1;
  meta: {
    appVersion?: string;
    schemaFingerprint?: string;
    startedAt: number;
    endedAt?: number;
    userAgent?: string;
    locale?: string;
  };
  clock: { origin: number; events: ClockEvent[] };
  inputs: SessionInputEvent[];
  envFrames: SessionEnvFrame[];
  checkpoints: SessionCheckpoint[];
  logs: DevLogEntry[];
}
