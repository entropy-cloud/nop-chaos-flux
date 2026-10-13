import type { ActionResult } from './actions.js';
import type { ScopeRef } from './scope.js';

/**
 * Debug snapshot returned by `ReactionHandle.getDebugState()`. Diagnostic only;
 * external consumers should treat `phase` as `'ready' | 'paused'` even though
 * the runtime distinguishes initial-paused vs explicit-paused internally.
 */
export interface ReactionHandleDebugState {
  phase: 'initial-paused' | 'ready' | 'explicit-paused' | 'disposed';
  fireCount: number;
  pauseCount: number;
  pendingChange: boolean;
  pendingChangedPaths: readonly string[];
  disposed: boolean;
}

/**
 * Per-key configuration for {@link ReactionHandle.configure}.
 *
 * Semantics (per docs/plans/585-cx7-react-runtime-contract-plan.md):
 *  - A key is "provided" when it is present on the options object (`'key in
 *    config'`), which distinguishes "not provided" from "provided as
 *    `undefined`". Providing a key ≙ one corresponding setter call.
 *  - Provided-as-`undefined` clears that channel (present-undefined = clear).
 *  - Arrays are replaced wholesale, never merged.
 *  - `configure` may be called any number of times with partial options and in
 *    any order; a single full-options call is equivalent to the accumulated
 *    sequence of partial calls.
 */
export interface ReactionHandleConfigureOptions {
  /**
   * Evaluation-bindings provider invoked on every dispatch (imperative, force,
   * and reactive triggers) to inject renderer context into the action's
   * `evaluationBindings`. Explicit per-dispatch bindings take priority.
   */
  bindingsProvider?: (() => Record<string, unknown>) | undefined;
  /**
   * Dispatch-scope override. When provided, every dispatch runs against this
   * scope instead of the registration scope.
   */
  scopeOverride?: ScopeRef | undefined;
  /**
   * Renderer-declared additional ignored write roots (merged with the
   * plan-level `ignoreWritesTo`). Writes to these paths do not re-trigger the
   * reaction. Replaced wholesale on each provided key.
   */
  ignoreWritesTo?: readonly string[] | undefined;
  /**
   * Load lifecycle callbacks: `onStart` fires before each dispatch; `onSettle`
   * receives every dispatch result (including reactive `force()` results the
   * underlying reaction registry would otherwise drop).
   */
  loadCallbacks?: {
    onStart?: () => void;
    onSettle?: (result: ActionResult) => void;
  } | undefined;
}

/**
 * Imperative + reactive handle exposed to renderers for a `kind: 'reaction'`
 * field. The runtime wrapper (flux-runtime `renderer-reaction-handle.ts`)
 * subscribes to scope changes on `dependsOn` roots and uses `force()` to fire;
 * renderers own initial-fire timing via `ready()` and may temporarily suspend
 * firing via `pause()` / `resume()`.
 *
 * After dispose, `dispatch` resolves to a canonical cancelled result and
 * `force`/`ready`/`pause`/`resume` are silent no-ops; `getDebugState()` keeps
 * returning a snapshot with `phase: 'disposed'`.
 *
 * @see docs/plans/2026-07-07-loadAction-reaction-kind-plan.md
 */
export interface ReactionHandle {
  /**
   * Dispatch the underlying action program imperatively. Renderers use this for
   * renderer-internal triggers (page change, sort change, etc.). The wrapper
   * injects `evaluationBindings` and per-fire `AbortController` before reaching
   * the action dispatcher. Returns the full `ActionResult` so renderers can
   * consume `data`, `error`, etc.
   */
  dispatch(ctx?: {
    signal?: AbortSignal;
    evaluationBindings?: Record<string, unknown>;
    /**
     * Optional dispatch scope override. When omitted, dispatches run against
     * the reaction's registration scope (or the renderer-declared scope
     * override, if set). Renderers may pass a child scope projection so the
     * action's request layer resolves renderer-scoped variables.
     */
    scope?: ScopeRef;
  }): Promise<ActionResult>;
  /**
   * Force the reaction to fire as if a scope change touched `paths` (or all
   * declared dependency roots when omitted). No-op when paused or disposed.
   */
  force(paths?: readonly string[]): void;
  /**
   * Transition from the initial paused state to ready. Required for the
   * reaction to fire on initial mount. No-op after the first call.
   */
  ready(): void;
  /**
   * Pause firing. Nested pauses are tracked via a counter; only the matching
   * number of `resume()` calls resume firing. Pending changes accumulated
   * during pause are flushed once on the final resume.
   */
  pause(): void;
  /** Resume firing (counter-based). See `pause()`. */
  resume(): void;
  /**
   * Dispose the handle and underlying registration. Aborts any in-flight
   * dispatch (per-fire AbortController chain), unsubscribes from scope changes,
   * and transitions the handle to `phase: 'disposed'`. After dispose, all
   * methods become no-ops and `dispatch()` resolves to a canonical cancelled
   * result. Idempotent.
   */
  dispose(): void;
  /**
   * Configure renderer-owned channels on the handle: `bindingsProvider`,
   * `scopeOverride`, `ignoreWritesTo`, and `loadCallbacks`. Idempotent per
   * provided key and free of inter-call ordering constraints — it may be
   * called any number of times with partial options; only keys present on the
   * options object are applied (`'key in config'` judgment), and a key
   * provided as `undefined` clears its channel. See
   * {@link ReactionHandleConfigureOptions}.
   */
  configure(options: ReactionHandleConfigureOptions): void;
  /** Snapshot for debug tooling. */
  getDebugState(): ReactionHandleDebugState;
}
