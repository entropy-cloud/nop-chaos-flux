import type {
  ActionContext,
  ActionResult,
  ActionSchema,
  ApiSchema,
  DataSourceController,
  DynamicRuntimeValue,
  OperationControlConfig,
  RendererRuntime,
  RuntimeValueState,
  ScopeDependencySet,
  ScopeRef,
  StaticRuntimeValue
} from '@nop-chaos/flux-core';
import { resolveCacheKey, type ApiCacheStore } from './api-cache';
import { isAbortError } from './error-utils';
import { executeApiSchema, prepareApiRequestForExecution } from './request-runtime';
import { collectRuntimeDependencies } from './node-runtime';
import { publishOwnerStatus } from './status-owner';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function applyMergeStrategy(input: {
  currentValue: unknown;
  nextValue: unknown;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
}): unknown {
  const strategy = input.mergeStrategy ?? 'replace';

  if (strategy === 'replace') {
    return input.nextValue;
  }

  if (strategy === 'append') {
    const currentItems = Array.isArray(input.currentValue) ? input.currentValue : [];
    const nextItems = Array.isArray(input.nextValue) ? input.nextValue : [];
    return [...currentItems, ...nextItems];
  }

  if (strategy === 'prepend') {
    const currentItems = Array.isArray(input.currentValue) ? input.currentValue : [];
    const nextItems = Array.isArray(input.nextValue) ? input.nextValue : [];
    return [...nextItems, ...currentItems];
  }

  if (strategy === 'merge') {
    if (isObjectRecord(input.currentValue) && isObjectRecord(input.nextValue)) {
      return { ...input.currentValue, ...input.nextValue };
    }

    return input.nextValue;
  }

  if (strategy === 'upsert') {
    const mergeKey = input.mergeKey;
    if (!mergeKey) {
      return input.nextValue;
    }

    const currentItems = Array.isArray(input.currentValue) ? input.currentValue : [];
    const nextItems = Array.isArray(input.nextValue) ? input.nextValue : [];
    const keyedNextItems = new Map<unknown, Record<string, unknown>>();
    const passthroughNextItems: unknown[] = [];

    for (const item of nextItems) {
      if (isObjectRecord(item) && mergeKey in item) {
        keyedNextItems.set(item[mergeKey], item);
      } else {
        passthroughNextItems.push(item);
      }
    }

    const mergedItems = currentItems.map((item) => {
      if (!isObjectRecord(item) || !(mergeKey in item)) {
        return item;
      }

      const key = item[mergeKey];
      const nextItem = keyedNextItems.get(key);
      if (!nextItem) {
        return item;
      }

      keyedNextItems.delete(key);
      return { ...item, ...nextItem };
    });

    return [...mergedItems, ...Array.from(keyedNextItems.values()), ...passthroughNextItems];
  }

  return input.nextValue;
}

function applyResultMapping(input: {
  runtime: RendererRuntime;
  scope: ScopeRef;
  resultMapping?: unknown;
  payload: unknown;
}): unknown {
  if (!isObjectRecord(input.resultMapping)) {
    return input.payload;
  }

  const mappingScope = input.runtime.createChildScope(input.scope, {
    payload: input.payload,
    result: input.payload,
    response: input.payload
  }, { source: 'custom', pathSuffix: 'data-source-result-mapping' });

  return input.runtime.evaluate(input.resultMapping, mappingScope);
}

export function writeDataToScope(input: {
  scope: ScopeRef;
  targetPath?: string;
  mergeToScope?: boolean;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
  data: unknown;
}): void {
  const { scope, targetPath, mergeToScope, mergeStrategy, mergeKey, data } = input;
  if (targetPath) {
    const currentValue = scope.get(targetPath);
    scope.update(targetPath, applyMergeStrategy({
      currentValue,
      nextValue: data,
      mergeStrategy,
      mergeKey
    }));
  }

  if (mergeToScope && isObjectRecord(data)) {
    scope.merge(data);
  }
}

function writeStatusToScope(scope: ScopeRef, statusPath: string | undefined, state: {
  started: boolean;
  loading: boolean;
  stale: boolean;
  error: unknown;
}): void {
  publishOwnerStatus(scope, statusPath, {
    started: state.started,
    loading: state.loading,
    ready: state.started && !state.loading && !state.error,
    stale: state.stale,
    error: state.error
      ? { message: state.error instanceof Error ? state.error.message : String(state.error) }
      : undefined
  });
}

export function trackApiRequestDependencies(input: {
  runtime: RendererRuntime;
  api: ApiSchema;
  scope: ScopeRef;
  state?: RuntimeValueState<ApiSchema>;
}): {
  resolvedApi: ApiSchema;
  dependencies?: ScopeDependencySet;
} {
  const compiled = input.runtime.expressionCompiler.compileValue(input.api);

  if (compiled.isStatic) {
    return {
      resolvedApi: (compiled as StaticRuntimeValue<ApiSchema>).value,
      dependencies: undefined
    };
  }

  const dynamicCompiled = compiled as DynamicRuntimeValue<ApiSchema>;
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
  executeApiRequest: <T>(actionType: string, api: import('@nop-chaos/flux-core').ExecutableApiRequest, scope: ScopeRef, options?: { signal?: AbortSignal; control?: import('@nop-chaos/flux-core').OperationControlConfig }) => Promise<{ ok: boolean; status: number; data: T }>;
  api: ApiSchema;
  scope: ScopeRef;
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
  const apiState: RuntimeValueState<ApiSchema> | undefined = compiledApi.isStatic ? undefined : (compiledApi as DynamicRuntimeValue<ApiSchema>).createState();

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
    if (stopped || loading) {
      return;
    }

    loading = true;
    stale = value !== undefined;
    error = undefined;
    writeStatusToScope(scope, statusPath, { started, loading, stale, error });

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
      const cacheKey = resolveCacheKey(preparedRequest.request, api);

      if (cacheKey) {
        const cached = apiCache.get<unknown>(cacheKey);

        if (cached) {
          await Promise.resolve();

          if (stopped || controller.signal.aborted) {
            return;
          }

          const mappedValue = applyResultMapping({
            runtime,
            scope,
            resultMapping,
            payload: cached.data
          });

          value = mappedValue;
          loading = false;
          stale = false;
          writeDataToScope({ scope, targetPath, mergeToScope, mergeStrategy, mergeKey, data: mappedValue });
          writeStatusToScope(scope, statusPath, { started, loading, stale, error });

          if (checkStopCondition()) {
            stop();
          }

          return;
        }
      }

      const response = await executeApiSchema(trackedApi.resolvedApi, requestScope, runtime.env, runtime.expressionCompiler, {
        signal: controller.signal,
        evaluate: runtime.evaluate,
        preparedRequest,
        executor: (adaptedApi) => executeApiRequest('data-source', adaptedApi, requestScope, {
          signal: controller.signal,
          control: trackedApi.resolvedApi.control as OperationControlConfig | undefined
        }),
        control: trackedApi.resolvedApi.control as OperationControlConfig | undefined
      });

      if (stopped || controller.signal.aborted) {
        return;
      }

      if (cacheKey && api.cacheTTL && api.cacheTTL > 0) {
        apiCache.set(cacheKey, response.data, api.cacheTTL);
      }

      const mappedValue = applyResultMapping({
        runtime,
        scope,
        resultMapping,
        payload: response.data
      });

      value = mappedValue;
      loading = false;
      stale = false;
      error = undefined;
      writeDataToScope({ scope, targetPath, mergeToScope, mergeStrategy, mergeKey, data: mappedValue });
      writeStatusToScope(scope, statusPath, { started, loading, stale, error });

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
      writeStatusToScope(scope, statusPath, { started, loading, stale, error });

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
      writeDataToScope({ scope, targetPath, mergeToScope, mergeStrategy, mergeKey, data: initialData });
    }

    writeStatusToScope(scope, statusPath, { started, loading, stale, error });

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
    }, interval) as unknown as ReturnType<typeof setInterval>;
  }

  function stop(): void {
    stopped = true;

    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = undefined;
    }

    abortController?.abort();
    abortController = undefined;
    writeStatusToScope(scope, statusPath, { started, loading, stale, error });
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

export function createSourceExecutor(input: {
  runtime: RendererRuntime;
  executeAction: (action: ActionSchema, ctx: ActionContext) => Promise<ActionResult>;
}) {
  return async function executeSource(source: import('@nop-chaos/flux-core').SourceSchema, scope: ScopeRef, ctx?: Partial<ActionContext>) {
    if (source.formula !== undefined) {
      const value = input.runtime.evaluate(source.formula, scope);
      return { ok: true, data: value };
    }

    if (!source.action) {
      return { ok: false, error: new Error('Source requires action or formula') };
    }

    const result = await input.executeAction(source as ActionSchema, {
      runtime: input.runtime,
      scope,
      ...ctx
    });

    return result;
  };
}
