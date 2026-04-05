import type {
  ApiObject,
  DataSourceController,
  DynamicRuntimeValue,
  RendererRuntime,
  RuntimeValueState,
  ScopeDependencySet,
  ScopeRef,
  StaticRuntimeValue
} from '@nop-chaos/flux-core';
import { resolveCacheKey, type ApiCacheStore } from './api-cache';
import { executeApiObject, prepareApiRequestForExecution } from './request-runtime';
import { collectRuntimeDependencies } from './node-runtime';

function isAbortError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      (((error as { name?: string }).name === 'AbortError') || ((error as { code?: string }).code === 'ABORT_ERR'))
  );
}

function writeDataToScope(scope: ScopeRef, dataPath: string | undefined, data: unknown): void {
  if (dataPath) {
    scope.update(dataPath, data);
    return;
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    scope.merge(data as Record<string, unknown>);
  }
}

export function trackApiRequestDependencies(input: {
  runtime: RendererRuntime;
  api: ApiObject;
  scope: ScopeRef;
  state?: RuntimeValueState<ApiObject>;
}): {
  resolvedApi: ApiObject;
  dependencies?: ScopeDependencySet;
} {
  const compiled = input.runtime.expressionCompiler.compileValue(input.api);

  if (compiled.isStatic) {
    return {
      resolvedApi: (compiled as StaticRuntimeValue<ApiObject>).value,
      dependencies: undefined
    };
  }

  const dynamicCompiled = compiled as DynamicRuntimeValue<ApiObject>;
  const runtimeState = input.state ?? dynamicCompiled.createState();
  const result = input.runtime.expressionCompiler.evaluateWithState(dynamicCompiled, input.scope, input.runtime.env, runtimeState);

  return {
    resolvedApi: result.value,
    dependencies: collectRuntimeDependencies(runtimeState)
  };
}

export function createDataSourceController(input: {
  runtime: RendererRuntime;
  apiCache: ApiCacheStore;
  executeApiRequest: <T>(actionType: string, api: ApiObject, scope: ScopeRef, options?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; data: T }>;
  api: ApiObject;
  scope: ScopeRef;
  dataPath?: string;
  interval?: number;
  stopWhen?: string;
  silent?: boolean;
  initialData?: unknown;
  onDependenciesChange?: (dependencies: ScopeDependencySet | undefined) => void;
}): DataSourceController {
  const {
    runtime,
    apiCache,
    executeApiRequest,
    api,
    scope,
    dataPath,
    interval,
    stopWhen,
    silent,
    initialData
  } = input;

  let started = false;
  let stopped = false;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let abortController: AbortController | undefined;
  let loading = false;
  let stale = false;
  let value: unknown = initialData;
  let error: unknown;
  const compiledApi = input.runtime.expressionCompiler.compileValue(api);
  const apiState: RuntimeValueState<ApiObject> | undefined = compiledApi.isStatic ? undefined : (compiledApi as DynamicRuntimeValue<ApiObject>).createState();

  function checkStopCondition(): boolean {
    if (!stopWhen || !interval) {
      return false;
    }

    try {
      return runtime.evaluate<boolean>(stopWhen, scope) ?? false;
    } catch {
      return false;
    }
  }

  async function runRequest(): Promise<void> {
    if (stopped) {
      return;
    }

    loading = true;
    stale = value !== undefined;
    error = undefined;

    abortController?.abort();
    abortController = new AbortController();
    const controller = abortController;

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
      const cacheKey = resolveCacheKey(preparedRequest.request);

      if (cacheKey) {
        const cached = apiCache.get<unknown>(cacheKey);

        if (cached) {
          await Promise.resolve();

          if (stopped || controller.signal.aborted) {
            return;
          }

          value = cached.data;
          loading = false;
          stale = false;
          writeDataToScope(scope, dataPath, cached.data);

          if (checkStopCondition()) {
            stop();
          }

          return;
        }
      }

      const response = await executeApiObject(trackedApi.resolvedApi, requestScope, runtime.env, runtime.expressionCompiler, {
        signal: controller.signal,
        evaluate: runtime.evaluate,
        preparedRequest,
        executor: (adaptedApi) => executeApiRequest('data-source', adaptedApi, requestScope, { signal: controller.signal })
      });

      if (stopped || controller.signal.aborted) {
        return;
      }

      if (cacheKey && api.cacheTTL && api.cacheTTL > 0) {
        apiCache.set(cacheKey, response.data, api.cacheTTL);
      }

      value = response.data;
      loading = false;
      stale = false;
      error = undefined;
      writeDataToScope(scope, dataPath, response.data);

      if (checkStopCondition()) {
        stop();
      }
    } catch (caughtError) {
      if (stopped || isAbortError(caughtError)) {
        return;
      }

      loading = false;
      stale = value !== undefined;
      error = caughtError;

      if (!silent) {
        const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
        runtime.env.notify('error', message);
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
      value = initialData;
      writeDataToScope(scope, dataPath, initialData);
    }

    void runRequest();

    if (interval && interval > 0) {
      pollTimer = setInterval(() => {
        void runRequest();
      }, interval);
    }
  }

  function stop(): void {
    stopped = true;

    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = undefined;
    }

    abortController?.abort();
    abortController = undefined;
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
    start,
    stop,
    refresh() {
      return runRequest();
    }
  };
}
