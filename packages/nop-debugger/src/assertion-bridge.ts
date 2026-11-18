import type { NopDebugEvent, NopDebugEventKind } from './types.js';
import type { NopDebuggerStore } from './store.js';
import type { ScreenshotResultWire } from './protocol/types.js';
import { captureScreenshotFromClone, createIncrementalCapturer, decodeImageBytesToRgba, CaptureError } from './capture/screenshot.js';
import { createVisualDiffEngine, type IgnoreRegionInput } from './capture/visual-diff.js';
import { waitFor as runWaitFor, waitForVisual } from './wait-for.js';

interface RuntimeLike {
  getStabilityTracker?(): { whenStable(timeoutMs?: number): Promise<{ stable: boolean }> } | undefined;
  dispatch?(action: unknown, ctx?: unknown): Promise<unknown>;
  getActionRootScope?(): unknown;
}

interface AssertionBridgeDeps {
  onDispatched?(action: unknown, ctx?: unknown): void;
  getRuntime(): RuntimeLike | undefined;
  store: NopDebuggerStore;
  inspectByCid(cid: number): unknown;
  getLatestSnapshotScopes(): Record<string, Record<string, any>> | null;
  incrementalCapturer: ReturnType<typeof createIncrementalCapturer>;
  /** M5: feed each capture's base64 bytes into the active video recorder. */
  onFrame?(bytesBase64: string): void;
  isVideoRecording?(): boolean;
}

interface WaitDepsInput {
  whenStable(timeoutMs?: number): Promise<{ stable: boolean }>;
  inspectByCid(cid: number): unknown;
  getScopeData(scopeId?: string): Record<string, unknown> | null;
  getLatestEvent(kind: NopDebugEventKind): import('./types.js').NopDebugEvent | undefined;
  compareVisual(baselineKey: string): Promise<{ match: boolean; diffRatio: number } | { missing: true }>;
  log: NopDebuggerStore;
}

interface WaitForOptionsLike {
  timeoutMs?: number;
  intervalMs?: number;
  stableGate?: boolean;
}

interface WaitResultLike {
  ok: boolean;
  attempts: number;
  durationMs: number;
  lastError?: string;
}

interface CaptureRunOptions {
  cid?: string;
  selector?: string;
  format?: 'png' | 'webp';
  scale?: number;
  tag?: string;
  fresh?: boolean;
}

export function createAssertionBridge(deps: AssertionBridgeDeps) {
  const visualDiffEngine = createVisualDiffEngine();
  let lastCaptureResult: ScreenshotResultWire | null = null;

  const waitDeps = (): WaitDepsInput => ({
    whenStable: (timeoutMs?: number) =>
      Promise.resolve(deps.getRuntime()?.getStabilityTracker?.()?.whenStable(timeoutMs) ?? Promise.resolve({ stable: true })),
    inspectByCid: (cid: number) => deps.inspectByCid(cid),
    getScopeData: (scopeId?: string) => {
      const latest = deps.getLatestSnapshotScopes();
      if (!latest) return null;
      return latest[scopeId ?? Object.keys(latest)[0]!] ?? null;
    },
    getLatestEvent: (kind: NopDebugEventKind) => deps.store.getSnapshot().events.find((event: NopDebugEvent) => event.kind === kind),
    compareVisual: (baselineKey: string) => compareBaseline(baselineKey),
    log: deps.store,
  });

  const compareBaseline = async (baselineKey: string): Promise<{ match: boolean; diffRatio: number } | { missing: true }> => {
    const current = lastCaptureResult;
    if (!current || typeof document === 'undefined') return { missing: true };
    if (!visualDiffEngine.getBaseline(baselineKey)) return { missing: true };
    const pixels = await decodeImageBytesToRgba(current.bytes, current.width, current.height);
    const result = visualDiffEngine.compare({ bytes: pixels, width: current.width, height: current.height }, baselineKey);
    if ('missing' in result) return { missing: true };
    return { match: result.match, diffRatio: result.diffRatio };
  };

  const maskRules = [{ matches: (element: Element) => element.getAttribute('type') === 'password' }];

  const captureScreenshot = async (options?: CaptureRunOptions): Promise<ScreenshotResultWire & { reused?: boolean }> => {
    if (typeof document === 'undefined') {
      throw new CaptureError('capture-unavailable', 'document unavailable');
    }
    const target =
      (options?.cid && document.querySelector(`[data-cid="${options.cid}"]`)) ||
      (options?.selector && document.querySelector(options.selector)) ||
      document.body;
    const rect = target.getBoundingClientRect();
    const input = {
      root: target,
      width: rect.width,
      height: rect.height,
      format: options?.format,
      scale: options?.scale,
      redactionRules: maskRules,
      refs: { tag: options?.tag, cid: options?.cid },
    };
    if (options?.fresh) {
      const freshResult = await captureScreenshotFromClone(input);
      lastCaptureResult = freshResult;
      if (deps.isVideoRecording?.()) deps.onFrame?.(freshResult.bytes);
      return { ...freshResult, reused: false };
    }
    const result = await deps.incrementalCapturer.capture(input);
    lastCaptureResult = result.result;
    if (deps.isVideoRecording?.()) deps.onFrame?.(result.result.bytes);
    return { ...result.result, reused: result.reused };
  };

  return {
    captureScreenshot,
    recordCapture(result: ScreenshotResultWire): void {
      lastCaptureResult = result;
    },
    async screenshotFresh(input: {
      root: Element;
      width: number;
      height: number;
      format?: 'png' | 'webp';
      scale?: number;
      tag?: string;
      cid?: string;
    }): Promise<ScreenshotResultWire> {
      return captureScreenshotFromClone({
        root: input.root,
        width: input.width,
        height: input.height,
        format: input.format,
        scale: input.scale,
        redactionRules: maskRules,
        refs: { tag: input.tag, cid: input.cid },
      });
    },
    async waitFor(predicate: unknown, options?: WaitForOptionsLike): Promise<WaitResultLike> {
      if ((predicate as { type?: string })?.type === 'visual') {
        return waitForVisual(predicate as never, waitDeps() as never, options);
      }
      return runWaitFor(predicate as never, waitDeps() as never, options);
    },
    async waitForScopePath(predicate: { scopeId?: string; path: string; op: 'eq' | 'ne' | 'truthy' | 'defined'; value?: unknown }, options?: WaitForOptionsLike): Promise<WaitResultLike> {
      return runWaitFor({ type: 'scope-path', ...predicate }, waitDeps() as never, options as never);
    },
    async dispatch(action: unknown, ctx?: unknown) {
      const runtime = deps.getRuntime();
      if (!runtime?.dispatch) {
        throw new CaptureError('dispatch-unavailable', 'runtime not wired');
      }
      const effectiveCtx = {
        signal: typeof AbortController !== 'undefined' ? new AbortController().signal : undefined,
        scope: runtime.getActionRootScope?.(),
        ...(ctx ?? {}),
      };
      deps.onDispatched?.(action, effectiveCtx);
      return runtime.dispatch(action, effectiveCtx);
    },
    async compareScreenshot(baselineKey: string, options?: { maxDiffRatio?: number }): Promise<{ match: boolean; diffRatio: number; missing?: boolean }> {
      const comparison = await compareBaseline(baselineKey);
      if ('missing' in comparison) return { missing: true, match: false, diffRatio: 0 };
      return { match: comparison.diffRatio <= (options?.maxDiffRatio ?? 0), diffRatio: comparison.diffRatio };
    },
    async putBaseline(options?: { ignoreRegions?: IgnoreRegionInput[] }): Promise<{ key: string } | null> {
      const current = lastCaptureResult;
      if (!current || typeof document === 'undefined') return null;
      const pixels = await decodeImageBytesToRgba(current.bytes, current.width, current.height);
      const key = `${current.refs?.tag ?? 'default'}:${current.width}x${current.height}`;
      visualDiffEngine.putBaseline({ key, bytes: pixels, width: current.width, height: current.height, ignoreRegions: options?.ignoreRegions ?? [] });
      return { key };
    },
  };
}
