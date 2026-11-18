/** Minimal structural view of the automation surface the driver binds to (`window.__NOP_DEBUGGER_API__`). */
export interface DebuggerApiView {
  readonly controllerId: string;
  readonly sessionId: string;
  getSnapshot(): unknown;
  getStability?(): { stable: boolean; degraded?: boolean; counters: Record<string, number> };
  getSnapshotAt?(epoch: number): unknown | null;
  getSnapshotEpochs?(): number[];
  waitFor?(predicate: unknown, options?: { timeoutMs?: number; intervalMs?: number; stableGate?: boolean }): Promise<{ ok: boolean; attempts: number; durationMs: number; lastError?: string }>;
  waitForScopePath?(predicate: { scopeId?: string; path: string; op: 'eq' | 'ne' | 'truthy' | 'defined'; value?: unknown }, options?: { timeoutMs?: number; intervalMs?: number; stableGate?: boolean }): Promise<{ ok: boolean; attempts: number; durationMs: number; lastError?: string }>;
  dispatch?(action: unknown, ctx?: Record<string, unknown>): Promise<unknown>;
  why?(cid: number): Promise<WhyReportView>;
  inspectByCid?(cid: number): InspectResultView | undefined;
  inspectByElement?(element: Element): InspectResultView | undefined;
  queryEvents?(query?: { kind?: string; limit?: number }): DebugEventView[];
  screenshot?(options?: unknown): Promise<unknown>;
}

export interface WhyReportView {
  verdict: string;
  confidence: string;
  parts: Array<{ category: string; verdict: string }>;
  evidence: Array<{ type: string; target: string; label: string }>;
  screenshotTag?: string;
}

export interface InspectResultView {
  cid: number;
  mounted: boolean;
  nodeId?: string;
  path?: string;
  rendererType?: string;
  metaSummary?: Record<string, unknown>;
  propsSummary?: Record<string, unknown>;
  scopeData?: Record<string, unknown>;
}

export interface DebugEventView {
  seq: number;
  kind: string;
  timestamp: number;
  summary: string;
  cid?: number;
  status?: string;
}

export interface AssertCheck {
  passed: boolean;
  kind: string;
  actual: unknown;
  expected: unknown;
  because?: string;
  attempts?: number;
}

export interface WaitForPredicate {
  type: 'stability' | 'scope' | 'cid' | 'event';
  path?: string;
  op?: 'eq' | 'ne' | 'truthy' | 'defined';
  value?: unknown;
  cid?: string;
  kind?: string;
  stableGate?: boolean;
}

export interface WaitForResult {
  ok: boolean;
  attempts: number;
  durationMs: number;
  lastError?: string;
}

export interface LocatorOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

export interface Locator {
  click(options?: LocatorOptions): Promise<void>;
  dblclick(options?: LocatorOptions): Promise<void>;
  fill(text: string, options?: LocatorOptions): Promise<void>;
  type(text: string, options?: LocatorOptions): Promise<void>;
  press(key: string, options?: LocatorOptions): Promise<void>;
  hover(options?: LocatorOptions): Promise<void>;
  text(options?: LocatorOptions): Promise<string>;
  innerHTML(options?: LocatorOptions): Promise<string>;
  attr(name: string, options?: LocatorOptions): Promise<string | null>;
  isVisible(options?: LocatorOptions): Promise<boolean>;
  isEnabled(options?: LocatorOptions): Promise<boolean>;
  count(): Promise<number>;
  nth(index: number): Locator;
  first(): Locator;
  waitFor(state: 'visible' | 'hidden' | 'attached', options?: LocatorOptions): Promise<void>;
}

export interface ExpectApi {
  cid(id: string | number): CidExpectation;
  scope(path: string): ScopeExpectation;
  event(name: string): EventExpectation;
  snapshotPath(path: string): SnapshotPathExpectation;
}

export interface CidExpectation {
  meta(expected: Record<string, unknown>): Promise<AssertCheck>;
  prop(name: string, expected: unknown): Promise<AssertCheck>;
  rendered(): Promise<AssertCheck>;
  not: { rendered(options?: { because?: string }): Promise<AssertCheck> };
}

export interface ScopeExpectation {
  toEqual(expected: unknown, options?: { timeoutMs?: number; intervalMs?: number; stableGate?: boolean }): Promise<AssertCheck>;
}

export interface EventExpectation {
  ended(options?: { status?: string }): Promise<AssertCheck>;
}

export interface SnapshotPathExpectation {
  writtenAtStep(step: number): Promise<AssertCheck>;
}

export interface FtGlobal {
  goto(url: string): Promise<void>;
  reload(): Promise<void>;
  byCid(id: string | number): InspectResultView | undefined;
  dispatch(cid: string, action: unknown): Promise<unknown>;
  waitFor(predicate: WaitForPredicate, options?: { timeoutMs?: number; intervalMs?: number; stableGate?: boolean }): Promise<WaitForResult>;
  scope<T = unknown>(path: string): T;
  snapshotAt(epoch: number): unknown;
  evaluate<T = unknown>(expression: string): Promise<T>;
  screenshot(options?: unknown): Promise<unknown>;
  expect: ExpectApi;
  locator(selector: string, options?: LocatorOptions): Locator;
  getByTestId(testId: string, options?: LocatorOptions): Locator;
  readonly kernel: { attached: boolean; controllerId?: string; sessionId?: string };
}
