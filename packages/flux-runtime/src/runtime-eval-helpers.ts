import type {
  CompiledRuntimeValue,
  ExpressionCompiler,
  RendererEnv,
  ScopeRef,
} from '@nop-chaos/flux-core';

export interface RuntimeEvalHelpers {
  evaluate<T = unknown>(target: unknown, scope: ScopeRef): T;
  compileValue<T = unknown>(target: T): CompiledRuntimeValue<T>;
  evaluateCompiled<T = unknown>(compiled: CompiledRuntimeValue<T>, scope: ScopeRef): T;
}

export function createRuntimeEvalHelpers(
  expressionCompiler: ExpressionCompiler,
  getEnv: () => RendererEnv,
): RuntimeEvalHelpers {
  const compiledValueCache = new WeakMap<object, ReturnType<ExpressionCompiler['compileValue']>>();

  function compileValue<T = unknown>(target: T): CompiledRuntimeValue<T> {
    const cacheable = target != null && typeof target === 'object';

    if (!cacheable) {
      return expressionCompiler.compileValue(target);
    }

    const cached = compiledValueCache.get(target as object);

    if (cached) {
      // Safe: compileValue<T> returns CompiledRuntimeValue<T>; cache stores what we put in.
      return cached as CompiledRuntimeValue<T>;
    }

    const compiled = expressionCompiler.compileValue(target);
    compiledValueCache.set(target as object, compiled);
    // Safe: compiled is the direct result of compileValue<T>.
    return compiled as CompiledRuntimeValue<T>;
  }

  function evaluateCompiled<T = unknown>(compiled: CompiledRuntimeValue<T>, scope: ScopeRef): T {
    const result = expressionCompiler.evaluateValue(compiled, scope, getEnv());
    // Safe: evaluateValue returns a value that conforms to T by construction —
    // the compiled expression produces the type T when evaluated.
    return result as T;
  }

  function evaluate<T = unknown>(target: unknown, scope: ScopeRef): T {
    // Safe: target is the runtime value which conforms to T; T is compile-time only.
    return evaluateCompiled(compileValue(target as T), scope);
  }

  return { evaluate, compileValue, evaluateCompiled };
}
