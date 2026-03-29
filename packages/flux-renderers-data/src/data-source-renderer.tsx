import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ApiObject, DataSourceSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererEnv, useRendererRuntime } from '@nop-chaos/flux-react';
import { createApiCacheStore, resolveCacheKey } from '@nop-chaos/flux-runtime';

const globalApiCache = createApiCacheStore();

type DataSourceState = {
  loading: boolean;
  error: unknown;
  data: unknown;
};

export function DataSourceRenderer(props: RendererComponentProps<DataSourceSchema>) {
  const runtime = useRendererRuntime();
  const env = useRendererEnv();
  const schema = props.schema;
  const api = schema.api;
  const dataPath = schema.dataPath;
  const interval = schema.interval;
  const stopWhen = schema.stopWhen;
  const silent = schema.silent === true;
  const initialData = schema.initialData;

  const [state, setState] = useState<DataSourceState>(() => ({
    loading: initialData === undefined,
    error: undefined,
    data: initialData
  }));

  const pollingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    const executeRequest = async (isPolling: boolean = false): Promise<void> => {
      if (!mountedRef.current) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!isPolling) {
        setState((prev) => ({ ...prev, loading: true, error: undefined }));
      }

      try {
        const evaluatedApi = runtime.evaluate<ApiObject>(api, props.helpers.createScope({}));
        
        const cacheKey = resolveCacheKey(evaluatedApi);
        
        if (cacheKey) {
          const cached = globalApiCache.get<unknown>(cacheKey);
          if (cached) {
            if (!mountedRef.current) return;
            setState({ loading: false, error: undefined, data: cached.data });
            checkStopCondition(cached.data);
            return;
          }
        }

        const response = await env.fetcher(evaluatedApi, {
          scope: props.helpers.createScope({}),
          env,
          signal: controller.signal
        });

        if (!mountedRef.current) return;

        if (controller.signal.aborted) return;

        const responseData = response.data;

        if (cacheKey && evaluatedApi.cacheTTL && evaluatedApi.cacheTTL > 0) {
          globalApiCache.set(cacheKey, responseData, evaluatedApi.cacheTTL);
        }

        setState({ loading: false, error: undefined, data: responseData });
        checkStopCondition(responseData);
      } catch (err) {
        if (!mountedRef.current) return;

        if (err && typeof err === 'object' && ((err as { name?: string }).name === 'AbortError' || (err as { code?: string }).code === 'ABORT_ERR')) {
          return;
        }

        setState({ loading: false, error: err, data: initialData });

        if (!silent) {
          const message = err instanceof Error ? err.message : String(err);
          env.notify('error', message);
        }
      }
    };

    const checkStopCondition = (data: unknown) => {
      if (!stopWhen || !interval) return;

      try {
        const scope = props.helpers.createScope(
          dataPath ? { [dataPath]: data } : { data },
          { scopeKey: 'data-source-stop-check', pathSuffix: 'stop-check' }
        );
        const shouldStop = runtime.evaluate<boolean>(stopWhen, scope);
        if (shouldStop) {
          pollingRef.current = false;
        }
      } catch {
        // Ignore stopWhen evaluation errors
      }
    };

    executeRequest();

    if (interval && interval > 0) {
      pollingRef.current = true;
      const pollInterval = setInterval(() => {
        if (pollingRef.current && mountedRef.current) {
          executeRequest(true);
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
  }, [api.url, interval, stopWhen, silent, dataPath, runtime, env, props.helpers, initialData]);

  const bodyData = useMemo(() => {
    if (dataPath && state.data !== undefined) {
      return { [dataPath]: state.data };
    }
    if (state.data !== undefined) {
      return state.data as Record<string, unknown>;
    }
    return {};
  }, [dataPath, state.data]);
  
  const bodyContent = props.regions.body?.render({ 
    data: bodyData,
    scopeKey: 'data-source-body',
    pathSuffix: 'body'
  });

  if (state.loading && state.data === undefined) {
    return (
      <div className={props.meta.className} data-testid={props.meta.testid || undefined}>
        <div className="nop-data-source-loading">Loading...</div>
      </div>
    );
  }

  if (state.error && state.data === undefined) {
    return (
      <div className={props.meta.className} data-testid={props.meta.testid || undefined}>
        <div className="nop-data-source-error">
          Error: {state.error instanceof Error ? state.error.message : String(state.error)}
        </div>
      </div>
    );
  }

  return (
    <div className={props.meta.className} data-testid={props.meta.testid || undefined}>
      {bodyContent}
    </div>
  );
}
