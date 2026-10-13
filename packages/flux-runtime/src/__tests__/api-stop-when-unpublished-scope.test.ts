import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  CompiledRuntimeValue,
  RendererRuntime,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { ApiCacheStore } from '../async-data/api-cache.js';
import type { CreateApiDataSourceControllerInput } from '../async-data/api-data-source-controller-types.js';
import {
  createApiDataSourceControllerMutableState,
  evaluateControllerStopCondition,
} from '../async-data/api-data-source-controller-state.js';
import { env } from './test-fixtures.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

const WARN_PREFIX =
  '[stopWhen] null-member access during evaluation (scope may not yet have data):';

function createMockScope(): ScopeRef {
  const data: Record<string, unknown> = {};
  return {
    id: 'test-scope',
    path: '',
    get: (path: string) => data[path],
    has: (path: string) => path in data,
    update: (path: string, value: unknown) => {
      data[path] = value;
    },
    merge: (values: Record<string, unknown>) => {
      Object.assign(data, values);
    },
    readOwn: () => ({ ...data }),
    readVisible: () => ({ ...data }),
    materializeVisible: () => ({ ...data }),
    value: data,
  } as ScopeRef;
}

function createInput(input: {
  evaluateCompiled: RendererRuntime['evaluateCompiled'];
  scope: ScopeRef;
}): CreateApiDataSourceControllerInput {
  return {
    runtime: {
      env,
      evaluateCompiled: input.evaluateCompiled,
    } as unknown as RendererRuntime,
    apiCache: {} as ApiCacheStore,
    dispatch: vi.fn(),
    scope: input.scope,
    stopWhen: expressionCompiler.compileValue('${stopSignal.done}') as unknown as CompiledRuntimeValue<boolean>,
    interval: 1000,
  } as unknown as CreateApiDataSourceControllerInput;
}

function realEvaluateCompiled<T>(target: CompiledRuntimeValue<T>, scope: ScopeRef): T {
  // Same delegation as the runtime's evaluateCompiled adapter
  // (runtime-eval-helpers): evaluateValue against the current env.
  return expressionCompiler.evaluateValue(target, scope, env);
}

describe('evaluateControllerStopCondition — unpublished scope tolerance (582 CX-4 point 3 pin)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns false, keeps the controller out of the error state, and warns in non-production when stopWhen hits an unpublished scope variable', () => {
    const scope = createMockScope();
    const input = createInput({ evaluateCompiled: realEvaluateCompiled, scope });
    const mutable = createApiDataSourceControllerMutableState(input);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = evaluateControllerStopCondition(input, mutable);

    expect(result).toBe(false);
    expect(mutable.state.status).not.toBe('error');
    expect(mutable.state.error).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(WARN_PREFIX));
  });

  it('stays silent in production while keeping the same false degradation (NODE_ENV injected per plan 582 M1 exemption note)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const scope = createMockScope();
    const input = createInput({ evaluateCompiled: realEvaluateCompiled, scope });
    const mutable = createApiDataSourceControllerMutableState(input);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = evaluateControllerStopCondition(input, mutable);

    expect(result).toBe(false);
    expect(mutable.state.status).not.toBe('error');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('keeps the strict error path for non-sentinel stopWhen failures', () => {
    const scope = createMockScope();
    const input = createInput({
      evaluateCompiled: () => {
        throw new TypeError('boom is not a function');
      },
      scope,
    });
    const mutable = createApiDataSourceControllerMutableState(input);

    const result = evaluateControllerStopCondition(input, mutable);

    expect(result).toBe(true);
    expect(mutable.state.status).toBe('error');
  });
});
