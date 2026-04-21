import type {
  AsyncGovernanceStore,
  ActionContext,
  ActionResult,
  ActionSchema,
  ApiSchema,
  DataSourceController,
  DataSourceState,
  DynamicRuntimeValue,
  OperationControlConfig,
  RendererRuntime,
  RuntimeValueState,
  ScopeDependencySet,
  ScopeRef,
  StaticRuntimeValue
} from '@nop-chaos/flux-core';
import { resolveCacheKey, type ApiCacheStore } from './api-cache';
import {
  createInitialDataSourceState,
  deriveDataSourceState,
  nextFailureCount,
  structuralShareData,
  toNextDataSourceState,
  writeStatusToScope
} from './data-source-state';
import {
  applyResultMapping,
  collectRuntimeDependencies,
  trackApiRequestDependencies,
  writeDataToScope
} from './data-source-runtime-utils';
import { isAbortError } from './error-utils';
import { executeApiSchema, prepareApiRequestForExecution } from './request-runtime';

export function createFormulaDataSourceController(input: {
  runtime: RendererRuntime;
  scope: ScopeRef;
  ownerId?: string;
  asyncGovernance?: AsyncGovernanceStore;
  targetPath?: string;
  mergeToScope?: boolean;
  resultMapping?: unknown;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
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
  let state = createInitialDataSourceState(input.initialData);
  const asyncOwnerId = input.ownerId;

  function updateAsyncState() {
    if (!asyncOwnerId || !input.asyncGovernance) {
      return;
    }

    state = {
      ...state,
      async: input.asyncGovernance.getOwnerState(asyncOwnerId)
    };
  }

  function updateState(updater: (current: DataSourceState) => DataSourceState): DataSourceState {
    state = deriveDataSourceState(updater(state));
    updateAsyncState();
    writeStatusToScope(input.scope, input.statusPath, state);
    return state;
  }

  function publish(): void {
    if (stopped) {
      return;
    }

    const run = asyncOwnerId && input.asyncGovernance
      ? input.asyncGovernance.beginRun({
          ownerKind: 'data-source',
          ownerId: asyncOwnerId,
          scopeId: input.scope.id,
          cause: started ? 'refresh' : 'start'
        })
      : undefined;

    updateState((current) => ({
      ...toNextDataSourceState(current, {
        fetchStatus: 'fetching',
        status: typeof current.data === 'undefined' ? 'pending' : current.status,
        stale: typeof current.data !== 'undefined',
        error: undefined
      })
    }));

    const rawValue = dynamicCompiled
      ? input.runtime.expressionCompiler.evaluateWithState(dynamicCompiled, input.scope, input.runtime.env, runtimeState!).value
      : staticCompiled?.value;
    const nextValue = applyResultMapping({
      runtime: input.runtime,
      scope: input.scope,
      resultMapping: input.resultMapping,
      payload: rawValue
    });

    input.onDependenciesChange?.(collectRuntimeDependencies(runtimeState));

    if (run && input.asyncGovernance && !input.asyncGovernance.isCurrentRun(run)) {
      input.asyncGovernance.settleRun(run, { outcome: 'succeeded' });
      updateState((current) => current);
      return;
    }

    writeDataToScope({
      scope: input.scope,
      targetPath: input.targetPath,
      mergeToScope: input.mergeToScope,
      mergeStrategy: input.mergeStrategy,
      mergeKey: input.mergeKey,
      data: nextValue
    });

    updateState((current) => ({
      ...current,
      status: 'success',
      fetchStatus: 'idle',
      stale: false,
      data: nextValue,
      error: undefined,
      dataUpdatedAt: Date.now(),
      failureCount: 0,
      failureReason: undefined
    }));

    if (run && input.asyncGovernance) {
      input.asyncGovernance.settleRun(run, { outcome: 'succeeded' });
      updateState((current) => current);
    }
  }

  return {
    getState() {
      return state;
    },
    start() {
      if (started) {
        return;
      }

      started = true;
      stopped = false;

      if (input.initialData !== undefined) {
        writeDataToScope({
          scope: input.scope,
          targetPath: input.targetPath,
          mergeToScope: input.mergeToScope,
          mergeStrategy: input.mergeStrategy,
          mergeKey: input.mergeKey,
          data: input.initialData
        });
      }

      updateState((current) => ({
        ...current,
        started: true
      }));

      void Promise.resolve().then(() => {
        publish();
      });
    },
    stop() {
      stopped = true;
      updateState((current) => ({
        ...current,
        fetchStatus: 'idle'
      }));
    },
    async refresh() {
      publish();
    },
    reset() {
      stopped = true;
      if (input.targetPath) {
        input.scope.update(input.targetPath, undefined);
      }
      const initialState = createInitialDataSourceState(undefined);
      updateState(() => initialState);
    }
  };
}

export function createDataSourceController(input: {
  runtime: RendererRuntime;
  apiCache: ApiCacheStore;
  executeApiRequest: <T>(actionType: string, api: import('@nop-chaos/flux-core').ExecutableApiRequest, scope: ScopeRef, options?: { signal?: AbortSignal; control?: import('@nop-chaos/flux-core').OperationControlConfig }) => Promise<{ ok: boolean; status: number; data: T }>;
  api: ApiSchema;
  scope: ScopeRef;
  ownerId?: string;
  asyncGovernance?: AsyncGovernanceStore;
  targetPath?: string;
  mergeToScope?: boolean;
  resultMapping?: unknown;
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
    api,
    scope,
    targetPath,
    mergeToScope,
    resultMapping,
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
  const compiledApi = input.runtime.expressionCompiler.compileValue(api);
  const apiState: RuntimeValueState<ApiSchema> | undefined = compiledApi.isStatic ? undefined : (compiledApi as DynamicRuntimeValue<ApiSchema>).createState();
  const refreshDedup = control?.dedup ?? api.dedupStrategy ?? 'cancel-previous';
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
      updateState((current) => ({
        ...current,
        status: typeof current.data === 'undefined' ? 'error' : current.status,
        fetchStatus: 'idle',
        stale: typeof current.data !== 'undefined',
        error,
        errorUpdatedAt: Date.now(),
        failureCount: nextFailureCount(current.failureCount),
        failureReason: error
      }));
      if (!silent) {
        const message = error instanceof Error ? error.message : String(error);
        runtime.env.notify('error', message);
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
      const trackedApi = trackApiRequestDependencies({
        runtime,
        api,
        scope,
        state: apiState
      });
      input.onDependenciesChange?.(trackedApi.dependencies);
      const preparedRequest = prepareApiRequestForExecution(trackedApi.resolvedApi, requestScope, runtime.env, runtime.expressionCompiler);
      const cacheKey = resolveCacheKey(preparedRequest.request, api);

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
                updateState((current) => ({
                  ...current,
                fetchStatus: 'idle'
              }));
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
            resultMapping,
            payload: cached.data
          });

            publishData(mappedValue);
            latestSettledRequestSequence = Math.max(latestSettledRequestSequence, requestSequence);
            updateState((current) => {
            const sharedData = structuralShareData(current.data, mappedValue);
            return {
              ...current,
              status: 'success',
              inFlightCount: Math.max(0, current.inFlightCount - 1),
              fetchStatus: 'idle',
              stale: false,
              data: sharedData,
              error: undefined,
              dataUpdatedAt: Object.is(sharedData, current.data) ? current.dataUpdatedAt : Date.now(),
              errorUpdatedAt: current.errorUpdatedAt,
              failureCount: 0,
              failureReason: undefined
            };
          });

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
          updateState((current) => ({
            ...toNextDataSourceState(current, {
            fetchStatus: 'idle'
            })
          }));
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

      if (cacheKey && api.cacheTTL && api.cacheTTL > 0) {
        apiCache.set(cacheKey, response.data, api.cacheTTL);
      }

      const mappedValue = applyResultMapping({
        runtime,
        scope,
        resultMapping,
        payload: response.data
      });

      publishData(mappedValue);
      updateState((current) => {
        const sharedData = structuralShareData(current.data, mappedValue);
        return {
          ...current,
            status: 'success',
            inFlightCount: Math.max(0, current.inFlightCount - 1),
            fetchStatus: 'idle',
            stale: false,
            data: sharedData,
          error: undefined,
          dataUpdatedAt: Object.is(sharedData, current.data) ? current.dataUpdatedAt : Date.now(),
          errorUpdatedAt: current.errorUpdatedAt,
          failureCount: 0,
          failureReason: undefined
        };
      });

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
          updateState((current) => ({
            ...current,
            fetchStatus: 'idle'
          }));
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

      if (run && input.asyncGovernance && !input.asyncGovernance.isCurrentRun(run) && !settledRun) {
        updateState((current) => current);
        return;
      }

      updateState((current) => ({
        ...current,
        inFlightCount: Math.max(0, current.inFlightCount - 1),
        status: typeof current.data === 'undefined' ? 'error' : current.status,
        fetchStatus: 'idle',
        stale: typeof current.data !== 'undefined',
        error: caughtError,
        errorUpdatedAt: Date.now(),
        failureCount: nextFailureCount(current.failureCount),
        failureReason: caughtError
      }));

      if (!silent) {
        const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
        runtime.env.notify('error', message);
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
        updateState((current) => ({
          ...toNextDataSourceState(current, {
          inFlightCount: activeRequestCount,
          fetchStatus: activeRequestCount > 0 ? 'fetching' : 'idle'
          })
        }));
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

    for (const controller of activeControllers) {
      controller.abort();
    }
    activeControllers.clear();
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

      for (const controller of activeControllers) {
        controller.abort();
      }
      activeControllers.clear();
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

export function createSourceExecutor(input: {
  runtime: RendererRuntime;
  executeAction: (action: ActionSchema, ctx: ActionContext) => Promise<ActionResult>;
}) {
  return async function executeSource(source: import('@nop-chaos/flux-core').SourceSchema, scope: ScopeRef, ctx?: Partial<ActionContext>) {
    if (source.formula !== undefined) {
      const value = input.runtime.evaluate(source.formula, scope);
      return { ok: true, data: value };
    }

    if (!source.action && source.api === undefined) {
      return { ok: false, error: new Error('Source requires action or formula') };
    }

    const actionInput: ActionSchema = source.api !== undefined
      ? {
          ...source,
          action: source.action ?? 'ajax',
          args: source.api
        }
      : source as ActionSchema;

    const result = await input.executeAction(actionInput, {
      runtime: input.runtime,
      scope,
      ...ctx
    });

    return result;
  };
}
