import { useEffect, useRef } from 'react';
import type { ApiObject, DataSourceSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererEnv, useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';
import { createApiCacheStore, executeApiObject, resolveCacheKey } from '@nop-chaos/flux-runtime';

const globalApiCache = createApiCacheStore();

export function DataSourceRenderer(props: RendererComponentProps<DataSourceSchema>) {
  const runtime = useRendererRuntime();
  const env = useRendererEnv();
  const scope = useRenderScope();
  const schema = props.schema;
  const api = props.props.api as ApiObject;
  const dataPath = schema.dataPath;
  const interval = schema.interval;
  const stopWhen = schema.stopWhen;
  const silent = schema.silent === true;
  const initialData = schema.initialData;

  const pollingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    const writeToScope = (data: unknown): void => {
      if (dataPath) {
        scope.update(dataPath, data);
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        scope.merge(data as Record<string, unknown>);
      }
    };

    const checkStopCondition = (): boolean => {
      if (!stopWhen || !interval) return false;
      try {
        return runtime.evaluate<boolean>(stopWhen, scope) ?? false;
      } catch {
        return false;
      }
    };

    if (initialData !== undefined) {
      writeToScope(initialData);
    }

    const executeRequest = async (): Promise<void> => {
      if (!mountedRef.current) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const cacheKey = resolveCacheKey(api);

        if (cacheKey) {
          const cached = globalApiCache.get<unknown>(cacheKey);
          if (cached) {
            await Promise.resolve();
            if (!mountedRef.current) return;
            if (controller.signal.aborted) return;
            writeToScope(cached.data);
            if (checkStopCondition()) {
              pollingRef.current = false;
            }
            return;
          }
        }

        const requestScope = props.helpers.createScope({});
        const result = await executeApiObject(api, requestScope, env, runtime.expressionCompiler, { signal: controller.signal });

        if (!mountedRef.current) return;

        if (controller.signal.aborted) return;

        const responseData = result.data;

        if (cacheKey && api.cacheTTL && api.cacheTTL > 0) {
          globalApiCache.set(cacheKey, responseData, api.cacheTTL);
        }

        writeToScope(responseData);

        if (checkStopCondition()) {
          pollingRef.current = false;
        }
      } catch (err) {
        if (!mountedRef.current) return;

        if (err && typeof err === 'object' && ((err as { name?: string }).name === 'AbortError' || (err as { code?: string }).code === 'ABORT_ERR')) {
          return;
        }

        if (!silent) {
          const message = err instanceof Error ? err.message : String(err);
          env.notify('error', message);
        }
      }
    };

    void executeRequest();

    if (interval && interval > 0) {
      pollingRef.current = true;
      const pollInterval = setInterval(() => {
        if (pollingRef.current && mountedRef.current) {
          void executeRequest();
        }
      }, interval);

      return () => {
        pollingRef.current = false;
        mountedRef.current = false;
        clearInterval(pollInterval);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [api, interval, stopWhen, silent, dataPath, runtime, env, props.helpers, scope, initialData]);

  return null;
}
