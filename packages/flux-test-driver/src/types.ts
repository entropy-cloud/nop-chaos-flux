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
  getLatestErrors?(): Array<{ id?: number; kind?: string; level?: string; summary?: string; message?: string }>;
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
  /** Post-query element filter (used by getByRole name matching). */
  predicate?: (element: Element) => boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
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
  last(): Locator;
  /** Descendant combinator: `locator('ul').locator('li')` ≙ selector `ul li`. */
  locator(selector: string): Locator;
  boundingBox(options?: LocatorOptions): Promise<BoundingBox>;
  /** Native input/textarea/select value (Playwright `inputValue()` equivalent). */
  inputValue(options?: LocatorOptions): Promise<string>;
  selectOption(values: string | string[], options?: LocatorOptions): Promise<void>;
  check(options?: LocatorOptions): Promise<void>;
  uncheck(options?: LocatorOptions): Promise<void>;
  waitFor(state: 'visible' | 'hidden' | 'attached', options?: LocatorOptions): Promise<void>;
}

export interface WebExpectNotify {
  (result: { passed: boolean; kind: string; actual: unknown; expected: unknown }): void;
}

export interface WebLocatorExpectation {
  toBeVisible(options?: { timeoutMs?: number }): Promise<void>;
  toBeHidden(options?: { timeoutMs?: number }): Promise<void>;
  toContainText(expected: string, options?: { timeoutMs?: number }): Promise<void>;
  toHaveText(expected: string, options?: { timeoutMs?: number }): Promise<void>;
  toHaveAttribute(name: string, expected?: string, options?: { timeoutMs?: number }): Promise<void>;
  toHaveValue(expected: string, options?: { timeoutMs?: number }): Promise<void>;
  toHaveCount(expected: number, options?: { timeoutMs?: number }): Promise<void>;
  toBeEnabled(options?: { timeoutMs?: number }): Promise<void>;
  toBeDisabled(options?: { timeoutMs?: number }): Promise<void>;
  not: Omit<WebLocatorExpectation, 'not'>;
}

export interface WebExpectApi {
  (locator: Locator): WebLocatorExpectation;
}

export interface KeyboardApi {
  press(chord: string): Promise<void>;
  type(text: string): Promise<void>;
  down(key: string): Promise<void>;
  up(key: string): Promise<void>;
  readonly lastSynthetic: boolean;
}

export interface MouseApi {
  move(x: number, y: number): Promise<void>;
  down(): Promise<void>;
  up(): Promise<void>;
  click(x: number, y: number): Promise<void>;
  wheel(deltaX: number, deltaY: number): Promise<void>;
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
  expectWeb(locator: Locator): WebLocatorExpectation;
  locator(selector: string, options?: LocatorOptions): Locator;
  getByTestId(testId: string, options?: LocatorOptions): Locator;
  /** Basic role locator: `[role=...]` (+ implicit heading/button roles) with accessible-name matching. */
  getByRole(role: string, options?: { name?: string | RegExp; level?: number }): Locator;
  keyboard: KeyboardApi;
  mouse: MouseApi;
  setViewportSize(width: number, height: number): Promise<void>;
  /** Kernel-tracked page errors (white-box: stricter than console error capture). */
  errors(): Array<{ kind: string; message: string }>;
  readonly kernel: { attached: boolean; controllerId?: string; sessionId?: string };
}
