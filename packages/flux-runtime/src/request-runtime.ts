import type { ApiResponse, ExpressionCompiler, ApiObject, FormRuntime, RendererEnv, ScopeRef, SchemaValue } from '@nop-chaos/flux-core';
import { isPlainObject, setIn } from '@nop-chaos/flux-core';

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

function normalizeAdaptorSource(source: string): string {
  const trimmed = source.trim();

  if (trimmed.startsWith('return ')) {
    return trimmed.slice(7).replace(/;\s*$/, '').trim();
  }

  return trimmed.replace(/;\s*$/, '').trim();
}

function stableSerialize(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  if (typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }

  return JSON.stringify(String(value));
}

function createAdaptorScopeView(scope: ScopeRef): object {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (typeof property !== 'string') {
          return undefined;
        }

        if (property === '__proto__') {
          return undefined;
        }

        return scope.get(property);
      },
      has(_target, property) {
        return typeof property === 'string' ? scope.has(property) : false;
      },
      ownKeys() {
        const keys = new Set<string | symbol>();
        let current: ScopeRef | undefined = scope;

        while (current) {
          for (const key of Reflect.ownKeys(current.readOwn())) {
            if (typeof key === 'string' || typeof key === 'symbol') {
              keys.add(key);
            }
          }

          current = current.parent;
        }

        return Array.from(keys);
      },
      getOwnPropertyDescriptor(_target, property) {
        if (typeof property !== 'string') {
          return undefined;
        }

        if (!scope.has(property)) {
          return undefined;
        }

        return {
          configurable: true,
          enumerable: true,
          value: scope.get(property),
          writable: false
        };
      }
    }
  );
}

function createRequestKey(actionType: string, api: ApiObject, scope: ScopeRef, form?: FormRuntime): string {
  const owner = form?.id ?? scope.id;
  return [
    owner,
    actionType,
    api.method ?? 'get',
    api.url,
    stableSerialize(api.params),
    stableSerialize(api.data),
    stableSerialize(api.headers)
  ].join(':');
}

export function extractScopeData(scope: ScopeRef, includeScope: '*' | string[] | undefined): Record<string, unknown> {
  if (!includeScope) {
    return {};
  }

  if (includeScope === '*') {
    return scope.read();
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

export function prepareApiData(
  api: ApiObject,
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

  const params = api.params && isPlainObject(api.params)
    ? api.params as Record<string, unknown>
    : undefined;

  return { data: mergedData, params };
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

export function applyRequestAdaptor(
  expressionCompiler: ExpressionCompiler,
  api: ApiObject,
  scope: ScopeRef,
  env: RendererEnv
): ApiObject {
  if (!api.requestAdaptor) {
    return api;
  }

  const compiled = expressionCompiler.formulaCompiler.compileExpression<ApiObject>(normalizeAdaptorSource(api.requestAdaptor));
  const adapted = compiled.exec(
    {
      api,
      scope: createAdaptorScopeView(scope),
      data: api.data,
      headers: api.headers ?? {}
    },
    env
  );

  return isPlainObject(adapted) ? ({ ...api, ...(adapted as Record<string, unknown>) } as ApiObject) : api;
}

export function applyResponseAdaptor(
  expressionCompiler: ExpressionCompiler,
  api: ApiObject,
  responseData: unknown,
  scope: ScopeRef,
  env: RendererEnv
): unknown {
  if (!api.responseAdaptor) {
    return responseData;
  }

  const compiled = expressionCompiler.formulaCompiler.compileExpression(normalizeAdaptorSource(api.responseAdaptor));

  return compiled.exec(
    {
      payload: responseData,
      response: responseData,
      api,
      scope: createAdaptorScopeView(scope)
    },
    env
  );
}

export async function executeApiObject(
  api: ApiObject,
  scope: ScopeRef,
  env: RendererEnv,
  expressionCompiler: ExpressionCompiler,
  options?: {
    signal?: AbortSignal;
    executor?: <T>(adaptedApi: ApiObject) => Promise<ApiResponse<T>>;
  }
): Promise<{ data: unknown; ok: boolean; status?: number }> {
  const adaptedApi = applyRequestAdaptor(expressionCompiler, api, scope, env);
  const response = options?.executor
    ? await options.executor(adaptedApi)
    : await env.fetcher(adaptedApi, { scope, env, signal: options?.signal });
  const adaptedData = applyResponseAdaptor(expressionCompiler, adaptedApi, response.data, scope, env);
  return { data: adaptedData, ok: response.ok, status: response.status };
}

export function createApiRequestExecutor(getEnv: () => RendererEnv) {
  const activeControllers = new Map<string, AbortController>();
  const activePromises = new Map<string, Promise<ApiResponse<any>>>();

  return async function executeApiRequest<T>(
    actionType: string,
    api: ApiObject,
    scope: ScopeRef,
    form?: FormRuntime,
    options?: { signal?: AbortSignal }
  ) {
    const dedupStrategy = api.dedupStrategy ?? 'cancel-previous';
    const requestKey = createRequestKey(actionType, api, scope, form);
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
    env.monitor?.onApiRequest?.({
      api,
      nodeId: undefined,
      path: undefined
    });

    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    const requestPromise = env.fetcher<T>(api, {
        scope,
        env,
        signal: controller.signal
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
}
