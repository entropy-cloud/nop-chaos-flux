import type {
  AsyncGovernanceStore,
  ApiSchema,
  DataSourceController,
  DataSourceRegistration,
  DataSourceSchema,
  RendererRuntime,
  ScopeDependencySet,
  ScopeRef
} from '@nop-chaos/flux-core';
import { normalizeRootPaths } from '@nop-chaos/flux-core';
import type { ApiCacheStore } from './api-cache';
import { createDataSourceController, createFormulaDataSourceController } from './data-source-runtime';
import { createRootDependencySet, filterScopeChangeByIgnoredRoots, scopeChangeHitsDependencies } from './scope-change';

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

function resolvePublishedTarget(schema: DataSourceSchema, fallbackId: string): string | undefined {
  if (typeof schema.name === 'string' && schema.name.length > 0) {
    return schema.name;
  }

  if ('api' in schema && schema.api) {
    return undefined;
  }

  return fallbackId;
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

function asOperationControl(value: unknown): import('@nop-chaos/flux-core').OperationControlConfig | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as import('@nop-chaos/flux-core').OperationControlConfig
    : undefined;
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
  asyncGovernance?: AsyncGovernanceStore;
  executeApiRequest: <T>(actionType: string, api: import('@nop-chaos/flux-core').ExecutableApiRequest, scope: ScopeRef, options?: { signal?: AbortSignal; control?: import('@nop-chaos/flux-core').OperationControlConfig }) => Promise<{ ok: boolean; status: number; data: T }>;
}): RuntimeSourceRegistry {
  const scopeEntries = new Map<string, Map<string, RuntimeSourceEntry>>();
  const nameIndex = new Map<string, RuntimeSourceEntry>();

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
          asyncGovernance: input.asyncGovernance,
          executeApiRequest: input.executeApiRequest,
          api: args.schema.api as ApiSchema,
          scope: args.scope,
          ownerId: `data-source:${ownerScopeId}:${args.id}`,
          targetPath,
          mergeToScope: args.schema.mergeToScope,
          resultMapping: args.schema.resultMapping,
          mergeStrategy: args.schema.mergeStrategy,
          mergeKey: args.schema.mergeKey,
          statusPath: args.schema.statusPath,
          interval: asNumber(args.schema.interval),
          stopWhen: asString(args.schema.stopWhen),
          silent: asBoolean(args.schema.silent),
          initialData: args.schema.initialData,
          control: asOperationControl(args.schema.control),
          onDependenciesChange(nextDependencies: ScopeDependencySet | undefined) {
            if (!explicitDependencies) {
              dependencies = nextDependencies;
            }
          }
        })
      : createFormulaDataSourceController({
          runtime: input.runtime,
          scope: args.scope,
          ownerId: `data-source:${ownerScopeId}:${args.id}`,
          asyncGovernance: input.asyncGovernance,
          targetPath,
          mergeToScope: args.schema.mergeToScope,
          resultMapping: args.schema.resultMapping,
          mergeStrategy: args.schema.mergeStrategy,
          mergeKey: args.schema.mergeKey,
          statusPath: args.schema.statusPath,
          formula: args.schema.formula,
          initialData: args.schema.initialData,
          onDependenciesChange(nextDependencies) {
            if (!explicitDependencies) {
              dependencies = nextDependencies;
            }
          }
        });

    const ignoredRootPaths = [targetPath, args.schema.statusPath].filter((value): value is string => Boolean(value));
    const ignoredRootsSet: Set<string> | undefined = ignoredRootPaths.length > 0 ? new Set(normalizeRootPaths(ignoredRootPaths)) : undefined;

    const unsubscribe = args.scope.store?.subscribe((change) => {
      if (disposed) {
        return;
      }

      const observedChange = ignoredRootsSet
        ? filterScopeChangeByIgnoredRoots(change, ignoredRootsSet)
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
        input.asyncGovernance?.clearOwner(`data-source:${ownerScopeId}:${args.id}`);
        if (entry.name && nameIndex.get(entry.name) === entry) {
          nameIndex.delete(entry.name);
        }
        if (currentBucket.size === 0) {
          scopeEntries.delete(ownerScopeId);
        }
      }
    };

    bucket.set(args.id, entry);
    if (entry.name) {
      nameIndex.set(entry.name, entry);
    }
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
      const entry = bucket.get(args.id);

      if (entry) {
        await entry.controller.refresh();
        return true;
      }
    }

    const namedEntry = nameIndex.get(args.id);
    if (namedEntry) {
      await namedEntry.controller.refresh();
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
              status: state.status,
              fetchStatus: state.fetchStatus,
              loading: state.fetchStatus === 'fetching',
              stale: state.stale,
              hasData: state.hasData,
              hasError: state.hasError,
              isInitialLoading: state.isInitialLoading,
              isRefreshing: state.isRefreshing,
              inFlightCount: state.inFlightCount,
              hasValue: typeof state.data !== 'undefined',
              error: state.error instanceof Error ? state.error.message : typeof state.error === 'string' ? state.error : undefined,
              async: state.async
            };
          })
          .sort((left, right) => left.scopeId.localeCompare(right.scopeId) || left.id.localeCompare(right.id))
      };
    }
  };
}
