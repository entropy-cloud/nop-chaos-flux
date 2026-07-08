import type {
  ApiResponse,
  ExecutableApiRequest,
  ExpressionCompiler,
  ApiSchema,
  OperationControlConfig,
  PreparedApiRequest,
  RendererEnv,
  ScopeRef,
  SchemaValue,
} from '@nop-chaos/flux-core';
import { isPlainObject } from '@nop-chaos/flux-core';
import { withRetry, withTimeout, type RetryResult } from '@nop-chaos/flux-action-core';
import { applyRequestAdaptor, applyResponseAdaptor } from './request-runtime-adaptor.js';
import { stableStringify } from './api-cache.js';

export { applyRequestAdaptor, applyResponseAdaptor } from './request-runtime-adaptor.js';

export interface ApiRequestExecutor {
  <T>(
    actionType: string,
    api: ApiSchema | ExecutableApiRequest,
    scope: ScopeRef,
    form?: { id: string },
    options?: { signal?: AbortSignal; interactionId?: string; control?: OperationControlConfig },
  ): Promise<ApiResponse<T>>;
  dispose(): void;
}

export interface ApiRequestExecutionResult<T> {
  response: ApiResponse<T>;
  retry: RetryResult<ApiResponse<T>>;
}

interface RequestTimeoutFailure {
  __timeout: true;
  error: DOMException;
}

function isRequestTimeoutFailure<T>(value: ApiResponse<T> | RequestTimeoutFailure): value is RequestTimeoutFailure {
  return typeof value === 'object' && value !== null && '__timeout' in value;
}

function normalizeTimeout(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function createAbortReasonError(message: string, cause: unknown): Error {
  return Object.assign(new Error(message, { cause }), { name: 'AbortError' });
}

function createSupersededRequestAbortReason(requestKey: string): Error {
  return createAbortReasonError('Request was superseded by a newer request', {
    reason: 'request-superseded',
    requestKey,
  });
}

function createDisposedRequestAbortReason(): Error {
  return createAbortReasonError('Request executor was disposed', { reason: 'request-executor-disposed' });
}

function readResponseErrorMessage(responseData: unknown): string | undefined {
  if (!responseData || typeof responseData !== 'object') {
    return undefined;
  }

  const record = responseData as Record<string, unknown>;
  if (typeof record.message === 'string' && record.message.length > 0) {
    return record.message;
  }

  if (typeof record.msg === 'string' && record.msg.length > 0) {
    return record.msg;
  }

  return undefined;
}

function createApiResponseError(
  response: ApiResponse<unknown>,
  retryMetadata: { attempts: number; failureCount: number; lastFailureReason?: unknown },
): Error & {
  response: ApiResponse<unknown>;
  status?: number;
  code?: string;
  msg?: string;
  errors?: Record<string, string>;
  responseData: unknown;
  lastFailureReason?: unknown;
} {
  const responseData = response.data;

  let message: string | undefined;
  // 1. top-level `msg` — the first-class ApiResponse error field (mirrors backend).
  if (typeof response.msg === 'string' && response.msg.length > 0) {
    message = response.msg;
  }
  // 2. fallback to nested `data.message` / `data.msg` (non-standard backends).
  if (!message) {
    message = readResponseErrorMessage(responseData);
  }
  // 3. generic fallback.
  if (!message) {
    message = response.code
      ? `Request failed (status=${response.status}, code=${response.code})`
      : `Request failed (status=${response.status})`;
  }

  return Object.assign(new Error(message, { cause: response }), retryMetadata, {
    response,
    status: response.status,
    responseData,
    code: response.code,
    msg: response.msg,
    errors: response.errors,
  });
}

export async function executeRequestWithControl<T>(input: {
  execute: (signal?: AbortSignal) => Promise<ApiResponse<T>>;
  control?: OperationControlConfig;
  signal?: AbortSignal;
  shouldStop?: (response: ApiResponse<T>) => boolean;
  onFailedAttempt?: (failureCount: number, error: unknown) => void;
}): Promise<ApiRequestExecutionResult<T>> {
  const retry = input.control?.retry;
  const timeout = normalizeTimeout(input.control?.timeout);
  const executeAttempt: () => Promise<ApiResponse<T> | RequestTimeoutFailure> = timeout
    ? () =>
        withTimeout<ApiResponse<T> | RequestTimeoutFailure>(
          (signal) => input.execute(signal),
          timeout,
          () =>
            ({
              __timeout: true,
              error: new DOMException(`Request timed out after ${timeout}ms`, 'TimeoutError'),
            }) as RequestTimeoutFailure,
          input.signal,
        )
    : () => input.execute(input.signal);
  const shouldStop = (result: ApiResponse<T> | RequestTimeoutFailure) =>
    isRequestTimeoutFailure(result)
      ? false
      : (input.shouldStop ? input.shouldStop(result) : Boolean(result.ok));

  const retryResult = await withRetry<ApiResponse<T> | RequestTimeoutFailure>(
    executeAttempt,
    {
      times: retry?.times ?? 0,
      delay: retry?.delay ?? 0,
      strategy: retry?.strategy ?? 'fixed',
      maxDelay: retry?.maxDelay,
      onFailedAttempt: input.onFailedAttempt,
      signal: input.signal,
    },
    shouldStop,
  );

  if (isRequestTimeoutFailure(retryResult.result)) {
    throw Object.assign(retryResult.result.error, {
      attempts: retryResult.attempts,
      failureCount: retryResult.failureCount,
      lastFailureReason: retryResult.lastFailureReason,
    });
  }

  return {
    response: retryResult.result,
    retry: retryResult as RetryResult<ApiResponse<T>>,
  };
}

function createRequestKey(
  actionType: string,
  api: ExecutableApiRequest,
  scope: ScopeRef,
  form?: { id: string },
): string {
  const owner = form?.id ?? scope.id;
  return [
    owner,
    actionType,
    api.method ?? 'get',
    api.url,
    stableStringify(api.data),
    stableStringify(api.headers),
  ].join(':');
}

function normalizeParams(params: SchemaValue | undefined): Record<string, unknown> | undefined {
  return isPlainObject(params) ? (params as Record<string, unknown>) : undefined;
}

function resolveRequestDedup(control?: OperationControlConfig) {
  return control?.dedup ?? 'cancel-previous';
}

export function extractScopeData(
  scope: ScopeRef,
  includeScope: '*' | string[] | undefined,
): Record<string, unknown> {
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

function appendParamValues(searchParams: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (item !== undefined && item !== null) {
        searchParams.append(key, String(item));
      }
    }
  } else if (typeof value === 'object') {
    try {
      const safeObj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (v === undefined) { safeObj[k] = '[undefined]'; }
        else if (typeof v === 'number' && Number.isNaN(v)) { safeObj[k] = '[NaN]'; }
        else if (typeof v === 'number' && !Number.isFinite(v)) { safeObj[k] = `[${v}]`; }
        else { safeObj[k] = v; }
      }
      searchParams.append(key, JSON.stringify(safeObj));
    } catch {
      searchParams.append(key, String(value));
    }
  } else {
    searchParams.append(key, String(value));
  }
}

export function buildUrlWithParams(
  url: string,
  params: Record<string, unknown> | undefined,
): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    appendParamValues(searchParams, key, value);
  }

  const queryString = searchParams.toString();
  if (!queryString) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${queryString}`;
}

function canonicalizeUrlWithParams(
  url: string,
  params: Record<string, unknown> | undefined,
): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const [baseUrl, existingQuery = ''] = url.split('?', 2);
  const searchParams = new URLSearchParams(existingQuery);

  for (const [key, value] of Object.entries(params)) {
    searchParams.delete(key);
    searchParams.delete(`${key}[]`);
    appendParamValues(searchParams, key, value);
  }

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export function prepareApiData(
  api: ApiSchema,
  scope: ScopeRef,
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
    headers: api.headers,
    selection: api.selection,
  };

  return {
    request: {
      ...rest,
      url: finalUrl,
      data: api.data,
    },
    data: api.data,
    params,
    finalUrl,
  };
}

export function materializeApiRequest(api: ApiSchema, scope: ScopeRef): PreparedApiRequest {
  const prepared = prepareApiData(api, scope);
  const finalUrl = buildUrlWithParams(api.url, prepared.params);
  const rest = {
    url: api.url,
    method: api.method,
    headers: api.headers,
    selection: api.selection,
  };

  return {
    request: {
      ...rest,
      url: finalUrl,
      data: prepared.data,
    },
    data: prepared.data,
    params: prepared.params,
    finalUrl,
  };
}

export function finalizeMaterializedApiRequest(api: ApiSchema): PreparedApiRequest {
  return finalizeApiRequest({
    ...api,
    params: api.params as SchemaValue | undefined,
  });
}

export function prepareApiRequestForExecution(
  api: ApiSchema,
  scope: ScopeRef,
  env: RendererEnv,
  expressionCompiler: ExpressionCompiler,
): PreparedApiRequest {
  const materializedRequest = materializeApiRequest(api, scope);
  const adaptedApi = applyRequestAdaptor(
    expressionCompiler,
    {
      ...api,
      url: materializedRequest.request.url,
      data: materializedRequest.data,
      params: materializedRequest.params as SchemaValue | undefined,
    },
    scope,
    env,
  );
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
    executor?: <T>(adaptedApi: ExecutableApiRequest, signal?: AbortSignal) => Promise<ApiResponse<T>>;
    control?: OperationControlConfig;
  },
): Promise<{
  data: unknown;
  ok: boolean;
  status?: number;
  attempts: number;
  failureCount: number;
  lastFailureReason?: unknown;
}> {
  const resolvedApi = options?.evaluate ? options.evaluate<ApiSchema>(api, scope) : api;
  const preparedRequest =
    options?.preparedRequest ??
    prepareApiRequestForExecution(resolvedApi, scope, env, expressionCompiler);
  const executableApi = preparedRequest.request;
  options?.onPreparedRequest?.(executableApi);
  const execution = await executeRequestWithControl({
    execute: (signal) =>
      options?.executor
        ? options.executor(executableApi, signal)
        : env.fetcher(executableApi, { scope, env, signal: signal ?? options?.signal }),
    control: options?.control,
    signal: options?.signal,
  });
  const response = execution.response;

  // ApiResponse normalization: `ok` is a computed property mirroring the backend
  // `ApiResponse.isOk()` (`status === 0`). Fetchers following the standard envelope
  // return `{status, data}` without `ok`; legacy fetchers that set `ok` explicitly
  // are respected. Computed here, before responseAdaptor, so every consumer reads a
  // normalized `ok`.
  const isOk = response.status === 0 || response.ok === true;

  if (!isOk) {
    let errorPayload = response.data;
    if (resolvedApi.responseAdaptor) {
      try {
        errorPayload = applyResponseAdaptor(
          expressionCompiler,
          executableApi,
          resolvedApi,
          response.data,
          scope,
          env,
          response.status,
        );
      } catch (adaptorError) {
        // M-08: a throwing responseAdaptor on an error-shaped payload previously
        // failed completely silently (bare catch). Surface it through structured
        // diagnostics (monitor + console) so a broken adaptor is dev-visible,
        // while still falling back to the raw response body so the backend
        // message is preserved on the thrown error below. This mirrors the
        // observability of the success path, which has no catch and propagates.
        env.monitor?.onError?.({
          phase: 'api',
          error: adaptorError,
          details: {
            url: executableApi.url,
            status: response.status,
            adaptor: 'responseAdaptor',
          },
        });
        console.warn(
          `[flux-runtime] responseAdaptor threw while adapting a non-OK response from ${executableApi.url} (status ${response.status}); falling back to the raw response body.`,
          adaptorError,
        );
        errorPayload = response.data;
      }
    }

    const retryMetadata = {
      attempts: execution.retry.attempts,
      failureCount: execution.retry.failureCount,
      lastFailureReason: execution.retry.lastFailureReason,
    };

    throw createApiResponseError({ ...response, data: errorPayload }, retryMetadata);
  }

  const adaptedData = applyResponseAdaptor(
    expressionCompiler,
    executableApi,
    resolvedApi,
    response.data,
    scope,
    env,
    response.status,
  );

  return {
    data: adaptedData,
    ok: isOk,
    status: response.status,
    attempts: execution.retry.attempts,
    failureCount: execution.retry.failureCount,
    lastFailureReason: execution.retry.lastFailureReason,
  };
}

export const executeApiObject = executeApiSchema;

export function createApiRequestExecutor(getEnv: () => RendererEnv): ApiRequestExecutor {
  const activeControllers = new Map<string, AbortController>();
  const activePromises = new Map<string, Promise<ApiResponse<unknown>>>();

  function clearStaleActiveRequest(requestKey: string) {
    const controller = activeControllers.get(requestKey);
    const promise = activePromises.get(requestKey);
    const stale = !!promise && (!controller || controller.signal.aborted);

    if (!stale) {
      return false;
    }

    activeControllers.delete(requestKey);
    activePromises.delete(requestKey);
    return true;
  }

  const executeApiRequest: ApiRequestExecutor = async function executeApiRequest<T>(
    actionType: string,
    api: ApiSchema | ExecutableApiRequest,
    scope: ScopeRef,
    form?: { id: string },
    options?: { signal?: AbortSignal; interactionId?: string; control?: OperationControlConfig },
  ) {
    const executableApi = finalizeApiRequest(api as ApiSchema).request;
    const requestKey = createRequestKey(actionType, executableApi, scope, form);
    const dedupStrategy = resolveRequestDedup(options?.control);
    clearStaleActiveRequest(requestKey);
    const previousController = activeControllers.get(requestKey);
    const previousPromise = activePromises.get(requestKey);
    const env = getEnv();

    if (previousPromise) {
      if (dedupStrategy === 'ignore-new' && !previousController?.signal.aborted) {
        return previousPromise as Promise<ApiResponse<T>>;
      }

      if (dedupStrategy === 'cancel-previous' && previousController) {
        previousController.abort(createSupersededRequestAbortReason(requestKey));
      }
    }

    const controller = new AbortController();
    let detachParentAbortListener: (() => void) | undefined;
    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort(options.signal.reason);
      } else {
        const abortFromParent = () => controller.abort(options.signal?.reason);
        options.signal.addEventListener('abort', abortFromParent, { once: true });
        detachParentAbortListener = () => {
          options.signal?.removeEventListener('abort', abortFromParent);
        };
      }
    }

    const requestPromise = env.fetcher<T>(executableApi, {
      scope,
      env,
      signal: controller.signal,
      interactionId: options?.interactionId,
    });

    if (dedupStrategy !== 'parallel') {
      activeControllers.set(requestKey, controller);
      activePromises.set(requestKey, requestPromise);
    }

    try {
      return await requestPromise;
    } finally {
      detachParentAbortListener?.();
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
      controller.abort(createDisposedRequestAbortReason());
    }

    activeControllers.clear();
    activePromises.clear();
  };

  return executeApiRequest;
}
