import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ApiObject, DataSourceSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererEnv, useRendererRuntime } from '@nop-chaos/flux-react';
import { createApiCacheStore, executeApiObject, resolveCacheKey } from '@nop-chaos/flux-runtime';
import { Alert, AlertDescription } from '@nop-chaos/ui';
import { Skeleton } from '@nop-chaos/ui';

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
  const api = props.props.api as ApiObject;
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
        const cacheKey = resolveCacheKey(api);
        
        if (cacheKey) {
          const cached = globalApiCache.get<unknown>(cacheKey);
          if (cached) {
            if (!mountedRef.current) return;
            setState({ loading: false, error: undefined, data: cached.data });
            checkStopCondition(cached.data);
            return;
          }
        }

        const scope = props.helpers.createScope({});
        const result = await executeApiObject(api, scope, env, runtime.expressionCompiler, { signal: controller.signal });

        if (!mountedRef.current) return;

        if (controller.signal.aborted) return;

        const responseData = result.data;

        if (cacheKey && api.cacheTTL && api.cacheTTL > 0) {
          globalApiCache.set(cacheKey, responseData, api.cacheTTL);
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
        <Skeleton className="h-6 w-40" />
      </div>
    );
  }

  if (state.error && state.data === undefined) {
    return (
      <div className={props.meta.className} data-testid={props.meta.testid || undefined}>
        <Alert variant="destructive">
          <AlertDescription>
            Error: {state.error instanceof Error ? state.error.message : String(state.error)}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={props.meta.className} data-testid={props.meta.testid || undefined}>
      {bodyContent}
    </div>
  );
}
