import type {
  ApiResponse,
  ExecutableApiRequest,
  ExpressionCompiler,
  ApiSchema,
  FormRuntime,
  OperationControlConfig,
  PreparedApiRequest,
  RendererEnv,
  ScopeRef,
  SchemaValue
} from '@nop-chaos/flux-core';
import { isPlainObject, setIn } from '@nop-chaos/flux-core';
import { withRetry, type RetryResult } from './operation-control';
import { applyRequestAdaptor, applyResponseAdaptor } from './request-runtime-adaptor';
import { stableStringify } from './api-cache';

export { applyRequestAdaptor, applyResponseAdaptor } from './request-runtime-adaptor';

export interface ApiRequestExecutor {
  <T>(
    actionType: string,
    api: ApiSchema | ExecutableApiRequest,
    scope: ScopeRef,
    form?: FormRuntime,
    options?: { signal?: AbortSignal; interactionId?: string; control?: OperationControlConfig }
  ): Promise<ApiResponse<T>>;
  dispose(): void;
}

export interface ApiRequestExecutionResult<T> {
  response: ApiResponse<T>;
  retry: RetryResult<ApiResponse<T>>;
}

export async function executeRequestWithControl<T>(input: {
  execute: () => Promise<ApiResponse<T>>;
  control?: OperationControlConfig;
  signal?: AbortSignal;
  shouldStop?: (response: ApiResponse<T>) => boolean;
  onFailedAttempt?: (failureCount: number, error: unknown) => void;
}): Promise<ApiRequestExecutionResult<T>> {
  const retry = input.control?.retry;
  const retryResult = await withRetry(
    input.execute,
    {
      times: retry?.times ?? 0,
      delay: retry?.delay ?? 0,
      strategy: retry?.strategy ?? 'fixed',
      maxDelay: retry?.maxDelay,
      onFailedAttempt: input.onFailedAttempt,
      signal: input.signal
    },
    input.shouldStop ?? ((response) => Boolean(response.ok))
  );

  return {
    response: retryResult.result,
    retry: retryResult
  };
}

function getPathValue(input: unknown, path: string): unknown {
  if (!path || input == null || typeof input !== 'object') {
    return undefined;
  }

  return path.split('.').reduce<unknown>((current, segment) => {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, input);
}

function createRequestKey(actionType: string, api: ExecutableApiRequest, scope: ScopeRef, form?: FormRuntime): string {
  const owner = form?.id ?? scope.id;
  return [
    owner,
    actionType,
    api.method ?? 'get',
    api.url,
    stableStringify(api.data),
    stableStringify(api.headers)
  ].join(':');
}

function normalizeParams(params: SchemaValue | undefined): Record<string, unknown> | undefined {
  return isPlainObject(params)
    ? (params as Record<string, unknown>)
    : undefined;
}

function resolveRequestDedup(api: ApiSchema, control?: OperationControlConfig) {
  return control?.dedup ?? api.dedupStrategy ?? 'cancel-previous';
}

export function extractScopeData(scope: ScopeRef, includeScope: '*' | string[] | undefined): Record<string, unknown> {
  if (!includeScope) {
    return {};
  }

  if (includeScope === '*') {
    return scope.readOwn();
  }

  const result: Record<string, unknown> = {};
  for (const key of includeScope) {
    if (scope.has(key)) {
      result[key] = scope.get(key);
    }
  }
  return result;
}

export function buildUrlWithParams(url: string, params: Record<string, unknown> | undefined): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  if (!queryString) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${queryString}`;
}

function canonicalizeUrlWithParams(url: string, params: Record<string, unknown> | undefined): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const [baseUrl, existingQuery = ''] = url.split('?', 2);
  const searchParams = new URLSearchParams(existingQuery);

  for (const [key, value] of Object.entries(params)) {
    searchParams.delete(key);

    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export function prepareApiData(
  api: ApiSchema,
  scope: ScopeRef
): { data: SchemaValue | undefined; params: Record<string, unknown> | undefined } {
  const extractedData = extractScopeData(scope, api.includeScope);

  const explicitData = api.data;

  let mergedData: SchemaValue | undefined;
  if (isPlainObject(explicitData)) {
    mergedData = { ...extractedData, ...(explicitData as Record<string, unknown>) } as SchemaValue;
  } else if (explicitData !== undefined) {
    mergedData = explicitData;
  } else if (Object.keys(extractedData).length > 0) {
    mergedData = extractedData as SchemaValue;
  }

  const params = normalizeParams(api.params);

  return { data: mergedData, params };
}

export function finalizeApiRequest(api: ApiSchema): PreparedApiRequest {
  const params = normalizeParams(api.params);
  const finalUrl = canonicalizeUrlWithParams(api.url, params);
  const rest = {
    url: api.url,
    method: api.method,
    data: api.data,
    headers: api.headers
  };

  return {
    request: {
      ...rest,
      url: finalUrl,
      data: api.data
    },
    data: api.data,
    params,
    finalUrl
  };
}

export function materializeApiRequest(api: ApiSchema, scope: ScopeRef): PreparedApiRequest {
  const prepared = prepareApiData(api, scope);
  const finalUrl = buildUrlWithParams(api.url, prepared.params);
  const rest = {
    url: api.url,
    method: api.method,
    headers: api.headers
  };

  return {
    request: {
      ...rest,
      url: finalUrl,
      data: prepared.data
    },
    data: prepared.data,
    params: prepared.params,
    finalUrl
  };
}

export function finalizeMaterializedApiRequest(api: ApiSchema): PreparedApiRequest {
  return finalizeApiRequest({
    ...api,
    params: api.params as SchemaValue | undefined
  });
}

export function applyResponseDataPath(
  currentData: Record<string, any>,
  dataPath: string,
  responseData: unknown
): Record<string, any> {
  const currentValue = getPathValue(responseData, dataPath);

  if (currentValue !== undefined) {
    return setIn(currentData, dataPath, currentValue);
  }

  if (isPlainObject(responseData)) {
    return {
      ...currentData,
      ...(responseData as Record<string, any>)
    };
  }

  return setIn(currentData, dataPath, responseData);
}

export function prepareApiRequestForExecution(
  api: ApiSchema,
  scope: ScopeRef,
  env: RendererEnv,
  expressionCompiler: ExpressionCompiler
): PreparedApiRequest {
  const materializedRequest = materializeApiRequest(api, scope);
  const adaptedApi = applyRequestAdaptor(expressionCompiler, {
    ...api,
    url: materializedRequest.request.url,
    data: materializedRequest.data,
    params: materializedRequest.params as SchemaValue | undefined
  }, scope, env);
  return finalizeMaterializedApiRequest(adaptedApi);
}

export async function executeApiSchema(
  api: ApiSchema,
  scope: ScopeRef,
  env: RendererEnv,
  expressionCompiler: ExpressionCompiler,
  options?: {
    signal?: AbortSignal;
    evaluate?: <T = unknown>(target: unknown, scope: ScopeRef) => T;
    preparedRequest?: PreparedApiRequest;
    onPreparedRequest?: (api: ExecutableApiRequest) => void;
    executor?: <T>(adaptedApi: ExecutableApiRequest) => Promise<ApiResponse<T>>;
    control?: OperationControlConfig;
  }
): Promise<{ data: unknown; ok: boolean; status?: number; attempts: number; failureCount: number; lastFailureReason?: unknown }> {
  const resolvedApi = options?.evaluate ? options.evaluate<ApiSchema>(api, scope) : api;
  const preparedRequest = options?.preparedRequest ?? prepareApiRequestForExecution(resolvedApi, scope, env, expressionCompiler);
  const executableApi = preparedRequest.request;
  options?.onPreparedRequest?.(executableApi);
  const execution = await executeRequestWithControl({
    execute: () => options?.executor
      ? options.executor(executableApi)
      : env.fetcher(executableApi, { scope, env, signal: options?.signal }),
    control: options?.control,
    signal: options?.signal
  });
  const response = execution.response;

  if (!response.ok) {
    const responseData = response.data;

    if (
      responseData &&
      typeof responseData === 'object' &&
      'message' in (responseData as Record<string, unknown>) &&
      typeof (responseData as { message?: unknown }).message === 'string'
    ) {
      throw new Error((responseData as { message: string }).message);
    }

    throw new Error(`Request failed with status ${response.status}`);
  }

  const adaptedData = applyResponseAdaptor(expressionCompiler, executableApi, resolvedApi, response.data, scope, env);
  return {
    data: adaptedData,
    ok: response.ok,
    status: response.status,
    attempts: execution.retry.attempts,
    failureCount: execution.retry.failureCount,
    lastFailureReason: execution.retry.lastFailureReason
  };
}

export const executeApiObject = executeApiSchema;

export function createApiRequestExecutor(getEnv: () => RendererEnv): ApiRequestExecutor {
  const activeControllers = new Map<string, AbortController>();
  const activePromises = new Map<string, Promise<ApiResponse<any>>>();

  const executeApiRequest: ApiRequestExecutor = async function executeApiRequest<T>(
    actionType: string,
    api: ApiSchema | ExecutableApiRequest,
    scope: ScopeRef,
    form?: FormRuntime,
    options?: { signal?: AbortSignal; interactionId?: string; control?: OperationControlConfig }
  ) {
    const executableApi = finalizeApiRequest(api as ApiSchema).request;
    const requestKey = createRequestKey(actionType, executableApi, scope, form);
    const dedupStrategy = resolveRequestDedup(api as ApiSchema, options?.control);
    const previousController = activeControllers.get(requestKey);
    const previousPromise = activePromises.get(requestKey);
    const env = getEnv();

    if (previousPromise) {
      if (dedupStrategy === 'ignore-new') {
        return previousPromise as Promise<ApiResponse<T>>;
      }

      if (dedupStrategy === 'cancel-previous' && previousController) {
        previousController.abort();
      }
    }

    const controller = new AbortController();
    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    const requestPromise = env.fetcher<T>(executableApi, {
      scope,
      env,
      signal: controller.signal,
      interactionId: options?.interactionId
    });

    if (dedupStrategy !== 'parallel') {
      activeControllers.set(requestKey, controller);
      activePromises.set(requestKey, requestPromise);
    }

    try {
      return await requestPromise;
    } finally {
      if (activeControllers.get(requestKey) === controller) {
        activeControllers.delete(requestKey);
      }
      if (activePromises.get(requestKey) === requestPromise) {
        activePromises.delete(requestKey);
      }
    }
  };

  executeApiRequest.dispose = () => {
    for (const controller of activeControllers.values()) {
      controller.abort();
    }

    activeControllers.clear();
    activePromises.clear();
  };

  return executeApiRequest;
}
