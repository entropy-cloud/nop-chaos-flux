import type { SchemaValue } from '@nop-chaos/flux-core';
import { describe, expect, it, vi } from 'vitest';
import { staticCompiled } from './action-dispatcher-test-support.js';
import { createActionDispatcher } from '../action-dispatcher/index.js';
import { SYNTHETIC_BRANCH_EVENT_TYPES } from '../action-dispatcher/action-diagnostics.js';
import { createActionCtx, createMockAdapter, createTestDispatcher, makeCompiledProgram } from './action-dispatcher-test-support.js';

// plan 841 错②/错⑤: the onActionError hook's own failure now reaches the
// monitor channel (phase 'action'), and the synthetic branch event list is a
// named single-source constant.

function failingProgram() {
  return makeCompiledProgram([
    {
      action: 'testFail',
      when: undefined,
      payload: { args: staticCompiled({}) },
      targeting: {},
      control: {},
      source: { action: 'testFail' },
    },
  ]);
}

describe('action dispatcher monitor channel (plan 841 错②)', () => {
  it('emits one action-phase monitor event when the onActionError hook throws', async () => {
    const monitor = vi.fn();
    const onActionError = vi.fn(() => {
      throw new Error('hook-boom');
    });
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async () => {
        throw new Error('primary failure');
      }),
    });
    const base = createTestDispatcher({ adapter });

    const configured = createActionDispatcher({
      getEnv: () => base.env,
      evaluator: base.evaluator,
      adapter,
      expressionCompiler: base.runtime.expressionCompiler,
      actionProgramCompiler: {
        compile: vi.fn((action) =>
          makeCompiledProgram([
            {
              action: (action as { action: string }).action,
              when: undefined,
              payload: { args: staticCompiled({} as Record<string, SchemaValue>) },
              targeting: {},
              control: {},
              source: action,
            },
          ]),
        ),
      },
      onActionError,
      monitor,
    });

    await configured.dispatch(failingProgram(), createActionCtx({ runtime: base.runtime }));

    expect(onActionError).toHaveBeenCalledTimes(1);
    expect(monitor).toHaveBeenCalledTimes(1);
    expect(monitor).toHaveBeenCalledWith({
      type: 'error',
      phase: 'action',
      error: expect.any(Error),
      details: { source: 'onActionError-hook' },
    });
  });

  it('emits zero monitor events when no monitor is configured', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async () => {
        throw new Error('primary failure');
      }),
    });
    const base = createTestDispatcher({ adapter });

    const configured = createActionDispatcher({
      getEnv: () => base.env,
      evaluator: base.evaluator,
      adapter,
      expressionCompiler: base.runtime.expressionCompiler,
      actionProgramCompiler: {
        compile: vi.fn(() => failingProgram()),
      },
    });

    const result = await configured.dispatch(
      failingProgram(),
      createActionCtx({ runtime: base.runtime }),
    );
    expect(result.ok).toBe(false);
  });

  it('survives a throwing monitor without breaking the failure path', async () => {
    const monitor = vi.fn(() => {
      throw new Error('monitor-boom');
    });
    const onActionError = vi.fn(() => {
      throw new Error('hook-boom');
    });
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async () => {
        throw new Error('primary failure');
      }),
    });
    const base = createTestDispatcher({ adapter });

    const configured = createActionDispatcher({
      getEnv: () => base.env,
      evaluator: base.evaluator,
      adapter,
      expressionCompiler: base.runtime.expressionCompiler,
      actionProgramCompiler: {
        compile: vi.fn(() => failingProgram()),
      },
      onActionError,
      monitor,
    });

    const result = await configured.dispatch(
      failingProgram(),
      createActionCtx({ runtime: base.runtime }),
    );
    expect(result.ok).toBe(false);
    expect(monitor).toHaveBeenCalledTimes(1);
  });
});

describe('SYNTHETIC_BRANCH_EVENT_TYPES (plan 841 错⑤)', () => {
  it('is the single named source covering the three synthetic branch events', () => {
    expect([...SYNTHETIC_BRANCH_EVENT_TYPES].sort()).toEqual([
      'actionError',
      'actionSettled',
      'actionSettledError',
    ]);
  });
});
