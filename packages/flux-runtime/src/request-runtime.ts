import type { ExpressionCompiler, ApiObject, FormRuntime, RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
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

function createAdaptorScopeView(scope: ScopeRef): object {
  let cachedKeys: Array<string | symbol> | undefined;

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
        if (!cachedKeys) {
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

          cachedKeys = Array.from(keys);
        }

        return cachedKeys;
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
  return `${owner}:${actionType}:${api.method ?? 'get'}:${api.url}`;
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

export function createApiRequestExecutor(env: RendererEnv) {
  const activeRequests = new Map<string, AbortController>();

  return async function executeApiRequest<T>(actionType: string, api: ApiObject, scope: ScopeRef, form?: FormRuntime) {
    const requestKey = createRequestKey(actionType, api, scope, form);
    const previous = activeRequests.get(requestKey);

    if (previous) {
      previous.abort();
    }

    const controller = new AbortController();
    activeRequests.set(requestKey, controller);
    env.monitor?.onApiRequest?.({
      api,
      nodeId: undefined,
      path: undefined
    });

    try {
      return await env.fetcher<T>(api, {
        scope,
        env,
        signal: controller.signal
      });
    } finally {
      if (activeRequests.get(requestKey) === controller) {
        activeRequests.delete(requestKey);
      }
    }
  };
}

