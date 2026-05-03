import { describe, expect, it, vi } from 'vitest';
import type {
  ActionContext,
  ActionResult,
  ActionRuntimeAdapter,
  BuiltInActionInvocation,
  ComponentActionInvocation,
  CompiledRuntimeValue,
  CompiledActionProgram,
  RendererRuntime,
  RendererEnv,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { createActionDispatcher } from '../action-dispatcher';
import type { ActionEvaluator } from '../action-core';

function createMockScope(): ScopeRef {
  const data: Record<string, unknown> = {};
  return {
    id: 'scope-test',
    path: 'scope',
    parent: undefined,
    store: {
      subscribe: () => () => {},
      getSnapshot: () => data,
      getLastChange: () => undefined,
      setSnapshot: () => {},
    },
    value: data,
    get: () => undefined,
    has: () => false,
    readOwn: () => ({ ...data }),
    readVisible: () => ({ ...data }),
    materializeVisible: () => ({ ...data }),
    update: () => {},
    merge: () => {},
  };
}

function staticCompiled<T>(value: T): CompiledRuntimeValue<T> {
  return {
    kind: 'static',
    isStatic: true,
    node: { kind: 'static', value } as any,
    value,
  };
}

function createMockEvaluator(): ActionEvaluator {
  return {
    evaluate: <T = unknown>(target: unknown): T => target as T,
    compileValue: <T = unknown>(target: T) => staticCompiled(target),
    evaluateCompiled: <T = unknown>(compiled: CompiledRuntimeValue<T>): T =>
      compiled.isStatic ? compiled.value : (undefined as T),
  };
}

function createMockAdapter(overrides?: Partial<ActionRuntimeAdapter>): ActionRuntimeAdapter {
  return {
    invokeBuiltInAction: vi.fn(async (): Promise<ActionResult> => ({ ok: true })),
    invokeComponentAction: vi.fn(async (): Promise<ActionResult> => ({ ok: true })),
    invokeNamespacedAction: vi.fn(async (): Promise<ActionResult> => ({ ok: true })),
    ...overrides,
  };
}

function createMockEnv(): RendererEnv {
  return {
    fetcher: vi.fn(),
    notify: vi.fn(),
    monitor: {
      onActionStart: vi.fn(),
      onActionEnd: vi.fn(),
    },
  };
}

function createMockRuntime(env?: RendererEnv): RendererRuntime {
  return {
    runtimeId: 'test-runtime',
    env: env ?? createMockEnv(),
    expressionCompiler: {
      compileValue: <T = unknown>(input: T) => staticCompiled(input),
      compileNode: <T = unknown>(input: T) => ({ kind: 'static' as const, value: input }),
    } as any,
    schemaCompiler: { compile: vi.fn() },
    plugins: [],
    importStack: { push: vi.fn(), pop: vi.fn(), peek: vi.fn() },
    compile: vi.fn(),
    evaluate: vi.fn(),
    allocateMountedCid: vi.fn(() => 1),
    resolveTarget: vi.fn(),
    resolveNodeMeta: vi.fn(),
    resolveNodeProps: vi.fn(),
    createChildScope: vi.fn(),
  } as unknown as RendererRuntime;
}

function createActionCtx(overrides?: Partial<ActionContext>): ActionContext {
  return {
    runtime: createMockRuntime(),
    scope: createMockScope(),
    ...overrides,
  };
}

function makeCompiledProgram(nodes: CompiledActionProgram['nodes']): CompiledActionProgram {
  return { nodes, isFullyStatic: false };
}

describe('action-dispatcher dispatch ordering', () => {
  it('dispatches built-in setValue through adapter', async () => {
    const adapter = createMockAdapter();
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator = createMockEvaluator();
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'name', value: 'hello' }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'name', value: 'hello' } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(adapter.invokeBuiltInAction).toHaveBeenCalledOnce();
    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.action).toBe('setValue');
    expect(invocation.args).toEqual({ path: 'name', value: 'hello' });
  });

  it('dispatches built-in showToast through adapter', async () => {
    const adapter = createMockAdapter();
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator = createMockEvaluator();
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'showToast',
          payload: { args: staticCompiled({ message: 'hi' }) },
          targeting: {},
          control: {},
          source: { action: 'showToast', args: { message: 'hi' } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.action).toBe('showToast');
  });

  it('dispatches submitForm with formId through built-in adapter without local form runtime', async () => {
    const adapter = createMockAdapter();
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator = createMockEvaluator();
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'submitForm',
          payload: {},
          targeting: { formId: 'remote-form' },
          control: {},
          source: { action: 'submitForm', formId: 'remote-form' },
        },
      ]),
      createActionCtx({ runtime, form: undefined }),
    );

    expect(result.ok).toBe(true);
    expect(adapter.invokeBuiltInAction).toHaveBeenCalledOnce();
    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.action).toBe('submitForm');
    expect(invocation.targeting).toEqual({ formId: 'remote-form' });
  });

  it('executes sequential actions in order', async () => {
    const order: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (invocation) => {
        order.push(invocation.action);
        return { ok: true };
      },
    });
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator = createMockEvaluator();
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'a', value: 1 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'a', value: 1 } },
        },
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'b', value: 2 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'b', value: 2 } },
        },
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'c', value: 3 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'c', value: 3 } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(order).toEqual(['setValue', 'setValue', 'setValue']);
  });

  it('stops on failure unless continueOnError is set', async () => {
    const order: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (invocation) => {
        order.push(invocation.action);
        if (invocation.action === 'showToast') {
          return { ok: false, error: new Error('toast failed') };
        }
        return { ok: true };
      },
    });
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator = createMockEvaluator();
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'a', value: 1 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'a', value: 1 } },
        },
        {
          action: 'showToast',
          payload: { args: staticCompiled({ message: 'x' }) },
          targeting: {},
          control: {},
          source: { action: 'showToast', args: { message: 'x' } },
        },
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'b', value: 2 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'b', value: 2 } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(order).toEqual(['setValue', 'showToast']);
  });

  it('continues on failure when continueOnError is true', async () => {
    const order: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (invocation) => {
        order.push(invocation.action);
        if (invocation.action === 'showToast') {
          return { ok: false, error: new Error('fail') };
        }
        return { ok: true };
      },
    });
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator = createMockEvaluator();
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'a', value: 1 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'a', value: 1 } },
        },
        {
          action: 'showToast',
          payload: { args: staticCompiled({ message: 'x' }) },
          targeting: {},
          control: { continueOnError: true },
          source: { action: 'showToast', args: { message: 'x' }, continueOnError: true },
        },
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'b', value: 2 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'b', value: 2 } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(order).toEqual(['setValue', 'showToast', 'setValue']);
  });

  it('dispatches component: actions through component adapter', async () => {
    const adapter = createMockAdapter();
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator = createMockEvaluator();
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'component:doStuff',
          payload: {},
          targeting: { componentId: 'my-comp' },
          control: {},
          source: { action: 'component:doStuff', componentId: 'my-comp' },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(adapter.invokeComponentAction).toHaveBeenCalledOnce();
    const invocation = (adapter.invokeComponentAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as ComponentActionInvocation;
    expect(invocation.method).toBe('doStuff');
  });

  it('fires monitor onActionStart and onActionEnd', async () => {
    const adapter = createMockAdapter();
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator = createMockEvaluator();
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'x', value: 1 } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(env.monitor?.onActionStart).toHaveBeenCalledOnce();
    expect(env.monitor?.onActionEnd).toHaveBeenCalledOnce();
  });

  it('runs onError branch when action fails', async () => {
    const order: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (invocation) => {
        order.push(invocation.action);
        if (invocation.action === 'setValue') {
          return { ok: false, error: new Error('fail') };
        }
        return { ok: true };
      },
    });
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator = createMockEvaluator();
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'x', value: 1 } },
          onError: [
            {
              action: 'showToast',
              payload: { args: staticCompiled({ message: 'recovered' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'recovered' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(order).toEqual(['setValue', 'showToast']);
    expect(result.ok).toBe(false);
  });

  it('runs then branch when action succeeds', async () => {
    const order: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (invocation) => {
        order.push(invocation.action);
        return { ok: true };
      },
    });
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator = createMockEvaluator();
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'x', value: 1 } },
          then: [
            {
              action: 'showToast',
              payload: { args: staticCompiled({ message: 'done' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'done' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(order).toEqual(['setValue', 'showToast']);
  });

  it('runs onSettled branch for both success and failure', async () => {
    const order: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (invocation) => {
        order.push(invocation.action);
        if (invocation.action === 'setValue') {
          return { ok: false, error: new Error('fail') };
        }
        return { ok: true };
      },
    });
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator = createMockEvaluator();
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'x', value: 1 } },
          onError: [
            {
              action: 'showToast',
              payload: { args: staticCompiled({ message: 'err' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'err' } },
            },
          ],
          onSettled: [
            {
              action: 'setValue',
              payload: { args: staticCompiled({ path: 'settled', value: true }) },
              targeting: {},
              control: {},
              source: { action: 'setValue', args: { path: 'settled', value: true } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(order).toContain('setValue');
    expect(order).toContain('showToast');
    expect(order[order.length - 1]).toBe('setValue');
  });

  it('dispatches parallel actions and combines results', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (invocation) => {
        return { ok: true, data: invocation.action };
      },
    });
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator = createMockEvaluator();
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: '__parallel__',
          payload: {},
          targeting: {},
          control: {},
          source: { action: '__parallel__' },
          parallel: [
            {
              action: 'setValue',
              payload: { args: staticCompiled({ path: 'a', value: 1 }) },
              targeting: {},
              control: {},
              source: { action: 'setValue', args: { path: 'a', value: 1 } },
            },
            {
              action: 'showToast',
              payload: { args: staticCompiled({ message: 'hi' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'hi' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(2);
  });

  it('returns unsupported action error for unknown action types', async () => {
    const adapter = createMockAdapter();
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator = createMockEvaluator();
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'unknownAction',
          payload: {},
          targeting: {},
          control: {},
          source: { action: 'unknownAction' },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toContain('Unsupported action');
  });

  it('skips action when when-condition evaluates to false', async () => {
    const adapter = createMockAdapter();
    const env = createMockEnv();
    const runtime = createMockRuntime(env);
    const evaluator: ActionEvaluator = {
      evaluate: <T = unknown>(target: unknown): T => target as T,
      compileValue: <T = unknown>(target: T) => staticCompiled(target),
      evaluateCompiled: <T = unknown>(compiled: CompiledRuntimeValue<T>): T =>
        compiled.isStatic ? compiled.value : (undefined as T),
    };
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator,
      adapter,
      runtime,
    });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: {},
          when: staticCompiled(false),
          source: { action: 'setValue', args: { path: 'x', value: 1 } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });
});
