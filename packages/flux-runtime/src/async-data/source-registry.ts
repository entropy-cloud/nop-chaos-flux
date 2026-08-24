import type {
  AsyncGovernanceStore,
  CompiledDataSource,
  DataSourceController,
  DataSourceRefreshOutcome,
  DataSourceRefreshResult,
  DataSourceRegistration,
  RendererRuntime,
  ScopeChange,
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
  /** dashboard-filter 约定：消费端 action 源码中引用的 `filter.<key>` 集合。 */
  filterKeys: readonly string[];
  targetPath?: string;
  statusPath?: string;
  dispose(): void;
}

interface SourceCascadeState {
  depth: number;
}

const sourceCascadeTestState: SourceCascadeState = { depth: 0 };

/**
 * dashboard-filter 约定（`docs/components/dashboard-filter/design.md`）的 key
 * 失配诊断（Failure Path dashboard-filter-no-link）。触发条件：共享 `filter`
 * 对象已存在（筛选表单已写过值）且当前 scope 变更落在 `filter` 根上，但消费端
 * action 源码中引用的 `filter.<key>` 在 scope 中仍为 undefined——即筛选表单写入
 * 的 key 与消费端引用的 key 不一致。按 (sourceId, key) 一次性上报，避免重复刷屏。
 *
 * 注意：运行时依赖收集把表达式路径归一化到根（`filter.product` → `filter`），
 * 无法给出具体 key，故这里改为在注册期从 action 原始 schema 源码扫描
 * `\${filter?.key}` 引用（`CompiledActionNode.source` 保留作者原文）。
 */
const dashboardFilterMismatchReported = new Set<string>();

function extractFilterReferenceKeys(source: unknown): string[] {
  if (source == null) {
    return [];
  }
  let json: string;
  try {
    json = typeof source === 'string' ? source : JSON.stringify(source);
  } catch {
    return [];
  }
  const keys = new Set<string>();
  const pattern = /\$\{filter\??\.([A-Za-z_$][\w$]*)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(json)) !== null) {
    keys.add(match[1]);
  }
  return Array.from(keys);
}

function reportDashboardFilterKeyMismatch(
  sourceId: string,
  filterKeys: readonly string[],
  scope: ScopeRef,
  change: ScopeChange,
): void {
  if (filterKeys.length === 0 || !scope.has('filter')) {
    return;
  }
  const touchedFilterRoot = normalizeRootPaths(change.paths).some(
    (root) => root === 'filter' || root.startsWith('filter.'),
  );
  if (!touchedFilterRoot) {
    return;
  }
  for (const key of filterKeys) {
    if (scope.has(`filter.${key}`)) {
      continue;
    }
    const reportKey = `${sourceId}:filter.${key}`;
    if (dashboardFilterMismatchReported.has(reportKey)) {
      continue;
    }
    dashboardFilterMismatchReported.add(reportKey);
    console.warn(
      `[dashboard-filter-no-link] Data source "${sourceId}" references filter key "filter.${key}", which is not present in the shared filter scope. ` +
        'Align the key with the filter form (dashboard-filter convention: shared `filter.*` scope keys).',
    );
  }
}

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
  refreshDataSource(input: { name: string; scope?: ScopeRef }): Promise<DataSourceRefreshOutcome>;
  findFirstInScope(scope: ScopeRef): { name: string; scope: ScopeRef } | undefined;
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
          sendOn: compiled.sendOn,
          initFetch: compiled.initFetch,
          onSuccess: compiled.onSuccess,
          onError: compiled.onError,
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

      // dashboard-filter key mismatch diagnosis runs before the dependency hit
      // test: a mismatched key never hits the dependency set, so the linkage
      // break would otherwise be silent (stale all-data render, no warn).
      reportDashboardFilterKeyMismatch(args.id, entry.filterKeys, args.scope, observedChange);

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
        // Errors routed through registry error reporting — .catch and .finally handle all outcomes
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

    const filterKeys = isActionSource
      ? extractFilterReferenceKeys(compiled.action?.nodes?.[0]?.source)
      : [];

    const entry: RuntimeSourceEntry = {
      id: args.id,
      name: sourceName,
      ownerScopeId,
      scope: args.scope,
      controller,
      dependencies,
      filterKeys,
      targetPath,
      statusPath,
      dispose() {
        // Do NOT call clearOwner here. Under React.StrictMode, the in-flight
        // request may still be processing when dispose runs. clearOwner would
        // delete the owner, causing settleRun to recreate it with a fresh
        // activeHandles count, which breaks the second mount's isCurrentRun.
        // Instead, let beginRun on the second mount naturally supersede via
        // previousCurrent.supersededBy.

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

  /**
   * Run a controller refresh and normalize rejections (e.g. formula sources
   * whose re-evaluation throws) into the `ok: false` result channel so
   * `refreshDataSource` never rejects for request failures.
   */
  async function runControllerRefresh(entry: RuntimeSourceEntry): Promise<DataSourceRefreshResult> {
    try {
      return await entry.controller.refresh();
    } catch (error) {
      return { skipped: false, ok: false, error };
    }
  }

  async function refreshDataSource(args: { name: string; scope?: ScopeRef }): Promise<DataSourceRefreshOutcome> {
    if (args.scope) {
      const bucket = scopeEntries.get(args.scope.id);
      const entry = Array.from(bucket?.values() ?? []).find((candidate) => candidate.name === args.name);

      if (!entry) {
        return { found: false };
      }

      return { found: true, result: await runControllerRefresh(entry) };
    }

    for (const bucket of scopeEntries.values()) {
      const entry = Array.from(bucket.values()).find((candidate) => candidate.name === args.name);

      if (entry) {
        return { found: true, result: await runControllerRefresh(entry) };
      }
    }

    const namedEntry = nameIndex.get(args.name);
    if (namedEntry) {
      return { found: true, result: await runControllerRefresh(namedEntry) };
    }

    return { found: false };
  }

  /**
   * Returns the first registered source entry in the given scope's bucket, or
   * undefined if the scope owns no data source. Used by `refreshNearest` to
   * locate the closest refreshable data source without knowing its name.
   *
   * Like `refreshDataSource({ scope })`, this matches the scope's own bucket
   * only — it does NOT walk the parent scope chain. Callers responsible for
   * scope chain traversal (e.g. `refreshNearest`).
   */
  function findFirstInScope(
    scope: ScopeRef,
  ): { name: string; scope: ScopeRef } | undefined {
    const bucket = scopeEntries.get(scope.id);
    if (!bucket || bucket.size === 0) return undefined;
    for (const entry of bucket.values()) {
      if (entry.name) {
        return { name: entry.name, scope: entry.scope };
      }
    }
    return undefined;
  }

  return {
    registerDataSource,
    refreshDataSource,
    findFirstInScope,
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
