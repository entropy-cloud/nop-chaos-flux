import type {
  CompiledExpression,
  ExpressionCompiler,
  RendererEnv,
  ApiSchema,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { isPlainObject } from '@nop-chaos/flux-core';

const adaptorExpressionCache = new WeakMap<
  ExpressionCompiler,
  Map<string, CompiledExpression<unknown>>
>();

function normalizeAdaptorSource(source: string): string {
  const trimmed = source.trim();

  if (trimmed.startsWith('return ')) {
    return trimmed.slice(7).replace(/;\s*$/, '').trim();
  }

  return trimmed.replace(/;\s*$/, '').trim();
}

export function getCachedAdaptorExpression<T = unknown>(
  expressionCompiler: ExpressionCompiler,
  source: string,
): CompiledExpression<T> {
  let compilerCache = adaptorExpressionCache.get(expressionCompiler);

  if (!compilerCache) {
    compilerCache = new Map<string, CompiledExpression<unknown>>();
    adaptorExpressionCache.set(expressionCompiler, compilerCache);
  }

  const normalizedSource = normalizeAdaptorSource(source);
  const cached = compilerCache.get(normalizedSource);

  if (cached) {
    return cached as CompiledExpression<T>;
  }

  const compiled = expressionCompiler.formulaCompiler.compileExpression<T>(normalizedSource);
  compilerCache.set(normalizedSource, compiled as CompiledExpression<unknown>);
  return compiled;
}

export function createAdaptorScopeView(scope: ScopeRef): object {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (typeof property !== 'string') {
          return undefined;
        }

        if (property === '__proto__' || property === 'constructor' || property === 'prototype') {
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

          if (current.isolate) {
            break;
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
          writable: false,
        };
      },
    },
  );
}

export function applyRequestAdaptor(
  expressionCompiler: ExpressionCompiler,
  api: ApiSchema,
  scope: ScopeRef,
  env: RendererEnv,
): ApiSchema {
  if (!api.requestAdaptor) {
    return api;
  }

  const compiled = getCachedAdaptorExpression<ApiSchema>(expressionCompiler, api.requestAdaptor);
  const adapted = compiled.exec(
    {
      api,
      scope: createAdaptorScopeView(scope),
      data: api.data,
      headers: api.headers ?? {},
    },
    env,
  );

  return isPlainObject(adapted)
    ? ({ ...api, ...(adapted as Record<string, unknown>) } as ApiSchema)
    : api;
}

export function applyResponseAdaptor(
  expressionCompiler: ExpressionCompiler,
  api: import('@nop-chaos/flux-core').ExecutableApiRequest,
  sourceApi: ApiSchema,
  responseData: unknown,
  scope: ScopeRef,
  env: RendererEnv,
  status?: number,
): unknown {
  if (!sourceApi.responseAdaptor) {
    return responseData;
  }

  const compiled = getCachedAdaptorExpression(expressionCompiler, sourceApi.responseAdaptor);

  return compiled.exec(
    {
      payload: responseData,
      response: responseData,
      api,
      scope: createAdaptorScopeView(scope),
      status,
    },
    env,
  );
}
