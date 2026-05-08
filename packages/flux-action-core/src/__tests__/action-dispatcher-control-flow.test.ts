import { describe, expect, it, vi } from 'vitest';
import type { CompiledRuntimeValue } from '@nop-chaos/flux-core';
import {
  createActionCtx,
  createMockAdapter,
  createMockEnv,
  createTestDispatcher,
  makeCompiledProgram,
  staticCompiled,
} from './action-dispatcher-test-support.js';
import type { ActionEvaluator } from '../action-core.js';

describe('action-dispatcher control flow', () => {
  it('executes sequential actions in order', async () => {
    const order: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (invocation) => {
        order.push(invocation.action);
        return { ok: true };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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

  it('preserves settled-branch failure as settledError without replacing the primary result', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (invocation) => {
        if (invocation.action === 'showToast') {
          return { ok: false, error: new Error('settled failed') };
        }

        return { ok: true, data: 'primary success' };
      },
    });
    const env = createMockEnv();
    const { dispatcher, runtime } = createTestDispatcher({ adapter, env });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'x', value: 1 } },
          onSettled: [
            {
              action: 'showToast',
              payload: { args: staticCompiled({ message: 'cleanup' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'cleanup' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result).toMatchObject({ ok: true, data: 'primary success' });
    expect(result.settledError).toBeInstanceOf(Error);
    expect((result.settledError as Error).message).toBe('settled failed');
    expect(env.notify).not.toHaveBeenCalled();
  });

  it('captures normalized thrown onSettled errors as settledError without notifying', async () => {
    const thrownError = new Error('settled threw');
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async (invocation) => {
        if (invocation.action === 'showToast') {
          throw thrownError;
        }

        return { ok: true };
      }),
    });
    const env = createMockEnv();
    const { dispatcher, runtime } = createTestDispatcher({ adapter, env });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'x', value: 1 } },
          onSettled: [
            {
              action: 'showToast',
              payload: { args: staticCompiled({ message: 'cleanup' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'cleanup' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.settledError).toBe(thrownError);
    expect(env.notify).not.toHaveBeenCalled();
  });

  it('skips action when when-condition evaluates to false', async () => {
    const adapter = createMockAdapter();
    const evaluator: ActionEvaluator = {
      evaluate: <T = unknown>(target: unknown): T => target as T,
      compileValue: <T = unknown>(target: T) => staticCompiled(target),
      evaluateCompiled: <T = unknown>(compiled: CompiledRuntimeValue<T>): T =>
        compiled.isStatic ? compiled.value : (undefined as T),
    };
    const { dispatcher, runtime } = createTestDispatcher({ adapter, evaluator });

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
