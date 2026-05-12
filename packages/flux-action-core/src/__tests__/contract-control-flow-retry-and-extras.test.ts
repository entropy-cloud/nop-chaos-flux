import { describe, expect, it, vi } from 'vitest';
import {
  createActionCtx,
  createMockAdapter,
  createMockEnv,
  createTestDispatcher,
  makeCompiledProgram,
  staticCompiled,
} from './action-dispatcher-test-support.js';

describe('contract: retry with edge cases', () => {
  it('retries non-request-backed action on failure', async () => {
    let callCount = 0;
    const adapter = createMockAdapter({
      invokeBuiltInAction: async () => {
        callCount++;
        if (callCount < 3) return { ok: false, error: new Error('retry-me') };
        return { ok: true, data: 'success' };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: { retry: { times: 3, delay: 0 } },
          source: { action: 'setValue', args: { path: 'x', value: 1 }, retry: { times: 3, delay: 0 } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.data).toBe('success');
    expect(callCount).toBe(3);
  });

  it('failureCount correctly counts all failed attempts when shouldStop returns false', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async () => ({ ok: false, error: new Error('always-fail') }),
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: { retry: { times: 2, delay: 0 } },
          source: { action: 'setValue', args: { path: 'x', value: 1 }, retry: { times: 2, delay: 0 } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.failureCount).toBe(3);
  });

  it('retry with times=0 runs once without retrying', async () => {
    let callCount = 0;
    const adapter = createMockAdapter({
      invokeBuiltInAction: async () => {
        callCount++;
        return { ok: false, error: new Error('fail') };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: { retry: { times: 0, delay: 0 } },
          source: { action: 'setValue', args: { path: 'x', value: 1 }, retry: { times: 0, delay: 0 } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect(callCount).toBe(1);
  });

  it('retries submitForm failures through the standard retry pipeline', async () => {
    let callCount = 0;
    const adapter = createMockAdapter({
      invokeBuiltInAction: async () => {
        callCount += 1;
        if (callCount < 3) {
          return { ok: false, error: new Error('submit failed') };
        }

        return { ok: true, data: { submitted: true } };
      },
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'submitForm',
          payload: {},
          targeting: {},
          control: { retry: { times: 3, delay: 0 } },
          source: { action: 'submitForm', retry: { times: 3, delay: 0 } },
        },
      ]),
      createActionCtx({ runtime, form: { id: 'form-1', submit: vi.fn() } as any }),
    );

    expect(result).toMatchObject({ ok: true, data: { submitted: true }, attempts: 3 });
    expect(callCount).toBe(3);
  });
});

describe('contract: action returning null/undefined data', () => {
  it('action returning { ok: true } with no data passes through correctly', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async () => ({ ok: true }),
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
  });

  it('action returning null data wraps correctly in normalizeActionResult', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async () => ({ ok: true, data: null }),
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

    expect(result.ok).toBe(true);
    expect(result.data).toBeNull();
  });
});

describe('contract: onSettled error handling', () => {
  it('onSettled thrown error captured as settledError without calling notify', async () => {
    const thrownError = new Error('settled-throw');
    const builtinMock = vi.fn(async (inv: any) => {
      if (inv.action === 'showToast') throw thrownError;
      return { ok: true, data: 'ok' };
    });
    const adapter = createMockAdapter({ invokeBuiltInAction: builtinMock });
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
    expect(result.data).toBe('ok');
    expect(result.settledError).toBe(thrownError);
    expect(env.notify).not.toHaveBeenCalled();
  });

  it('onSettled failure result captured as settledError', async () => {
    const settledError = new Error('settled-fail');
    const builtinMock = vi.fn(async (inv: any) => {
      if (inv.action === 'showToast') return { ok: false, error: settledError };
      return { ok: true, data: 'primary-success' };
    });
    const adapter = createMockAdapter({ invokeBuiltInAction: builtinMock });
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
    expect(result.data).toBe('primary-success');
    expect(result.settledError).toBe(settledError);
    expect(env.notify).not.toHaveBeenCalled();
  });
});

describe('contract: multiple sequential failures with continueOnError', () => {
  it('returns last action result when middle has continueOnError', async () => {
    let callIdx = 0;
    const dataSequence = ['first', undefined, 'third'];
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (_inv) => {
        const data = dataSequence[callIdx++];
        if (data === undefined) return { ok: false, error: new Error('fail') };
        return { ok: true, data };
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

    expect(result.ok).toBe(true);
    expect(result.data).toBe('third');
  });
});

describe('contract: then/onError exclusivity', () => {
  it('onError does not run for success-class result', async () => {
    const builtinMock = vi.fn(async (_inv: any) => ({ ok: true, data: 'success' }));
    const adapter = createMockAdapter({ invokeBuiltInAction: builtinMock });
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
              action: 'setValue',
              payload: { args: staticCompiled({ path: 'then', value: true }) },
              targeting: {},
              control: {},
              source: { action: 'setValue', args: { path: 'then', value: true } },
            },
          ],
          onError: [
            {
              action: 'showToast',
              payload: { args: staticCompiled({ message: 'error' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: 'error' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    const actionNames = builtinMock.mock.calls.map((c: any[]) => c[0].action as string);
    expect(actionNames).toContain('setValue');
    expect(actionNames).not.toContain('showToast');
  });

  it('then does not run for failure-class result', async () => {
    const builtinMock = vi.fn(async (inv: any) => {
      if (inv.action === 'showToast') return { ok: false, error: new Error('fail') };
      return { ok: true };
    });
    const adapter = createMockAdapter({ invokeBuiltInAction: builtinMock });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'showToast',
          payload: { args: staticCompiled({ message: 'x' }) },
          targeting: {},
          control: {},
          source: { action: 'showToast', args: { message: 'x' } },
          then: [
            {
              action: 'navigate',
              payload: { args: staticCompiled({ url: '/then' }) },
              targeting: {},
              control: {},
              source: { action: 'navigate', args: { url: '/then' } },
            },
          ],
          onError: [
            {
              action: 'setValue',
              payload: { args: staticCompiled({ path: 'onError', value: true }) },
              targeting: {},
              control: {},
              source: { action: 'setValue', args: { path: 'onError', value: true } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    const actionNames = builtinMock.mock.calls.map((c: any[]) => c[0].action as string);
    expect(actionNames).toContain('showToast');
    expect(actionNames).toContain('setValue');
    expect(actionNames).not.toContain('navigate');
    expect(result.ok).toBe(false);
  });
});

describe('contract: dispatch returns last previous for multi-action chain', () => {
  it('returns the final action result for a successful chain', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (inv) => ({ ok: true, data: inv.action }),
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
          payload: { args: staticCompiled({ message: 'hi' }) },
          targeting: {},
          control: {},
          source: { action: 'showToast', args: { message: 'hi' } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(result.data).toBe('showToast');
  });
});
