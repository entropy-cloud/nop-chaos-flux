import type {
  AsyncGovernanceStore,
  CompiledDataSource,
  DataSourceController,
  DataSourceRegistration,
  RendererRuntime,
  ScopeDependencySet,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { normalizeRootPaths } from '@nop-chaos/flux-core';

const MAX_SOURCE_CASCADE_DEPTH = 100;
import type { ApiCacheStore } from './api-cache.js';
import { reportRuntimeHostIssue } from '@nop-chaos/flux-core';
import {
  createDataSourceController,
  createFormulaDataSourceController,
} from './data-source-runtime.js';
import {
  createRootDependencySet,
  filterScopeChangeByIgnoredRoots,
  scopeChangeHitsDependencies,
} from '../scope-change.js';

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

interface SourceCascadeState {
  depth: number;
}

const sourceCascadeTestState: SourceCascadeState = { depth: 0 };

function tryEnterSourceCascade(state: SourceCascadeState): boolean {
  if (state.depth >= MAX_SOURCE_CASCADE_DEPTH) {
    return false;
  }

  state.depth += 1;
  return true;
}

function leaveSourceCascade(state: SourceCascadeState) {
  state.depth = Math.max(0, state.depth - 1);
}

export function __getSourceCascadeDepthForTests(): number {
  return sourceCascadeTestState.depth;
}

export function __setSourceCascadeDepthForTests(value: number) {
  sourceCascadeTestState.depth = Math.max(0, value);
}

function extractExpressionSource(
  compiled: import('@nop-chaos/flux-core').CompiledRuntimeValue<unknown> | undefined,
): string | undefined {
  if (!compiled || compiled.isStatic) return undefined;
  const node = compiled.node;
  if (node.kind === 'expression-node' || node.kind === 'template-node') {
    return node.source;
  }
  return undefined;
}

function extractFormulaValue(
  compiled: import('@nop-chaos/flux-core').CompiledRuntimeValue<unknown> | undefined,
): unknown {
  if (!compiled) return undefined;
  if (compiled.isStatic) return compiled.value;
  const source = extractExpressionSource(compiled);
  return source ?? undefined;
}

export interface RuntimeSourceRegistry {
  registerDataSource(input: {
    id: string;
    scope: ScopeRef;
    compiledSource: CompiledDataSource;
  }): DataSourceRegistration;
  refreshDataSource(input: { name: string; scope?: ScopeRef }): Promise<boolean>;
  disposeScope(scopeId: string): void;
  disposeScopeTree(scopeId: string): void;
  getDebugSnapshot(): import('@nop-chaos/flux-core').SourceRegistryDebugSnapshot;
}

export function createRuntimeSourceRegistry(input: {
  runtime: RendererRuntime;
  apiCache: ApiCacheStore;
  asyncGovernance?: AsyncGovernanceStore;
}): RuntimeSourceRegistry {
  const scopeEntries = new Map<string, Map<string, RuntimeSourceEntry>>();
  const nameIndex = new Map<string, RuntimeSourceEntry>();
  const cascadeState: SourceCascadeState = { depth: 0 };

  function registerDataSource(args: {
    id: string;
    scope: ScopeRef;
    compiledSource: CompiledDataSource;
  }): DataSourceRegistration {
    const ownerScopeId = args.scope.id;
    const bucket = scopeEntries.get(ownerScopeId) ?? new Map<string, RuntimeSourceEntry>();
    scopeEntries.set(ownerScopeId, bucket);

    const existing = bucket.get(args.id);
    if (existing) {
      existing.dispose();
    }

    const compiled = args.compiledSource;

    const evaluateCompiledValue = <T>(
      value: import('@nop-chaos/flux-core').CompiledRuntimeValue<T> | undefined,
    ): T | undefined => {
      if (!value) return undefined;
      if (value.isStatic) return value.value;
      return input.runtime.expressionCompiler.evaluateValue(value, args.scope, input.runtime.env);
    };

    const dependsOn = compiled.dependsOn;
    const explicitDependencies = createRootDependencySet(dependsOn);
    let dependencies: ScopeDependencySet | undefined = explicitDependencies;

    const targetPath = evaluateCompiledValue(compiled.targetPath) ?? args.id;
    const statusPath = evaluateCompiledValue(compiled.statusPath);

    const isActionSource = compiled.kind === 'action';

    const controller = isActionSource
      ? createDataSourceController({
          runtime: input.runtime,
          apiCache: input.apiCache,
          asyncGovernance: input.asyncGovernance,
          action: compiled.action!,
          dispatch: input.runtime.dispatch,
          scope: args.scope,
          ownerId: `data-source:${ownerScopeId}:${args.id}`,
          targetPath,
          mergeToScope: evaluateCompiledValue(compiled.mergeToScope),
          compiledResultMapping: compiled.resultMapping,
          mergeStrategy: evaluateCompiledValue(compiled.mergeStrategy),
          mergeKey: evaluateCompiledValue(compiled.mergeKey),
          statusPath,
          interval: evaluateCompiledValue(compiled.interval),
          stopWhen: compiled.stopWhen as import('@nop-chaos/flux-core').CompiledRuntimeValue<boolean> | undefined,
          silent: evaluateCompiledValue(compiled.silent),
          initialData: evaluateCompiledValue(compiled.initialData),
          control: compiled.control
            ? {
                dedup: compiled.control.dedup,
                retry: compiled.control.retry,
                throttle: compiled.control.throttle,
                cacheTTL: compiled.control.cacheTTL,
                cacheKey: compiled.control.cacheKey,
              }
            : undefined,
          onDependenciesChange(nextDependencies: ScopeDependencySet | undefined) {
            if (!explicitDependencies) {
              dependencies = nextDependencies;
            }
          },
        })
      : createFormulaDataSourceController({
          runtime: input.runtime,
          scope: args.scope,
          ownerId: `data-source:${ownerScopeId}:${args.id}`,
          asyncGovernance: input.asyncGovernance,
          targetPath,
          mergeToScope: evaluateCompiledValue(compiled.mergeToScope),
          compiledResultMapping: compiled.resultMapping,
          mergeStrategy: evaluateCompiledValue(compiled.mergeStrategy),
          mergeKey: evaluateCompiledValue(compiled.mergeKey),
          statusPath,
          formula: extractFormulaValue(compiled.formula),
          initialData: evaluateCompiledValue(compiled.initialData),
          onDependenciesChange(nextDependencies) {
            if (!explicitDependencies) {
              dependencies = nextDependencies;
            }
          },
        });

    const ignoredRootPaths = [targetPath, statusPath].filter((value): value is string =>
      Boolean(value),
    );
    const ignoredRootsSet: Set<string> | undefined =
      ignoredRootPaths.length > 0 ? new Set(normalizeRootPaths(ignoredRootPaths)) : undefined;

    const abortController = new AbortController();

    function reportRefreshFailure(error: unknown) {
      reportRuntimeHostIssue({
        env: input.runtime.env,
        level: 'error',
        message: `Data source refresh failed: ${args.id}`,
        error,
        phase: 'api',
        details: {
          sourceId: args.id,
          ownerScopeId,
          targetPath,
          statusPath,
        },
      });
    }

    const unsubscribe = args.scope.store?.subscribe((change) => {
      if (abortController.signal.aborted) {
        return;
      }

      if (!dependencies) {
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

      if (!tryEnterSourceCascade(cascadeState)) {
        reportRuntimeHostIssue({
          env: input.runtime.env,
          level: 'error',
          message: 'Source cascade depth limit exceeded',
          error: new Error('Source cascade depth limit exceeded'),
          phase: 'api',
          details: {
            reason: 'source-cascade-depth-limit',
            sourceId: args.id,
            ownerScopeId,
          },
        });
        return;
      }

      try {
        const refreshPromise = controller.refresh();
        void refreshPromise
          .catch((error) => {
            reportRefreshFailure(error);
          })
          .finally(() => {
            leaveSourceCascade(cascadeState);
          });
      } catch (error) {
        leaveSourceCascade(cascadeState);
        reportRefreshFailure(error);
      }
    });

    const sourceName = compiled.targetPath?.isStatic ? compiled.targetPath.value : undefined;

    const entry: RuntimeSourceEntry = {
      id: args.id,
      name: sourceName,
      ownerScopeId,
      scope: args.scope,
      controller,
      dependencies,
      targetPath,
      statusPath,
      dispose() {
        if (abortController.signal.aborted) {
          return;
        }

        abortController.abort();
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
      },
    };

    bucket.set(args.id, entry);
    if (entry.name) {
      nameIndex.set(entry.name, entry);
    }
    controller.start();

    return {
      id: args.id,
      controller,
      dispose: () => entry.dispose(),
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

  async function refreshDataSource(args: { name: string; scope?: ScopeRef }): Promise<boolean> {
    if (args.scope) {
      const bucket = scopeEntries.get(args.scope.id);
      const entry = Array.from(bucket?.values() ?? []).find((candidate) => candidate.name === args.name);

      if (!entry) {
        return false;
      }

      await entry.controller.refresh();
      return true;
    }

    for (const bucket of scopeEntries.values()) {
      const entry = Array.from(bucket.values()).find((candidate) => candidate.name === args.name);

      if (entry) {
        await entry.controller.refresh();
        return true;
      }
    }

    const namedEntry = nameIndex.get(args.name);
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
              error:
                state.error instanceof Error
                  ? state.error.message
                  : typeof state.error === 'string'
                    ? state.error
                    : undefined,
              async: state.async,
            };
          })
          .sort(
            (left, right) =>
              left.scopeId.localeCompare(right.scopeId) || left.id.localeCompare(right.id),
          ),
      };
    },
  };
}
