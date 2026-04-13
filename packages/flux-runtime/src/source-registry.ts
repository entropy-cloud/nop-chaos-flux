import type {
  ApiSchema,
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
import { createRootDependencySet, filterScopeChangeByIgnoredRoots, scopeChangeHitsDependencies } from './scope-change';
import { publishOwnerStatus } from './status-owner';

interface RuntimeSourceEntry {
  id: string;
  name?: string;
  ownerScopeId: string;
  scope: ScopeRef;
  controller: DataSourceController;
  dependencies?: ScopeDependencySet;
  targetPath?: string;
  statusPath?: string;
  dispose(): void;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function applyResultMapping(input: {
  runtime: RendererRuntime;
  scope: ScopeRef;
  resultMapping?: unknown;
  payload: unknown;
}): unknown {
  if (!isObjectRecord(input.resultMapping)) {
    return input.payload;
  }

  const mappingScope = input.runtime.createChildScope(input.scope, {
    payload: input.payload,
    result: input.payload,
    response: input.payload
  }, { source: 'custom', pathSuffix: 'data-source-result-mapping' });

  return input.runtime.evaluate(input.resultMapping, mappingScope);
}

function resolvePublishedTarget(schema: DataSourceSchema, fallbackId: string): string | undefined {
  if (typeof schema.name === 'string' && schema.name.length > 0) {
    return schema.name;
  }

  if (typeof schema.dataPath === 'string' && schema.dataPath.length > 0) {
    return schema.dataPath;
  }

  if ('api' in schema && schema.api) {
    return undefined;
  }

  return fallbackId;
}

function createDependencyAwareFormulaController(input: {
  runtime: RendererRuntime;
  scope: ScopeRef;
  targetPath?: string;
  mergeToScope?: boolean;
  resultMapping?: unknown;
  statusPath?: string;
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

  function publishStatus() {
    publishOwnerStatus(input.scope, input.statusPath, {
      started,
      loading,
      ready: started && !loading && !error,
      stale,
      error: error ? { message: error instanceof Error ? error.message : String(error) } : undefined
    });
  }

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

    const rawValue = dynamicCompiled
      ? input.runtime.expressionCompiler.evaluateWithState(dynamicCompiled, input.scope, input.runtime.env, runtimeState!).value
      : staticCompiled?.value;
    const nextValue = applyResultMapping({
      runtime: input.runtime,
      scope: input.scope,
      resultMapping: input.resultMapping,
      payload: rawValue
    });

    value = nextValue;
    loading = false;
    stale = false;
    updateDependencies();
    if (input.targetPath) {
      input.scope.update(input.targetPath, nextValue);
    }

    if (input.mergeToScope && isObjectRecord(nextValue)) {
      input.scope.merge(nextValue);
    }

    publishStatus();
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
        if (input.targetPath) {
          input.scope.update(input.targetPath, input.initialData);
        }

        if (input.mergeToScope && isObjectRecord(input.initialData)) {
          input.scope.merge(input.initialData);
        }
      }

      publishStatus();

      void Promise.resolve().then(() => {
        publish();
      });
    },
    stop() {
      stopped = true;
      publishStatus();
    },
    async refresh() {
      publish();
    }
  };
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
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
  disposeScopeTree(scopeId: string): void;
  getDebugSnapshot(): import('@nop-chaos/flux-core').SourceRegistryDebugSnapshot;
}

export function createRuntimeSourceRegistry(input: {
  runtime: RendererRuntime;
  apiCache: ApiCacheStore;
  executeApiRequest: <T>(actionType: string, api: import('@nop-chaos/flux-core').ExecutableApiRequest, scope: ScopeRef, options?: { signal?: AbortSignal; control?: import('@nop-chaos/flux-core').OperationControlConfig }) => Promise<{ ok: boolean; status: number; data: T }>;
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

    const explicitDependencies = createRootDependencySet(args.schema.dependsOn);
    let dependencies: ScopeDependencySet | undefined = explicitDependencies;
    const targetPath = resolvePublishedTarget(args.schema, args.id);
    const controller = 'api' in args.schema && args.schema.api
      ? createDataSourceController({
          runtime: input.runtime,
          apiCache: input.apiCache,
          executeApiRequest: input.executeApiRequest,
          api: args.schema.api as ApiSchema,
          scope: args.scope,
          targetPath,
          mergeToScope: args.schema.mergeToScope,
          resultMapping: args.schema.resultMapping,
          statusPath: args.schema.statusPath,
          interval: asNumber(args.schema.interval),
          stopWhen: asString(args.schema.stopWhen),
          silent: asBoolean(args.schema.silent),
          initialData: args.schema.initialData,
          onDependenciesChange(nextDependencies: ScopeDependencySet | undefined) {
            if (!explicitDependencies) {
              dependencies = nextDependencies;
            }
          }
        })
      : createDependencyAwareFormulaController({
          runtime: input.runtime,
          scope: args.scope,
          targetPath,
          mergeToScope: args.schema.mergeToScope,
          resultMapping: args.schema.resultMapping,
          statusPath: args.schema.statusPath,
          formula: args.schema.formula,
          initialData: args.schema.initialData,
          onDependenciesChange(nextDependencies) {
            if (!explicitDependencies) {
              dependencies = nextDependencies;
            }
          }
        });

    const ignoredRoots = [targetPath, args.schema.statusPath].filter((value): value is string => Boolean(value));

    const unsubscribe = args.scope.store?.subscribe((change) => {
      if (disposed) {
        return;
      }

      const observedChange = ignoredRoots.length > 0
        ? filterScopeChangeByIgnoredRoots(change, ignoredRoots)
        : change;

      if (!observedChange) {
        return;
      }

      if (!scopeChangeHitsDependencies(observedChange, dependencies)) {
        return;
      }

      void controller.refresh();
    });

    let disposed = false;

    const entry: RuntimeSourceEntry = {
      id: args.id,
      name: args.schema.name,
      ownerScopeId,
      scope: args.scope,
      controller,
      dependencies,
      targetPath,
      statusPath: args.schema.statusPath,
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

  function disposeScopeTree(scopeId: string) {
    for (const ownerScopeId of Array.from(scopeEntries.keys())) {
      if (ownerScopeId === scopeId || ownerScopeId.startsWith(`${scopeId}:`)) {
        disposeScope(ownerScopeId);
      }
    }
  }

  async function refreshDataSource(args: {
    id: string;
    scope?: ScopeRef;
  }): Promise<boolean> {
    if (args.scope) {
      const bucket = scopeEntries.get(args.scope.id);
      const entry = bucket?.get(args.id) ?? Array.from(bucket?.values() ?? []).find((candidate) => candidate.name === args.id);

      if (!entry) {
        return false;
      }

      await entry.controller.refresh();
      return true;
    }

    for (const bucket of scopeEntries.values()) {
      const entry = bucket.get(args.id) ?? Array.from(bucket.values()).find((candidate) => candidate.name === args.id);

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
    disposeScope,
    disposeScopeTree,
    getDebugSnapshot() {
      return {
        sources: Array.from(scopeEntries.values())
          .flatMap((bucket) => Array.from(bucket.values()))
          .map((entry) => {
            const state = entry.controller.getState();

            return {
              id: entry.id,
              scopeId: entry.ownerScopeId,
              name: entry.name,
              targetPath: entry.targetPath,
              statusPath: entry.statusPath,
              dependencies: entry.dependencies?.paths,
              started: state.started,
              loading: state.loading,
              stale: state.stale,
              hasValue: typeof state.value !== 'undefined',
              error: state.error instanceof Error ? state.error.message : typeof state.error === 'string' ? state.error : undefined
            };
          })
          .sort((left, right) => left.scopeId.localeCompare(right.scopeId) || left.id.localeCompare(right.id))
      };
    }
  };
}
