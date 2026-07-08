import {
  type AbortSignalLike,
  composeAbortSignals,
} from './abort-signal-helpers.js';
import {
  type ActionContext,
  type ActionResult,
  type ActionSchema,
  type CompiledActionProgram,
  type CompiledReaction,
  type CompiledReactionPlan,
  type CompiledRuntimeValue,
  type ForceableReactionRegistration,
  type ReactionHandle,
  type ReactionHandleDebugState,
  type RendererRuntime,
  type ScopeRef,
} from '@nop-chaos/flux-core';
import {
  createRootDependencySet,
  filterScopeChangeByIgnoredRoots,
  scopeChangeHitsDependencies,
} from './scope-change.js';

/**
 * Synthetic static watch value used to register renderer-owned reactions.
 *
 * The runtime's own scope subscription (inside `registerReaction`) never
 * produces a real fire for this watch: the synthesized value is always `true`,
 * so after the first evaluation `changed` is always false (unless forced).
 * All firing goes through `ForceableReactionRegistration.force(paths)` driven
 * by the wrapper's own scope subscription below.
 */
const SYNTHETIC_WATCH = {
  kind: 'static' as const,
  isStatic: true as const,
  node: { kind: 'static-node' as const, value: true },
  value: true,
};

/**
 * Convert a `CompiledReactionPlan` (from a `kind: 'reaction'` field) into the
 * `CompiledReaction` shape expected by `registerReaction`. The conversion:
 *  - synthesises a static watch (`SYNTHETIC_WATCH`),
 *  - forces `immediate: false` (renderer owns initial-fire via `ready()`),
 *  - drops `when` / `debounce` / `once` / `control` (v1 unsupported on this path),
 *  - carries `dependsOn` through so the underlying registration knows its roots.
 */
export function planToCompiledReaction(plan: CompiledReactionPlan): CompiledReaction {
  return {
    id: '',
    watch: SYNTHETIC_WATCH as CompiledRuntimeValue<unknown>,
    action: plan.action,
    ...(plan.dependsOn.length > 0 ? { dependsOn: plan.dependsOn } : {}),
  };
}

type ReactionHandlePhase = ReactionHandleDebugState['phase'];

/**
 * Create a renderer-owned `ReactionHandle` for a `kind: 'reaction'` field.
 *
 * The handle wraps `runtime.registerReaction` with a synthesised static watch
 * and self-subscribes to scope changes on `dependsOn` roots. It owns:
 *  - the ready/pause state machine (`initial-paused` → `ready` → `explicit-paused` → `disposed`),
 *  - `ignoreWritesTo` filtering of self-writes,
 *  - per-fire `AbortController` chain (new dispatch aborts previous in-flight),
 *  - pending-change accumulation during pause + single flush on final resume.
 *
 * @see docs/plans/2026-07-07-loadAction-reaction-kind-plan.md
 */
export function createRendererReactionHandle(input: {
  id: string;
  compiledReactionPlan: CompiledReactionPlan;
  scope: ScopeRef;
  dispatch: (
    action: ActionSchema | ActionSchema[] | CompiledActionProgram,
    ctx?: Partial<ActionContext>,
  ) => Promise<ActionResult>;
  runtime: RendererRuntime;
  initialReadyState?: 'paused' | 'ready';
}): ReactionHandle {
  const plan = input.compiledReactionPlan;
  const ignoreWritesTo = plan.ignoreWritesTo;
  const dependsOnRoots = plan.dependsOn;
  const dependencySet = createRootDependencySet(dependsOnRoots);
  const ignoredRootsSet =
    ignoreWritesTo && ignoreWritesTo.length > 0 ? new Set(ignoreWritesTo) : undefined;

  let phase: ReactionHandlePhase =
    input.initialReadyState === 'ready' ? 'ready' : 'initial-paused';
  let pauseCount = 0;
  let fireCount = 0;
  let pendingChange = false;
  let pendingChangedPaths: string[] = [];

  /**
   * Optional evaluation-bindings provider, set by the renderer (e.g. CRUD)
   * after the handle is created. When the reactive/force path fires, the
   * provider is called to inject the renderer's current internal state
   * (pagination, query, sort, etc.) into the action's evaluationBindings.
   * This ensures that reactive triggers (external binding changes) and
   * manual refresh (force/reload) produce actions with the same context
   * as imperative dispatch.
   */
  let bindingsProvider: (() => Record<string, unknown>) | undefined;

  // Lifecycle abort controller — fires once on dispose, aborts every in-flight dispatch.
  const lifecycleController = new AbortController();
  // Per-fire abort controller — only the most recent dispatch's controller is active.
  let inFlightController: AbortController | undefined;

  function flushPending(): void {
    if (!pendingChange) {
      return;
    }
    pendingChange = false;
    const paths = pendingChangedPaths;
    pendingChangedPaths = [];
    fireCount += 1;
    registration.force(paths.length > 0 ? paths : dependsOnRoots);
  }

  function handleScopeChange(change: { paths: readonly string[] }): void {
    if (phase === 'disposed') {
      return;
    }

    const filtered = ignoredRootsSet
      ? filterScopeChangeByIgnoredRoots(change, ignoredRootsSet)
      : change;
    if (!filtered) {
      return;
    }

    if (!scopeChangeHitsDependencies(filtered, dependencySet)) {
      return;
    }

    if (phase === 'ready') {
      fireCount += 1;
      registration.force(filtered.paths);
      return;
    }

    // initial-paused or explicit-paused: accumulate pending.
    pendingChange = true;
    for (const p of filtered.paths) {
      pendingChangedPaths.push(p);
    }
  }

  // Wrap dispatch to inject per-fire AbortController + abort chain.
  const dispatchWithAbortChain = async (
    action: ActionSchema | ActionSchema[] | CompiledActionProgram,
    ctx?: Partial<ActionContext>,
  ): Promise<ActionResult> => {
    if (phase === 'disposed' || lifecycleController.signal.aborted) {
      return {
        ok: false,
        cancelled: true,
        error: new Error('ReactionHandle disposed'),
      };
    }

    // Abort previous in-flight; start a new per-fire controller.
    inFlightController?.abort();
    const perFire = new AbortController();
    inFlightController = perFire;

    const signals: AbortSignalLike[] = [lifecycleController.signal, perFire.signal];
    const externalSignal = ctx?.signal;
    if (externalSignal) {
      signals.push(externalSignal);
    }
    const combinedSignal = composeAbortSignals(signals);

    // Merge callback bindings (from renderer, e.g. CRUD state) with explicit
    // ctx bindings. Explicit bindings (from handle.dispatch) take priority over
    // callback bindings; callback bindings fill in the gaps for reactive/force
    // triggers that don't have renderer context.
    const callbackBindings = bindingsProvider?.() ?? {};

    try {
      return await input.dispatch(action, {
        ...ctx,
        signal: combinedSignal,
        scope: ctx?.scope ?? input.scope,
        evaluationBindings: { ...callbackBindings, ...ctx?.evaluationBindings },
      });
    } finally {
      if (inFlightController === perFire) {
        inFlightController = undefined;
      }
    }
  };

  // Register the underlying reaction with synthesised static watch.
  // The implementation returns a ForceableReactionRegistration (force is hidden
  // behind the ReactionRegistration base type for non-renderer callers).
  const registration: ForceableReactionRegistration = input.runtime.registerReaction({
    id: input.id,
    compiledReaction: planToCompiledReaction(plan),
    scope: input.scope,
    dispatch: dispatchWithAbortChain,
  }) as ForceableReactionRegistration;

  // Self-subscribe to scope changes (the underlying reaction's own subscription
  // never fires for the synthesised static watch).
  const unsubscribe = input.scope.store?.subscribe(handleScopeChange);

  const handle: ReactionHandle = {
    dispatch(ctx) {
      if (phase === 'disposed') {
        return Promise.resolve({
          ok: false,
          cancelled: true,
          error: new Error('ReactionHandle disposed'),
        });
      }
      return dispatchWithAbortChain(plan.action, {
        signal: ctx?.signal,
        evaluationBindings: ctx?.evaluationBindings,
        scope: input.scope,
      });
    },
    force(paths) {
      if (phase === 'disposed') {
        return;
      }
      if (phase !== 'ready') {
        // Accumulate as pending; will flush on ready/resume.
        pendingChange = true;
        if (paths) {
          for (const p of paths) {
            pendingChangedPaths.push(p);
          }
        }
        return;
      }
      fireCount += 1;
      registration.force(paths);
    },
    ready() {
      if (phase !== 'initial-paused') {
        return;
      }
      phase = 'ready';
      flushPending();
    },
    pause() {
      if (phase === 'disposed') {
        return;
      }
      pauseCount += 1;
      if (phase === 'ready') {
        phase = 'explicit-paused';
      }
    },
    resume() {
      if (phase === 'disposed') {
        return;
      }
      if (pauseCount > 0) {
        pauseCount -= 1;
      }
      if (pauseCount === 0 && phase === 'explicit-paused') {
        phase = 'ready';
        flushPending();
      }
    },
    dispose() {
      if (phase === 'disposed') {
        return;
      }
      phase = 'disposed';
      lifecycleController.abort();
      inFlightController?.abort();
      inFlightController = undefined;
      unsubscribe?.();
      registration.dispose();
      pendingChange = false;
      pendingChangedPaths = [];
    },
    getDebugState(): ReactionHandleDebugState {
      return {
        phase,
        fireCount,
        pauseCount,
        pendingChange,
        pendingChangedPaths,
        disposed: phase === 'disposed',
      };
    },
  };

  /**
   * Internal extension point: the lazy proxy (flux-react) uses this to register
   * a bindings provider from the renderer (e.g. CRUD's evaluationBindings).
   * Not part of the public ReactionHandle interface.
   */
  (handle as ReactionHandle & { _setBindingsProvider?: (fn: (() => Record<string, unknown>) | undefined) => void })._setBindingsProvider = (fn) => {
    bindingsProvider = fn;
  };

  return handle;
}
