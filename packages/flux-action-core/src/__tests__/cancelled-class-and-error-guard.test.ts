import { describe, expect, it, vi } from 'vitest';
import {
  createActionCtx,
  createMockAdapter,
  createMockEnv,
  createTestDispatcher,
  makeCompiledProgram,
  staticCompiled,
} from './action-dispatcher-test-support.js';

describe('cancelled result follows failure-class semantics', () => {
  it('runs onError when action returns cancelled result', async () => {
    const order: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async (invocation) => {
        order.push(invocation.action);
        if (invocation.action === 'setValue') {
          return {
            ok: false,
            cancelled: true,
            error: new Error('aborted'),
          };
        }
        return { ok: true };
      }),
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
              payload: { args: staticCompiled({ message: 'err' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'err' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.cancelled).toBe(true);
    expect(order).toEqual(['setValue', 'showToast']);
  });

  it('runs onSettled for cancelled result', async () => {
    const order: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async (invocation) => {
        order.push(invocation.action);
        if (invocation.action === 'setValue') {
          return { ok: false, cancelled: true, error: new Error('aborted') };
        }
        return { ok: true };
      }),
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
          onSettled: [
            {
              action: 'showToast',
              payload: { args: staticCompiled({ message: 'settled' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'settled' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(order).toContain('setValue');
    expect(order).toContain('showToast');
  });

  it('stops chain for cancelled result when continueOnError is not set', async () => {
    const order: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async (invocation) => {
        order.push(invocation.action);
        if (invocation.args && (invocation.args as Record<string, unknown>).path === 'first') {
          return { ok: false, cancelled: true };
        }
        return { ok: true };
      }),
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'first', value: 1 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'first', value: 1 } },
        },
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'second', value: 2 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'second', value: 2 } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(order).toEqual(['setValue']);
  });

  it('continues after cancelled result only when continueOnError is true', async () => {
    const order: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async (invocation) => {
        order.push(invocation.action);
        if (invocation.args && (invocation.args as Record<string, unknown>).path === 'first') {
          return { ok: false, cancelled: true };
        }
        return { ok: true };
      }),
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'first', value: 1 }) },
          targeting: {},
          control: { continueOnError: true },
          source: { action: 'setValue', args: { path: 'first', value: 1 }, continueOnError: true },
        },
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'second', value: 2 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'second', value: 2 } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(order).toEqual(['setValue', 'setValue']);
  });
});

describe('onActionStart throwing does not crash dispatch chain', () => {
  it('catches onActionStart error and returns failure result', async () => {
    const adapter = createMockAdapter();
    const startError = new Error('monitor start broke');
    const env = createMockEnv();
    env.monitor = {
      onActionStart: vi.fn(() => {
        throw startError;
      }),
      onActionEnd: vi.fn(),
    };
    const { dispatcher, runtime } = createTestDispatcher({ adapter, env });

    const result = await dispatcher.dispatch(
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

    expect(result.ok).toBe(false);
    expect(result.error).toBe(startError);
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });
});

describe('onError dispatch throwing is caught', () => {
  it('handles onError action failure gracefully without unhandled rejection', async () => {
    const onErrorError = new Error('onError handler blew up');
    const onActionError = vi.fn();
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async (invocation) => {
        if (invocation.action === 'setValue') {
          return { ok: false, error: new Error('primary fail') };
        }
        if (invocation.action === 'showToast') {
          throw onErrorError;
        }
        return { ok: true };
      }),
    });
    const env = createMockEnv();
    const { createActionDispatcher } = await import('../action-dispatcher.js');
    const runtime = {
      ...createTestDispatcher({ adapter, env }).runtime,
    };
    const dispatcher = createActionDispatcher({
      getEnv: () => env,
      evaluator: {
        evaluate: <T = unknown>(target: unknown): T => target as T,
        compileValue: <T = unknown>(target: T) => staticCompiled(target),
        evaluateCompiled: <T = unknown>(compiled: any): T =>
          compiled.isStatic ? compiled.value : (undefined as T),
      },
      adapter,
      onActionError,
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
              payload: { args: staticCompiled({ message: 'err' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'err' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(onActionError).toHaveBeenCalledWith(onErrorError, expect.anything());
  });
});
