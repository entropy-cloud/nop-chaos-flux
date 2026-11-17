import type { ActionOutcome, ActionSchema, RendererPlugin } from '@nop-chaos/flux-core';
import { describe, expect, it, vi } from 'vitest';
import { staticCompiled } from './action-dispatcher-test-support.js';
import { createActionDispatcher } from '../action-dispatcher/index.js';
import { createActionCtx, createMockAdapter, createTestDispatcher, makeCompiledProgram } from './action-dispatcher-test-support.js';

// M1 (plan 2026-11-18-m1): RendererPlugin.afterAction emission on the dispatch
// settle path — success and failure both report; zero plugins = zero calls.

function program(action: string, args: Record<string, unknown> = { path: 'a', value: 1 }) {
  return makeCompiledProgram([
    {
      action,
      when: undefined,
      payload: { args: staticCompiled(args as never) },
      targeting: {},
      control: {},
      source: { action },
    },
  ]);
}

function makeDispatcher(plugins: RendererPlugin[], adapter = createMockAdapter()) {
  const base = createTestDispatcher({ adapter });
  const dispatcher = createActionDispatcher({
    getEnv: () => base.env,
    evaluator: base.evaluator,
    adapter,
    expressionCompiler: base.runtime.expressionCompiler,
    actionProgramCompiler: {
      compile: (action) =>
        makeCompiledProgram([
          {
            action: (action as unknown as { action: string }).action,
            when: undefined,
            payload: { args: staticCompiled({} as never) },
            targeting: {},
            control: {},
            source: action as ActionSchema,
          },
        ]),
    },
    plugins,
  });
  return { dispatcher, runtime: base.runtime };
}

describe('RendererPlugin.afterAction (M1)', () => {
  it('emits a success outcome on the settle path', async () => {
    const afterAction = vi.fn();
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = makeDispatcher([{ name: 'spy', afterAction }], adapter);
    await dispatcher.dispatch(program('ajax', { url: 'x' }), createActionCtx({ runtime, interactionId: 'i-1' }));
    expect(afterAction).toHaveBeenCalledTimes(1);
    const outcome = afterAction.mock.calls[0]![0] as ActionOutcome;
    expect(outcome.status).toBe('success');
    expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
    expect(outcome.interactionId).toBe('i-1');
  });

  it('emits a failed outcome with the error message', async () => {
    const afterAction = vi.fn();
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    const { dispatcher, runtime } = makeDispatcher([{ name: 'spy', afterAction }], adapter);
    await dispatcher.dispatch(program('ajax', { url: 'x' }), createActionCtx({ runtime }));
    expect(afterAction).toHaveBeenCalledTimes(1);
    const outcome = afterAction.mock.calls[0]![0] as ActionOutcome;
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.message).toBe('boom');
  });

  it('emits nothing when no plugins are registered', async () => {
    const { dispatcher, runtime } = makeDispatcher([]);
    const result = await dispatcher.dispatch(program('ajax', { url: 'x' }), createActionCtx({ runtime }));
    expect(result).toBeDefined();
  });
});
