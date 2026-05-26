import { vi } from 'vitest';
import type {
  ActionContext,
  ActionResult,
  ActionRuntimeAdapter,
  CompiledActionProgram,
  CompiledRuntimeValue,
  RendererEnv,
  RendererRuntime,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { createActionDispatcher } from '../action-dispatcher.js';
import type { ActionEvaluator } from '../action-core.js';

export function createMockScope(): ScopeRef {
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

export function staticCompiled<T>(value: T): CompiledRuntimeValue<T> {
  return {
    kind: 'static',
    isStatic: true,
    node: { kind: 'static', value } as any,
    value,
  };
}

export function createMockEvaluator(): ActionEvaluator {
  return {
    evaluate: <T = unknown>(target: unknown): T => target as T,
    compileValue: <T = unknown>(target: T) => staticCompiled(target),
    evaluateCompiled: <T = unknown>(compiled: CompiledRuntimeValue<T>): T =>
      compiled.isStatic ? compiled.value : (undefined as T),
  };
}

export function createMockAdapter(
  overrides?: Partial<ActionRuntimeAdapter>,
): ActionRuntimeAdapter {
  return {
    invokeBuiltInAction: vi.fn(async (): Promise<ActionResult> => ({ ok: true })),
    invokeComponentAction: vi.fn(async (): Promise<ActionResult> => ({ ok: true })),
    invokeNamespacedAction: vi.fn(async (): Promise<ActionResult> => ({ ok: true })),
    ...overrides,
  };
}

export function createMockEnv(): RendererEnv {
  return {
    fetcher: vi.fn(),
    notify: vi.fn(),
    monitor: {
      onActionStart: vi.fn(),
      onActionEnd: vi.fn(),
    },
  };
}

export function createMockRuntime(env?: RendererEnv): RendererRuntime {
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

export function createActionCtx(overrides?: Partial<ActionContext>): ActionContext {
  return {
    runtime: createMockRuntime(),
    scope: createMockScope(),
    ...overrides,
  };
}

export function makeCompiledProgram(
  nodes: CompiledActionProgram['nodes'],
): CompiledActionProgram {
  return { nodes, isFullyStatic: false };
}

export function createTestDispatcher(options?: {
  adapter?: ActionRuntimeAdapter;
  env?: RendererEnv;
  evaluator?: ActionEvaluator;
  runtime?: RendererRuntime;
}) {
  const env = options?.env ?? createMockEnv();
  const runtime = options?.runtime ?? createMockRuntime(env);
  const evaluator = options?.evaluator ?? createMockEvaluator();
  const adapter = options?.adapter ?? createMockAdapter();

  const dispatcher = createActionDispatcher({
    getEnv: () => env,
    evaluator,
    adapter,
    expressionCompiler: runtime.expressionCompiler,
    actionProgramCompiler: {
      compile: vi.fn((action) => {
        if (
          action &&
          typeof action === 'object' &&
          'nodes' in action &&
          Array.isArray((action as CompiledActionProgram).nodes)
        ) {
          return action as CompiledActionProgram;
        }

        return makeCompiledProgram([]);
      }),
    },
  });

  return { dispatcher, adapter, env, evaluator, runtime };
}
