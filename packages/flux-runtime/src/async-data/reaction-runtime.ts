import {
  reportRuntimeHostIssue,
  type AsyncGovernanceStore,
  type ActionSchema,
  type AsyncRunHandle,
  type CompiledReaction,
  type CompiledRuntimeValue,
  type DynamicRuntimeValue,
  type ReactionRegistryDebugSnapshot,
  type RendererHelpers,
  type RendererRuntime,
  type RuntimeValueState,
  type ScopeDependencySet,
  type ScopeRef
} from '@nop-chaos/flux-core';
import { collectRuntimeDependencies } from '../node-runtime';
import { isAbortError } from '../error-utils';
import { createRootDependencySet, scopeChangeHitsDependencies } from '../scope-change';

export interface ReactionRegistration {
  id: string;
  dispose(): void;
}

export interface RuntimeReactionRegistry {
  registerReaction(input: {
    id: string;
    runtime: RendererRuntime;
    scope: ScopeRef;
    asyncGovernance?: AsyncGovernanceStore;
    compiledReaction: CompiledReaction;
    helpers: Pick<RendererHelpers, 'dispatch'>;
  }): ReactionRegistration;
  disposeScope(scopeId: string): void;
  disposeScopeTree(scopeId: string): void;
  getDebugSnapshot(): ReactionRegistryDebugSnapshot;
}

const MAX_REACTION_FIRE_COUNT = 10;

function createReactionLimitError(input: { id: string; scope: ScopeRef; fireCount: number }) {
  return new Error(
    `Reaction "${input.id}" in scope "${input.scope.id}" exceeded MAX_REACTION_FIRE_COUNT (${MAX_REACTION_FIRE_COUNT}) and was disposed`
  );
}

function normalizeActionArray(actions: unknown): ActionSchema | ActionSchema[] {
  return actions as ActionSchema | ActionSchema[];
}

export function registerReaction(input: {
  id: string;
  runtime: RendererRuntime;
  scope: ScopeRef;
  asyncGovernance?: AsyncGovernanceStore;
  compiledReaction: CompiledReaction;
  helpers: Pick<RendererHelpers, 'dispatch'>;
  onDebugUpdate?: (debug: {
    disposed: boolean;
    queued: boolean;
    running: boolean;
    fireCount: number;
    dependencies?: readonly string[];
    async?: import('@nop-chaos/flux-core').AsyncOwnerDebugState;
  }) => void;
  onDispose?: () => void;
}): ReactionRegistration {
  const compiled = input.compiledReaction;

  // All data comes from compiled reaction - no fallback to raw schema
  const compiledWatch = compiled.watch;
  const compiledWhen = compiled.when;
  const dependsOnSource = compiled.dependsOn;
  const immediateSource = compiled.immediate;
  const debounceSource = compiled.debounce;
  const onceSource = compiled.once;
  const actionsSource = compiled.action;

  const dynamicWatch = compiledWatch.isStatic ? undefined : compiledWatch as DynamicRuntimeValue<unknown>;
  const watchState: RuntimeValueState<unknown> | undefined = dynamicWatch?.createState();
  const explicitDependencies = createRootDependencySet(dependsOnSource);

  let disposed = false;
  let initialized = false;
  let previousValue: unknown;
  let dependencies: ScopeDependencySet | undefined = explicitDependencies;
  let triggerQueued = false;
  let running = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let fireCount = 0;
  let pendingForce = false;
  let pendingChangedPaths = new Set<string>();
  let pendingRun: AsyncRunHandle | undefined;

  function createRunHandle(force: boolean): AsyncRunHandle | undefined {
    return input.asyncGovernance?.beginRun({
      ownerKind: 'reaction',
      ownerId: `reaction:${input.scope.id}:${input.id}`,
      scopeId: input.scope.id,
      cause: force ? 'immediate' : 'dependency-change'
    });
  }

  function emitDebug() {
    input.onDebugUpdate?.({
      disposed,
      queued: triggerQueued || Boolean(debounceTimer),
      running,
      fireCount,
      dependencies: dependencies?.paths,
      async: input.asyncGovernance?.getOwnerState(`reaction:${input.scope.id}:${input.id}`)
    });
  }

  function evaluateWatchValue() {
    const value = dynamicWatch
      ? input.runtime.expressionCompiler.evaluateWithState(dynamicWatch, input.scope, input.runtime.env, watchState!).value
      : (compiledWatch as CompiledRuntimeValue<unknown> & { value: unknown }).value;

    if (!explicitDependencies) {
      dependencies = collectRuntimeDependencies(watchState);
    }

    return value;
  }

  async function runReaction(changePaths: readonly string[], force = false, run: AsyncRunHandle | undefined = createRunHandle(force)) {

    try {
      if (disposed) {
        if (run && input.asyncGovernance) {
          input.asyncGovernance.settleRun(run, { outcome: 'cancelled', cancelled: true });
        }
        return;
      }

      running = true;
      emitDebug();

      const nextValue = evaluateWatchValue();
      const changed = force || !initialized || !Object.is(previousValue, nextValue);
      const prev = previousValue;

      previousValue = nextValue;
      initialized = true;

      if (!changed) {
        if (run && input.asyncGovernance) {
          input.asyncGovernance.settleRun(run, { outcome: 'succeeded' });
        }
        return;
      }

      // Execute pre-compiled when expression with special bindings
      const whenAllowed = compiledWhen
        ? compiledWhen.exec({
            scope: input.scope.readVisible(),
            value: nextValue,
            prev,
            changed,
            changedPaths: changePaths
          }, input.runtime.env)
        : true;

      if (!whenAllowed) {
        if (run && input.asyncGovernance) {
          input.asyncGovernance.settleRun(run, { outcome: 'succeeded' });
        }
        return;
      }

      await input.helpers.dispatch(normalizeActionArray(actionsSource), {
        scope: input.scope,
        event: {
          type: 'reaction',
          value: nextValue,
          prev,
          changed,
          changedPaths: changePaths
        },
        evaluationBindings: {
          value: nextValue,
          prev,
          changed,
          changedPaths: changePaths
        }
      });

      fireCount += 1;

      if (onceSource && fireCount >= 1) {
        if (run && input.asyncGovernance) {
          input.asyncGovernance.settleRun(run, { outcome: 'succeeded' });
        }
        emitDebug();
        dispose();
        return;
      }

      if (fireCount >= MAX_REACTION_FIRE_COUNT) {
        const error = createReactionLimitError({
          id: input.id,
          scope: input.scope,
          fireCount
        });
        reportRuntimeHostIssue({
          env: input.runtime.env,
          level: 'warning',
          message: error.message,
          error,
          phase: 'action',
          details: {
            reason: 'reaction-fire-count-limit',
            reactionId: input.id,
            scopeId: input.scope.id,
            fireCount,
            maxFireCount: MAX_REACTION_FIRE_COUNT
          }
        });
        if (run && input.asyncGovernance) {
          input.asyncGovernance.settleRun(run, { outcome: 'failed', error });
        }
        emitDebug();
        dispose();
        return;
      }

      if (run && input.asyncGovernance) {
        input.asyncGovernance.settleRun(run, { outcome: 'succeeded' });
      }
      emitDebug();
    } catch (error) {
      if (disposed || isAbortError(error)) {
        if (run && input.asyncGovernance) {
          input.asyncGovernance.settleRun(run, {
            outcome: 'cancelled',
            cancelled: true,
            error
          });
        }
        return;
      }

      input.runtime.env.monitor?.onError?.({
        phase: 'action',
        error,
        details: {
          reason: 'reaction-run-failed',
          reactionId: input.id,
          scopeId: input.scope.id,
          changedPaths: changePaths
        }
      });
      if (run && input.asyncGovernance) {
        input.asyncGovernance.settleRun(run, { outcome: 'failed', error });
      }
    } finally {
      running = false;
      emitDebug();

      if (!disposed && triggerQueued && !debounceTimer) {
        const queuedRun = pendingRun;
        pendingRun = undefined;
        const nextChangedPaths = Array.from(pendingChangedPaths);
        const nextForce = pendingForce;
        pendingChangedPaths = new Set<string>();
        pendingForce = false;
        triggerQueued = false;
        void runReaction(nextChangedPaths, nextForce, queuedRun);
      }
    }
  }

  function scheduleReaction(changePaths: readonly string[], force = false) {
    if (disposed || triggerQueued || running) {
      for (const path of changePaths) {
        pendingChangedPaths.add(path);
      }
      pendingForce = pendingForce || force;
      if (!disposed) {
        triggerQueued = true;
        pendingRun ??= createRunHandle(force);
        emitDebug();
      }
      return;
    }

    for (const path of changePaths) {
      pendingChangedPaths.add(path);
    }
    pendingForce = pendingForce || force;
    triggerQueued = true;
    const invoke = () => {
      if (disposed) {
        return;
      }
      triggerQueued = false;
      const nextChangedPaths = Array.from(pendingChangedPaths);
      const nextForce = pendingForce;
      pendingChangedPaths = new Set<string>();
      pendingForce = false;

      if (debounceSource && debounceSource > 0) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          debounceTimer = undefined;
          void runReaction(nextChangedPaths, nextForce);
        }, debounceSource);
        return;
      }

      void runReaction(nextChangedPaths, nextForce);
    };

    void Promise.resolve().then(invoke);
  }

  function dispose() {
    if (disposed) {
      return;
    }

    disposed = true;
    unsubscribe?.();
    pendingChangedPaths.clear();
    pendingForce = false;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }

    input.onDispose?.();
    emitDebug();
  }

  const initialValue = evaluateWatchValue();
  previousValue = initialValue;
  initialized = true;
  emitDebug();

  if (immediateSource) {
    scheduleReaction([], true);
  }

  const unsubscribe = input.scope.store?.subscribe((change) => {
    if (disposed) {
      return;
    }

    if (!scopeChangeHitsDependencies(change, dependencies)) {
      return;
    }

    scheduleReaction(change.paths);
  });

  return {
    id: input.id,
    dispose
  };
}

export function createRuntimeReactionRegistry(): RuntimeReactionRegistry {
  type OwnedReactionRegistration = ReactionRegistration & {
    getDebugEntry(): ReactionRegistryDebugSnapshot['reactions'][number];
  };
  const scopeEntries = new Map<string, Map<string, OwnedReactionRegistration>>();

  function register(input: {
    id: string;
    runtime: RendererRuntime;
    scope: ScopeRef;
    asyncGovernance?: AsyncGovernanceStore;
    compiledReaction: CompiledReaction;
    helpers: Pick<RendererHelpers, 'dispatch'>;
  }): ReactionRegistration {
    const ownerScopeId = input.scope.id;
    const bucket = scopeEntries.get(ownerScopeId) ?? new Map<string, OwnedReactionRegistration>();
    scopeEntries.set(ownerScopeId, bucket);

    const existing = bucket.get(input.id);
    if (existing) {
      existing.dispose();
    }

    const compiled = input.compiledReaction;

    let latestDependencies: readonly string[] | undefined;
    let disposed = false;
    let queued = false;
    let running = false;
    let fireCount = 0;
    let asyncState: import('@nop-chaos/flux-core').AsyncOwnerDebugState | undefined;
    const ownedRegistrationRef: { current?: OwnedReactionRegistration } = {};

    const registration = registerReaction({
      ...input,
      onDebugUpdate: (debug) => {
        latestDependencies = debug.dependencies;
        fireCount = debug.fireCount;
        disposed = debug.disposed;
        queued = debug.queued;
        running = debug.running;
        asyncState = debug.async;
      },
      onDispose: () => {
        ownedRegistrationRef.current?.dispose();
      }
    });
    const ownedRegistration: OwnedReactionRegistration = {
      id: input.id,
      dispose() {
        if (disposed) {
          const currentBucket = scopeEntries.get(ownerScopeId);
          currentBucket?.delete(input.id);
          if (currentBucket && currentBucket.size === 0) {
            scopeEntries.delete(ownerScopeId);
          }
          return;
        }

        registration.dispose();
        disposed = true;

        const currentBucket = scopeEntries.get(ownerScopeId);
        if (!currentBucket) {
          return;
        }

        currentBucket.delete(input.id);
        input.asyncGovernance?.clearOwner(`reaction:${ownerScopeId}:${input.id}`);
        if (currentBucket.size === 0) {
          scopeEntries.delete(ownerScopeId);
        }
      },
      getDebugEntry() {
        return {
          id: input.id,
          scopeId: ownerScopeId,
          // Debug info from compiled data
          watch: compiled.watch.isStatic ? compiled.watch.value : '[dynamic]',
          when: compiled.when ? '[expression]' : undefined,
          immediate: compiled.immediate,
          debounce: compiled.debounce,
          once: compiled.once,
          disposed,
          queued,
          running,
          fireCount,
          dependencies: latestDependencies,
          async: asyncState
        };
      }
    };

    ownedRegistrationRef.current = ownedRegistration;

    bucket.set(input.id, ownedRegistration);
    return ownedRegistration;
  }

  function disposeScope(scopeId: string) {
    const bucket = scopeEntries.get(scopeId);

    if (!bucket) {
      return;
    }

    for (const registration of Array.from(bucket.values())) {
      registration.dispose();
    }
  }

  function disposeScopeTree(scopeId: string) {
    for (const ownerScopeId of Array.from(scopeEntries.keys())) {
      if (ownerScopeId === scopeId || ownerScopeId.startsWith(`${scopeId}:`)) {
        disposeScope(ownerScopeId);
      }
    }
  }

  function getDebugSnapshot(): ReactionRegistryDebugSnapshot {
    return {
      reactions: Array.from(scopeEntries.values())
        .flatMap((bucket) => Array.from(bucket.values()).map((entry) => entry.getDebugEntry()))
        .sort((left, right) => left.scopeId.localeCompare(right.scopeId) || left.id.localeCompare(right.id))
    };
  }

  return {
    registerReaction: register,
    disposeScope,
    disposeScopeTree,
    getDebugSnapshot
  };
}
