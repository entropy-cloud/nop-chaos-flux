import type {
  ActionSchema,
  CompiledRuntimeValue,
  DynamicRuntimeValue,
  ReactionRegistryDebugSnapshot,
  RendererHelpers,
  RendererRuntime,
  RuntimeValueState,
  ScopeDependencySet,
  ScopeRef
} from '@nop-chaos/flux-core';
import { collectRuntimeDependencies } from './node-runtime';
import { scopeChangeHitsDependencies } from './scope-change';

export interface ReactionRegistration {
  id: string;
  dispose(): void;
}

export interface RuntimeReactionRegistry {
  registerReaction(input: {
    id: string;
    runtime: RendererRuntime;
    scope: ScopeRef;
    watch: unknown;
    when?: string;
    immediate?: boolean;
    debounce?: number;
    once?: boolean;
    actions: unknown;
    helpers: Pick<RendererHelpers, 'dispatch'>;
  }): ReactionRegistration;
  disposeScope(scopeId: string): void;
  getDebugSnapshot(): ReactionRegistryDebugSnapshot;
}

const MAX_REACTION_FIRE_COUNT = 10;

function normalizeActionArray(actions: unknown): ActionSchema | ActionSchema[] {
  return actions as ActionSchema | ActionSchema[];
}

export function registerReaction(input: {
  id: string;
  runtime: RendererRuntime;
  scope: ScopeRef;
  watch: unknown;
  when?: string;
  immediate?: boolean;
  debounce?: number;
  once?: boolean;
  actions: unknown;
  helpers: Pick<RendererHelpers, 'dispatch'>;
  onDebugUpdate?: (debug: {
    disposed: boolean;
    fireCount: number;
    dependencies?: readonly string[];
  }) => void;
}): ReactionRegistration {
  const compiledWatch = input.runtime.expressionCompiler.compileValue(input.watch);
  const dynamicWatch = compiledWatch.isStatic ? undefined : compiledWatch as DynamicRuntimeValue<unknown>;
  const watchState: RuntimeValueState<unknown> | undefined = dynamicWatch?.createState();
  const compiledWhen = input.when
    ? input.runtime.expressionCompiler.formulaCompiler.compileExpression<boolean>(input.when)
    : undefined;

  let disposed = false;
  let initialized = false;
  let previousValue: unknown;
  let dependencies: ScopeDependencySet | undefined;
  let triggerQueued = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let fireCount = 0;
  let pendingForce = false;
  let pendingChangedPaths = new Set<string>();

  function emitDebug() {
    input.onDebugUpdate?.({
      disposed,
      fireCount,
      dependencies: dependencies?.paths
    });
  }

  function evaluateWatchValue() {
    const value = dynamicWatch
      ? input.runtime.expressionCompiler.evaluateWithState(dynamicWatch, input.scope, input.runtime.env, watchState!).value
      : (compiledWatch as CompiledRuntimeValue<unknown> & { value: unknown }).value;

    dependencies = collectRuntimeDependencies(watchState);
    return value;
  }

  async function runReaction(changePaths: readonly string[], force = false) {
    if (disposed) {
      return;
    }

    const nextValue = evaluateWatchValue();
    const changed = force || !initialized || !Object.is(previousValue, nextValue);
    const prev = previousValue;

    previousValue = nextValue;
    initialized = true;

    if (!changed) {
      return;
    }

    const whenAllowed = compiledWhen
      ? compiledWhen.exec({
          scope: input.scope.read(),
          value: nextValue,
          prev,
          changed,
          changedPaths: changePaths
        }, input.runtime.env)
      : true;

    if (!whenAllowed) {
      return;
    }

    await input.helpers.dispatch(normalizeActionArray(input.actions), {
      scope: input.scope,
      event: {
        value: nextValue,
        prev,
        changed,
        changedPaths: changePaths
      }
    });

    fireCount += 1;

    if (input.once && fireCount >= 1) {
      emitDebug();
      dispose();
      return;
    }

    if (fireCount >= MAX_REACTION_FIRE_COUNT) {
      emitDebug();
      dispose();
      return;
    }

    emitDebug();
  }

  function scheduleReaction(changePaths: readonly string[], force = false) {
    if (disposed || triggerQueued) {
      for (const path of changePaths) {
        pendingChangedPaths.add(path);
      }
      pendingForce = pendingForce || force;
      return;
    }

    for (const path of changePaths) {
      pendingChangedPaths.add(path);
    }
    pendingForce = pendingForce || force;
    triggerQueued = true;
    const invoke = () => {
      triggerQueued = false;
      const nextChangedPaths = Array.from(pendingChangedPaths);
      const nextForce = pendingForce;
      pendingChangedPaths = new Set<string>();
      pendingForce = false;

      if (input.debounce && input.debounce > 0) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          debounceTimer = undefined;
          void runReaction(nextChangedPaths, nextForce);
        }, input.debounce);
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

    emitDebug();
  }

  const initialValue = evaluateWatchValue();
  previousValue = initialValue;
  initialized = true;
  emitDebug();

  if (input.immediate) {
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
    watch: unknown;
    when?: string;
    immediate?: boolean;
    debounce?: number;
    once?: boolean;
    actions: unknown;
    helpers: Pick<RendererHelpers, 'dispatch'>;
  }): ReactionRegistration {
    const ownerScopeId = input.scope.id;
    const bucket = scopeEntries.get(ownerScopeId) ?? new Map<string, OwnedReactionRegistration>();
    scopeEntries.set(ownerScopeId, bucket);

    const existing = bucket.get(input.id);
    if (existing) {
      existing.dispose();
    }

    let latestDependencies: readonly string[] | undefined;
    let disposed = false;
    let fireCount = 0;

    const registration = registerReaction({
      ...input,
      onDebugUpdate: (debug) => {
        latestDependencies = debug.dependencies;
        fireCount = debug.fireCount;
        disposed = debug.disposed;
      }
    });
    const ownedRegistration: ReactionRegistration & {
      getDebugEntry(): ReactionRegistryDebugSnapshot['reactions'][number];
    } = {
      id: input.id,
      dispose() {
        registration.dispose();
        disposed = true;

        const currentBucket = scopeEntries.get(ownerScopeId);
        if (!currentBucket) {
          return;
        }

        currentBucket.delete(input.id);
        if (currentBucket.size === 0) {
          scopeEntries.delete(ownerScopeId);
        }
      },
      getDebugEntry() {
        return {
          id: input.id,
          scopeId: ownerScopeId,
          watch: input.watch,
          when: input.when,
          immediate: input.immediate,
          debounce: input.debounce,
          once: input.once,
          disposed,
          fireCount,
          dependencies: latestDependencies
        };
      }
    };

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
    getDebugSnapshot
  };
}
