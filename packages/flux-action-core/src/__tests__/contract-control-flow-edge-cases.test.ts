import { describe, expect, it, vi } from 'vitest';
import {
  createActionCtx,
  createMockAdapter,
  createMockEvaluator,
  createTestDispatcher,
  makeCompiledProgram,
  staticCompiled,
} from './action-dispatcher-test-support.js';

describe('contract: result chaining in then branches', () => {
  it('then branch failure becomes the final chain result', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        if (inv.action === 'showToast') return { ok: false, error: new Error('then-fail') };
        return { ok: true, data: inv.action };
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
          then: [
            {
              action: 'showToast',
              payload: { args: staticCompiled({ message: 'x' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'x' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('then-fail');
  });

  it('then branch success replaces previous for next sibling', async () => {
    let idx = 0;
    const dataValues = ['first', 'second', 'third'];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async () => ({ ok: true, data: dataValues[idx++] }),
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
          then: [
            {
              action: 'setValue',
              payload: { args: staticCompiled({ path: 'y', value: 2 }) },
              targeting: {},
              control: {},
              source: { action: 'setValue', args: { path: 'y', value: 2 } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.data).toBe('second');
  });
});

describe('contract: onError branch result handling', () => {
  it('returns original failure when onError runs and continueOnError is false', async () => {
    const originalError = new Error('original-fail');
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        if (inv.action === 'setValue') return { ok: false, error: originalError };
        return { ok: true, data: 'recovered' };
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
              payload: { args: staticCompiled({ message: 'handle' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'handle' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe(originalError);
  });

  it('continueOnError with onError: next action sees onError result as prevResult', async () => {
    const actionsSeen: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        actionsSeen.push(inv.action);
        if (inv.action === 'showToast') return { ok: false, error: new Error('fail') };
        return { ok: true, data: inv.action };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'showToast',
          payload: { args: staticCompiled({ message: 'x' }) },
          targeting: {},
          control: { continueOnError: true },
          source: { action: 'showToast', args: { message: 'x' }, continueOnError: true },
          onError: [
            {
              action: 'setValue',
              payload: { args: staticCompiled({ path: 'recovery', value: true }) },
              targeting: {},
              control: {},
              source: { action: 'setValue', args: { path: 'recovery', value: true } },
            },
          ],
        },
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'after', value: 1 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'after', value: 1 } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(actionsSeen).toEqual(['showToast', 'setValue', 'setValue']);
    expect(result.ok).toBe(true);
    expect(result.data).toBe('setValue');
  });

  it('onError failure does not recursively retrigger parent onError', async () => {
    const actionsSeen: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        actionsSeen.push(inv.action);
        if (inv.action === 'setValue') return { ok: false, error: new Error('fail') };
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
              action: 'setValue',
              payload: { args: staticCompiled({ path: 'y', value: 2 }) },
              targeting: {},
              control: {},
              source: { action: 'setValue', args: { path: 'y', value: 2 } },
              onError: [
                {
                  action: 'showToast',
                  payload: { args: staticCompiled({ message: 'nested' }) },
                  targeting: {},
                  control: {},
                  source: { action: 'showToast', args: { message: 'nested' } },
                },
              ],
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(actionsSeen).toEqual(['setValue', 'setValue', 'showToast']);
    expect(result.ok).toBe(false);
  });
});

describe('contract: skipped action (when=false) branch behavior', () => {
  const makeEvaluator = () => createMockEvaluator();

  it('does not run then branch for skipped action', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter, evaluator: makeEvaluator() });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: {},
          when: staticCompiled(false),
          source: { action: 'setValue', args: { path: 'x', value: 1 } },
          then: [
            {
              action: 'showToast',
              payload: { args: staticCompiled({ message: 'should-not-run' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'should-not-run' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });

  it('does not run onError branch for skipped action', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter, evaluator: makeEvaluator() });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: {},
          when: staticCompiled(false),
          source: { action: 'setValue', args: { path: 'x', value: 1 } },
          onError: [
            {
              action: 'showToast',
              payload: { args: staticCompiled({ message: 'should-not-run' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'should-not-run' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });

  it('does not run onSettled for skipped (neutral-class) action', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter, evaluator: makeEvaluator() });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: {},
          when: staticCompiled(false),
          source: { action: 'setValue', args: { path: 'x', value: 1 } },
          onSettled: [
            {
              action: 'showToast',
              payload: { args: staticCompiled({ message: 'should-not-run' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'should-not-run' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });
});

describe('contract: empty action program', () => {
  it('returns ok:true for empty nodes array', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });
});

describe('contract: onSettled sees original triggering result', () => {
  it('onSettled receives original result through evaluation bindings, not then replacement', async () => {
    const builtinMock = vi.fn(async (inv: any) => {
      if (inv.action === 'showToast') return { ok: true, data: 'then-result' };
      if (inv.action === 'navigate') return { ok: true, data: 'settled-result' };
      return { ok: true, data: 'primary' };
    });
    const adapter = createMockAdapter({ invokeBuiltInAction: builtinMock });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
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
              payload: { args: staticCompiled({ message: 'then' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'then' } },
            },
          ],
          onSettled: [
            {
              action: 'navigate',
              payload: { args: staticCompiled({ url: '/done' }) },
              targeting: {},
              control: {},
              source: { action: 'navigate', args: { url: '/done' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(builtinMock).toHaveBeenCalledTimes(3);
    expect(result.data).toBe('then-result');
  });
});

describe('contract: parallel edge cases', () => {
  it('parallel with all successes includes neutral (skipped) children in success aggregate', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        if (inv.action === 'showToast') return { ok: true, skipped: true };
        return { ok: true, data: inv.action };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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
    expect(result.results![0].ok).toBe(true);
    expect(result.results![1].skipped).toBe(true);
  });

  it('parallel does not cancel sibling when one fails (all siblings complete)', async () => {
    const completed: string[] = [];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => {
        completed.push(inv.action);
        if (inv.action === 'showToast') return { ok: false, error: new Error('fail') };
        return { ok: true, data: inv.action };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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
              payload: { args: staticCompiled({ message: 'fail' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'fail' } },
            },
            {
              action: 'setValue',
              payload: { args: staticCompiled({ path: 'b', value: 2 }) },
              targeting: {},
              control: {},
              source: { action: 'setValue', args: { path: 'b', value: 2 } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(completed).toContain('showToast');
    expect(completed.filter((a) => a === 'setValue')).toHaveLength(2);
  });

  it('parallel with single child succeeds', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => ({ ok: true, data: inv.action }),
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(1);
  });
});

describe('contract: synchronous throw from adapter', () => {
  it('catches synchronous throw and returns failure result', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async () => {
        throw new Error('sync-throw');
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
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('sync-throw');
  });
});

describe('contract: timeout integration with dispatcher', () => {
  it('timeout returns timedOut result with cancelled flag', async () => {
    vi.useFakeTimers();
    try {
      const adapter = createMockAdapter({
        invokeBuiltInAction: async () => {
          await new Promise(() => {});
          return { ok: true };
        },
      });
      const { dispatcher, runtime } = createTestDispatcher({ adapter });

      const promise = dispatcher.dispatch(
        makeCompiledProgram([
          {
            action: 'setValue',
            payload: { args: staticCompiled({ path: 'x', value: 1 }) },
            targeting: {},
            control: { timeout: 50 },
            source: { action: 'setValue', args: { path: 'x', value: 1 }, timeout: 50 },
          },
        ]),
        createActionCtx({ runtime }),
      );

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result.ok).toBe(false);
      expect(result.cancelled).toBe(true);
      expect(result.timedOut).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
    } finally {
      vi.useRealTimers();
    }
  });

  it('timeout does not fire when action completes in time', async () => {
    vi.useFakeTimers();
    try {
      const adapter = createMockAdapter({
        invokeBuiltInAction: async () => ({ ok: true, data: 'fast' }),
      });
      const { dispatcher, runtime } = createTestDispatcher({ adapter });

      const promise = dispatcher.dispatch(
        makeCompiledProgram([
          {
            action: 'setValue',
            payload: { args: staticCompiled({ path: 'x', value: 1 }) },
            targeting: {},
            control: { timeout: 1000 },
            source: { action: 'setValue', args: { path: 'x', value: 1 }, timeout: 1000 },
          },
        ]),
        createActionCtx({ runtime }),
      );

      const result = await promise;

      expect(result.ok).toBe(true);
      expect(result.data).toBe('fast');
      expect(result.timedOut).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('contract: abort/cancel via signal propagation', () => {
  it('abort during retry delay returns cancelled result', async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      const adapter = createMockAdapter({
        invokeBuiltInAction: vi.fn(async () => ({ ok: false, error: new Error('retry-me') })),
      });
      const { dispatcher, runtime } = createTestDispatcher({ adapter });

      const promise = dispatcher.dispatch(
        makeCompiledProgram([
          {
            action: 'setValue',
            payload: { args: staticCompiled({ path: 'x', value: 1 }) },
            targeting: {},
            control: { retry: { times: 3, delay: 100 } },
            source: {
              action: 'setValue',
              args: { path: 'x', value: 1 },
              retry: { times: 3, delay: 100 },
            },
          },
        ]),
        createActionCtx({ runtime, signal: controller.signal }),
      );

      await Promise.resolve();
      controller.abort(new Error('user-cancelled'));
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.ok).toBe(false);
      expect(result.cancelled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('pre-aborted signal returns cancelled result on first retry check', async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      controller.abort(new Error('pre-aborted'));
      const adapter = createMockAdapter({
        invokeBuiltInAction: vi.fn(async () => ({ ok: true })),
      });
      const { dispatcher, runtime } = createTestDispatcher({ adapter });

      const promise = dispatcher.dispatch(
        makeCompiledProgram([
          {
            action: 'setValue',
            payload: { args: staticCompiled({ path: 'x', value: 1 }) },
            targeting: {},
            control: { retry: { times: 2, delay: 100 } },
            source: {
              action: 'setValue',
              args: { path: 'x', value: 1 },
              retry: { times: 2, delay: 100 },
            },
          },
        ]),
        createActionCtx({ runtime, signal: controller.signal }),
      );

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.ok).toBe(false);
      expect(result.cancelled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

