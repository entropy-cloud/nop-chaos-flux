import type {
  CompiledRuntimeValue,
  ExpressionCompiler,
  RendererEnv,
  ScopeRef
} from '@nop-chaos/flux-core';

export interface RuntimeEvalHelpers {
  evaluate<T = unknown>(target: unknown, scope: ScopeRef): T;
  compileValue<T = unknown>(target: T): CompiledRuntimeValue<T>;
  evaluateCompiled<T = unknown>(compiled: CompiledRuntimeValue<T>, scope: ScopeRef): T;
}

export function createRuntimeEvalHelpers(
  expressionCompiler: ExpressionCompiler,
  getEnv: () => RendererEnv
): RuntimeEvalHelpers {
  const compiledValueCache = new WeakMap<object, ReturnType<ExpressionCompiler['compileValue']>>();

  function compileValue<T = unknown>(target: T): CompiledRuntimeValue<T> {
    const cacheable = target != null && typeof target === 'object';

    if (!cacheable) {
      return expressionCompiler.compileValue(target);
    }

    const cached = compiledValueCache.get(target as object);

    if (cached) {
      return cached as CompiledRuntimeValue<T>;
    }

    const compiled = expressionCompiler.compileValue(target);
    compiledValueCache.set(target as object, compiled);
    return compiled as CompiledRuntimeValue<T>;
  }

  function evaluateCompiled<T = unknown>(compiled: CompiledRuntimeValue<T>, scope: ScopeRef): T {
    return expressionCompiler.evaluateValue(compiled, scope, getEnv()) as T;
  }

  function evaluate<T = unknown>(target: unknown, scope: ScopeRef): T {
    return evaluateCompiled(compileValue<T>(target as T), scope);
  }

  return { evaluate, compileValue, evaluateCompiled };
}
