import {
  reportRuntimeHostIssue,
  type AsyncGovernanceStore,
  type CompiledApiConfig,
  type CompiledRuntimeValue,
  type DataSourceController,
  type DataSourceState,
  type OperationControlConfig,
  type RendererRuntime,
  type ScopeDependencySet,
  type ScopeRef
} from '@nop-chaos/flux-core';
import { resolveCacheKey, type ApiCacheStore } from './api-cache';
import {
  createInitialDataSourceState,
  deriveDataSourceState,
  structuralShareData,
  writeStatusToScope
} from './data-source-state';
import {
  applyResultMapping,
  createApiConfigRuntimeState,
  evaluateCompiledApiConfig,
  writeDataToScope,
  type ApiConfigRuntimeState
} from './data-source-runtime-utils';
import {
  abortActiveControllers,
  toActiveRequestState,
  toErrorDataSourceState,
  toIdleFetchState,
  toStopConditionErrorState,
  toSuccessDataSourceState
} from './api-data-source-controller-helpers';
import { isAbortError } from '../error-utils';
import { executeApiSchema, prepareApiRequestForExecution } from './request-runtime';

export function createDataSourceController(input: {
  runtime: RendererRuntime;
  apiCache: ApiCacheStore;
  executeApiRequest: <T>(actionType: string, api: import('@nop-chaos/flux-core').ExecutableApiRequest, scope: ScopeRef, options?: { signal?: AbortSignal; control?: import('@nop-chaos/flux-core').OperationControlConfig }) => Promise<{ ok: boolean; status: number; data: T }>;
  compiledApi: CompiledApiConfig;
  scope: ScopeRef;
  ownerId?: string;
  asyncGovernance?: AsyncGovernanceStore;
  targetPath?: string;
  mergeToScope?: boolean;
  compiledResultMapping?: CompiledRuntimeValue<unknown>;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
  statusPath?: string;
  interval?: number;
  stopWhen?: string;
  silent?: boolean;
  initialData?: unknown;
  control?: OperationControlConfig;
  onDependenciesChange?: (dependencies: ScopeDependencySet | undefined) => void;
}): DataSourceController {
  const {
    runtime,
    apiCache,
    executeApiRequest,
    compiledApi,
    scope,
    targetPath,
    mergeToScope,
    compiledResultMapping,
    mergeStrategy,
    mergeKey,
    statusPath,
    interval,
    stopWhen,
    silent,
    initialData,
    control
  } = input;

  let started = false;
  let stopped = false;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let abortController: AbortController | undefined;
  const activeControllers = new Set<AbortController>();
  let pendingRefresh = false;
  let activeRequestCount = 0;
  let nextRequestSequence = 0;
  let latestSettledRequestSequence = 0;
  let state = createInitialDataSourceState(initialData);
  const apiConfigState: ApiConfigRuntimeState = createApiConfigRuntimeState(compiledApi, runtime);
  const refreshDedup = control?.dedup ?? compiledApi.dedupStrategy ?? 'cancel-previous';
  const asyncOwnerId = input.ownerId;

  function updateAsyncState(nextState: DataSourceState): DataSourceState {
    if (!asyncOwnerId || !input.asyncGovernance) {
      return nextState;
    }

    return {
      ...nextState,
      async: input.asyncGovernance.getOwnerState(asyncOwnerId)
    };
  }

  function hasActiveRequest(): boolean {
    return activeRequestCount > 0;
  }

  function settleRunIfNeeded(
    run: import('@nop-chaos/flux-core').AsyncRunHandle | undefined,
    requestSequence: number,
    settled: import('@nop-chaos/flux-core').SettleAsyncRunInput
  ) {
    if (!run || !input.asyncGovernance) {
      return undefined;
    }

    if (!input.asyncGovernance.isCurrentRun(run)) {
      return requestSequence < latestSettledRequestSequence
        ? input.asyncGovernance.settleRun(run, settled)
        : undefined;
    }

    return input.asyncGovernance.settleRun(run, settled);
  }

  function publishState() {
    writeStatusToScope(scope, statusPath, state);
  }

  function updateState(updater: (current: DataSourceState) => DataSourceState): DataSourceState {
    state = updateAsyncState(deriveDataSourceState(updater(state)));
    publishState();
    return state;
  }

  function publishData(nextData: unknown): void {
    if (targetPath) {
      const currentValue = scope.get(targetPath);
      const safeForSharing = !mergeStrategy || mergeStrategy === 'replace';
      const effectiveData = safeForSharing ? structuralShareData(currentValue, nextData) : nextData;

      if (safeForSharing && Object.is(currentValue, effectiveData)) {
        return;
      }

      writeDataToScope({ scope, targetPath, mergeToScope, mergeStrategy, mergeKey, data: effectiveData });
      return;
    }

    writeDataToScope({ scope, targetPath, mergeToScope, mergeStrategy, mergeKey, data: nextData });
  }

  function checkStopCondition(): boolean {
    if (!stopWhen || !interval) {
      return false;
    }

    try {
      return runtime.evaluate<boolean>(stopWhen, scope) ?? false;
    } catch (error) {
      updateState((current) => toStopConditionErrorState(current, error));
      if (!silent) {
        reportRuntimeHostIssue({
          env: runtime.env,
          error,
          phase: 'api'
        });
      }
      stop();
      return true;
    }
  }

  async function runRequest(): Promise<void> {
    if (stopped) {
      return;
    }

    if (hasActiveRequest()) {
      if (refreshDedup === 'ignore-new') {
        return;
      }

      if (refreshDedup === 'parallel') {
        pendingRefresh = false;
      } else {
        pendingRefresh = true;
        abortController?.abort();
        return;
      }
    }

    pendingRefresh = false;

    const run = asyncOwnerId && input.asyncGovernance
      ? input.asyncGovernance.beginRun({
          ownerKind: 'data-source',
          ownerId: asyncOwnerId,
          scopeId: scope.id,
          cause: started ? 'refresh' : 'start'
        })
      : undefined;

    updateState((current) => ({
      ...current,
      inFlightCount: current.inFlightCount + 1,
      fetchStatus: 'fetching',
      status: typeof current.data === 'undefined' ? 'pending' : current.status,
      stale: typeof current.data !== 'undefined',
      error: undefined
    }));

    if (refreshDedup === 'cancel-previous') {
      abortController?.abort();
    }
    abortController = new AbortController();
    const controller = abortController;
    const requestSequence = ++nextRequestSequence;
    activeControllers.add(controller);
    activeRequestCount += 1;

    try {
      const requestScope = runtime.createChildScope(scope, {}, { source: 'custom', pathSuffix: 'data-source-request' });
      const trackedApi = evaluateCompiledApiConfig({
        compiledApi,
        scope,
        runtime,
        state: apiConfigState
      });
      input.onDependenciesChange?.(trackedApi.dependencies);
      const preparedRequest = prepareApiRequestForExecution(trackedApi.resolvedApi, requestScope, runtime.env, runtime.expressionCompiler);
      const cacheKey = resolveCacheKey(preparedRequest.request, trackedApi.resolvedApi);

        if (cacheKey) {
          const cached = apiCache.get<unknown>(cacheKey);

          if (cached) {
            await Promise.resolve();

            if (stopped || controller.signal.aborted) {
              if (run && input.asyncGovernance) {
                input.asyncGovernance.settleRun(run, {
                  outcome: 'cancelled',
                  cancelled: true
                });
              }
              if (!stopped && pendingRefresh) {
                updateState((current) => toIdleFetchState(current));
              }
              updateState((current) => current);
              return;
            }

            const settledRun = settleRunIfNeeded(run, requestSequence, { outcome: 'succeeded' });

            if (settledRun?.outcome === 'stale-dropped') {
              updateState((current) => current);
              return;
            }

            const mappedValue = applyResultMapping({
            runtime,
            scope,
            compiledResultMapping,
            payload: cached.data
          });

            publishData(mappedValue);
            latestSettledRequestSequence = Math.max(latestSettledRequestSequence, requestSequence);
            updateState((current) => toSuccessDataSourceState(current, mappedValue));

            if (checkStopCondition()) {
              stop();
            }

            updateState((current) => current);

            return;
          }
      }

      const response = await executeApiSchema(trackedApi.resolvedApi, requestScope, runtime.env, runtime.expressionCompiler, {
        signal: controller.signal,
        evaluate: runtime.evaluate,
        preparedRequest,
        executor: (adaptedApi) => executeApiRequest('data-source', adaptedApi, requestScope, {
          signal: controller.signal,
          control
        }),
        control
      });

      if (stopped || controller.signal.aborted) {
        if (run && input.asyncGovernance) {
          input.asyncGovernance.settleRun(run, {
            outcome: 'cancelled',
            cancelled: true
          });
        }
        if (!stopped && pendingRefresh) {
          updateState((current) => toIdleFetchState(current));
        }
        updateState((current) => current);
        return;
      }

      const settledRun = settleRunIfNeeded(run, requestSequence, { outcome: 'succeeded' });

      if (settledRun?.outcome === 'stale-dropped') {
        updateState((current) => current);
        return;
      }

      latestSettledRequestSequence = Math.max(latestSettledRequestSequence, requestSequence);

      if (cacheKey && compiledApi.cacheTTL && compiledApi.cacheTTL > 0) {
        apiCache.set(cacheKey, response.data, compiledApi.cacheTTL);
      }

      const mappedValue = applyResultMapping({
        runtime,
        scope,
        compiledResultMapping,
        payload: response.data
      });

      publishData(mappedValue);
      updateState((current) => toSuccessDataSourceState(current, mappedValue));

      if (checkStopCondition()) {
        stop();
      }

      updateState((current) => current);
    } catch (caughtError) {
      if (stopped || isAbortError(caughtError)) {
        if (run && input.asyncGovernance) {
          input.asyncGovernance.settleRun(run, {
            outcome: 'cancelled',
            cancelled: true,
            error: caughtError
          });
        }
        if (!stopped && pendingRefresh) {
          updateState((current) => toIdleFetchState(current));
        }
        updateState((current) => current);
        return;
      }

      const settledRun = settleRunIfNeeded(run, requestSequence, {
        outcome: 'failed',
        error: caughtError
      });

      if (settledRun?.outcome === 'stale-dropped') {
        updateState((current) => current);
        return;
      }

      // Ignore failures only for truly stale older requests that were already superseded
      // by a later settled request. If the same request sequence already marked success and
      // then mapping/publish failed, we still need to surface that failure state and telemetry.
      if (run && input.asyncGovernance && !input.asyncGovernance.isCurrentRun(run) && !settledRun && requestSequence < latestSettledRequestSequence) {
        updateState((current) => current);
        return;
      }

      updateState((current) => toErrorDataSourceState(current, caughtError));

      if (!silent) {
        reportRuntimeHostIssue({
          env: runtime.env,
          error: caughtError,
          phase: 'api'
        });
      }

      updateState((current) => current);
    } finally {
      activeControllers.delete(controller);
      activeRequestCount = Math.max(0, activeRequestCount - 1);

      if (run && input.asyncGovernance && !input.asyncGovernance.isCurrentRun(run) && requestSequence < latestSettledRequestSequence) {
        input.asyncGovernance.settleRun(run, { outcome: 'succeeded' });
        updateState((current) => current);
      }

      if (abortController === controller) {
        abortController = undefined;
      }

      if (!stopped && (state.inFlightCount !== activeRequestCount || state.fetchStatus !== (activeRequestCount > 0 ? 'fetching' : 'idle'))) {
        updateState((current) => toActiveRequestState(current, activeRequestCount));
      }

      if (!stopped && pendingRefresh) {
        void runRequest();
      }
    }
  }

  function start(): void {
    if (started) {
      return;
    }

    started = true;
    stopped = false;

    if (initialData !== undefined) {
      publishData(initialData);
    }

    updateState((current) => ({
      ...current,
      started,
      status: typeof current.data === 'undefined' ? 'idle' : current.status
    }));

    void runRequest();

    if (interval && interval > 0) {
      schedulePoll();
    }
  }

  function schedulePoll(): void {
    if (stopped || !interval || interval <= 0) return;
    pollTimer = setTimeout(() => {
      void runRequest().finally(() => {
        if (!stopped) schedulePoll();
      });
    }, interval);
  }

  function stop(): void {
    stopped = true;

    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = undefined;
    }

    abortActiveControllers(activeControllers);
    abortController = undefined;
    activeRequestCount = 0;
    updateState((current) => ({
      ...current,
      inFlightCount: 0,
      fetchStatus: 'idle'
    }));
  }

  return {
    getState() {
      return state;
    },
    start,
    stop,
    refresh() {
      return runRequest();
    },
    reset() {
      stopped = true;

      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = undefined;
      }

      abortActiveControllers(activeControllers);
      abortController = undefined;
      activeRequestCount = 0;

      if (targetPath) {
        scope.update(targetPath, undefined);
      }

      const initialState = createInitialDataSourceState(undefined);
      updateState(() => initialState);
    }
  };
}
