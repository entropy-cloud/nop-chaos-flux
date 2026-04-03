import type { ApiObject, DataSourceController, RendererRuntime, ScopeRef } from '@nop-chaos/flux-core';
import { resolveCacheKey, type ApiCacheStore } from './api-cache';
import { executeApiObject } from './request-runtime';

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

    abortController?.abort();
    abortController = new AbortController();
    const controller = abortController;

    try {
      const cacheKey = resolveCacheKey(api);

      if (cacheKey) {
        const cached = apiCache.get<unknown>(cacheKey);

        if (cached) {
          await Promise.resolve();

          if (stopped || controller.signal.aborted) {
            return;
          }

          writeDataToScope(scope, dataPath, cached.data);

          if (checkStopCondition()) {
            stop();
          }

          return;
        }
      }

      const requestScope = runtime.createChildScope(scope, {}, { source: 'custom', pathSuffix: 'data-source-request' });
      const response = await executeApiObject(api, requestScope, runtime.env, runtime.expressionCompiler, {
        signal: controller.signal,
        executor: (adaptedApi) => executeApiRequest('data-source', adaptedApi, requestScope, { signal: controller.signal })
      });

      if (stopped || controller.signal.aborted) {
        return;
      }

      if (cacheKey && api.cacheTTL && api.cacheTTL > 0) {
        apiCache.set(cacheKey, response.data, api.cacheTTL);
      }

      writeDataToScope(scope, dataPath, response.data);

      if (checkStopCondition()) {
        stop();
      }
    } catch (error) {
      if (stopped || isAbortError(error)) {
        return;
      }

      if (!silent) {
        const message = error instanceof Error ? error.message : String(error);
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
    start,
    stop,
    refresh() {
      return runRequest();
    }
  };
}
