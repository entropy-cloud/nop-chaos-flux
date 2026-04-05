import type {
  ApiObject,
  DataSourceController,
  DataSourceRegistration,
  DataSourceSchema,
  DynamicRuntimeValue,
  StaticRuntimeValue,
  RendererRuntime,
  RuntimeValueState,
  ScopeDependencySet,
  ScopeRef
} from '@nop-chaos/flux-core';
import type { ApiCacheStore } from './api-cache';
import { createDataSourceController } from './data-source-runtime';
import { collectRuntimeDependencies } from './node-runtime';
import { scopeChangeHitsDependencies } from './scope-change';

interface RuntimeSourceEntry {
  id: string;
  ownerScopeId: string;
  scope: ScopeRef;
  controller: DataSourceController;
  dependencies?: ScopeDependencySet;
  targetPath?: string;
  dispose(): void;
}

function createDependencyAwareFormulaController(input: {
  runtime: RendererRuntime;
  scope: ScopeRef;
  dataPath: string;
  formula: unknown;
  initialData?: unknown;
  onDependenciesChange?: (dependencies: ScopeDependencySet | undefined) => void;
}): DataSourceController {
  const compiled = input.runtime.expressionCompiler.compileValue(input.formula);
  const staticCompiled = compiled.isStatic ? compiled as StaticRuntimeValue<unknown> : undefined;
  const dynamicCompiled = compiled.isStatic ? undefined : compiled as DynamicRuntimeValue<unknown>;
  const runtimeState: RuntimeValueState<unknown> | undefined = dynamicCompiled?.createState();

  let started = false;
  let stopped = false;
  let loading = false;
  let stale = false;
  let value: unknown = input.initialData;
  let error: unknown;

  function updateDependencies() {
    input.onDependenciesChange?.(collectRuntimeDependencies(runtimeState));
  }

  function publish() {
    if (stopped) {
      return;
    }

    loading = true;
    stale = value !== undefined;
    error = undefined;

    const nextValue = dynamicCompiled
      ? input.runtime.expressionCompiler.evaluateWithState(dynamicCompiled, input.scope, input.runtime.env, runtimeState!).value
      : staticCompiled?.value;

    value = nextValue;
    loading = false;
    stale = false;
    updateDependencies();
    input.scope.update(input.dataPath, nextValue);
  }

  return {
    getState() {
      return {
        started,
        loading,
        stale,
        value,
        error
      };
    },
    start() {
      if (started) {
        return;
      }

      started = true;
      stopped = false;

      if (input.initialData !== undefined) {
        value = input.initialData;
        input.scope.update(input.dataPath, input.initialData);
      }

      void Promise.resolve().then(() => {
        publish();
      });
    },
    stop() {
      stopped = true;
    },
    async refresh() {
      publish();
    }
  };
}

export interface RuntimeSourceRegistry {
  registerDataSource(input: {
    id: string;
    schema: DataSourceSchema;
    scope: ScopeRef;
  }): DataSourceRegistration;
  refreshDataSource(input: {
    id: string;
    scope?: ScopeRef;
  }): Promise<boolean>;
  disposeScope(scopeId: string): void;
}

export function createRuntimeSourceRegistry(input: {
  runtime: RendererRuntime;
  apiCache: ApiCacheStore;
  executeApiRequest: <T>(actionType: string, api: ApiObject, scope: ScopeRef, options?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; data: T }>;
}): RuntimeSourceRegistry {
  const scopeEntries = new Map<string, Map<string, RuntimeSourceEntry>>();

  function registerDataSource(args: {
    id: string;
    schema: DataSourceSchema;
    scope: ScopeRef;
  }): DataSourceRegistration {
    const ownerScopeId = args.scope.id;
    const bucket = scopeEntries.get(ownerScopeId) ?? new Map<string, RuntimeSourceEntry>();
    scopeEntries.set(ownerScopeId, bucket);

    const existing = bucket.get(args.id);
    if (existing) {
      existing.dispose();
    }

    let dependencies: ScopeDependencySet | undefined;
    const targetPath = args.schema.dataPath;
    const controller = 'api' in args.schema
      ? createDataSourceController({
          runtime: input.runtime,
          apiCache: input.apiCache,
          executeApiRequest: input.executeApiRequest,
          api: args.schema.api as ApiObject,
          scope: args.scope,
          dataPath: args.schema.dataPath,
          interval: args.schema.interval,
          stopWhen: args.schema.stopWhen,
          silent: args.schema.silent,
          initialData: args.schema.initialData,
          onDependenciesChange(nextDependencies: ScopeDependencySet | undefined) {
            dependencies = nextDependencies;
          }
        })
      : createDependencyAwareFormulaController({
          runtime: input.runtime,
          scope: args.scope,
          dataPath: args.schema.dataPath ?? `${args.id}`,
          formula: args.schema.formula,
          initialData: args.schema.initialData,
          onDependenciesChange(nextDependencies) {
            dependencies = nextDependencies;
          }
        });

    const unsubscribe = args.scope.store?.subscribe((change) => {
      if (disposed) {
        return;
      }

      if (targetPath && change.paths.every((path) => path === targetPath || path.startsWith(`${targetPath}.`))) {
        return;
      }

      if (!scopeChangeHitsDependencies(change, dependencies)) {
        return;
      }

      void controller.refresh();
    });

    let disposed = false;

    const entry: RuntimeSourceEntry = {
      id: args.id,
      ownerScopeId,
      scope: args.scope,
      controller,
      dependencies,
      targetPath,
      dispose() {
        if (disposed) {
          return;
        }

        disposed = true;
        unsubscribe?.();
        controller.stop();

        const currentBucket = scopeEntries.get(ownerScopeId);
        if (!currentBucket) {
          return;
        }

        currentBucket.delete(args.id);
        if (currentBucket.size === 0) {
          scopeEntries.delete(ownerScopeId);
        }
      }
    };

    bucket.set(args.id, entry);
    controller.start();

    return {
      id: args.id,
      controller,
      dispose: () => entry.dispose()
    };
  }

  function disposeScope(scopeId: string) {
    const bucket = scopeEntries.get(scopeId);

    if (!bucket) {
      return;
    }

    for (const entry of Array.from(bucket.values())) {
      entry.dispose();
    }
  }

  async function refreshDataSource(args: {
    id: string;
    scope?: ScopeRef;
  }): Promise<boolean> {
    if (args.scope) {
      const entry = scopeEntries.get(args.scope.id)?.get(args.id);

      if (!entry) {
        return false;
      }

      await entry.controller.refresh();
      return true;
    }

    for (const bucket of scopeEntries.values()) {
      const entry = bucket.get(args.id);

      if (!entry) {
        continue;
      }

      await entry.controller.refresh();
      return true;
    }

    return false;
  }

  return {
    registerDataSource,
    refreshDataSource,
    disposeScope
  };
}
