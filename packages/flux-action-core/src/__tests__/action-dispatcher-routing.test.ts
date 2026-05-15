import { describe, expect, it, vi } from 'vitest';
import type {
  BuiltInActionInvocation,
  ComponentActionInvocation,
} from '@nop-chaos/flux-core';
import {
  createActionCtx,
  createMockAdapter,
  createTestDispatcher,
  makeCompiledProgram,
  staticCompiled,
} from './action-dispatcher-test-support.js';

describe('action-dispatcher routing', () => {
  it('dispatches built-in setValue through adapter', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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

  it('dispatches submitForm through built-in adapter when local form runtime exists', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });
    const form = { id: 'form-1', submit: vi.fn() } as any;

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'submitForm',
          payload: {},
          targeting: {},
          control: {},
          source: { action: 'submitForm' },
        },
      ]),
      createActionCtx({ runtime, form }),
    );

    expect(result.ok).toBe(true);
    expect(adapter.invokeBuiltInAction).toHaveBeenCalledOnce();
    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.action).toBe('submitForm');
    expect(invocation.targeting).toEqual({});
  });

  it('dispatches component: actions through component adapter', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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

  it('dispatches parallel actions and combines results', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (invocation) => ({ ok: true, data: invocation.action }),
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
  });

  it('returns the representative failure error for parallel action failures', async () => {
    const representativeError = new Error('toast failed');
    const adapter = createMockAdapter({
      invokeBuiltInAction: async (invocation) =>
        invocation.action === 'showToast'
          ? { ok: false, error: representativeError }
          : { ok: true, data: invocation.action },
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

    expect(result.ok).toBe(false);
    expect(result.results).toHaveLength(2);
    expect(result.error).toBe(representativeError);
    expect(result.results?.[1]?.error).toBe(representativeError);
  });

  it('returns unsupported action error for unknown action types', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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

  it('dispose() can be called without error and clears pending debounces', () => {
    const { dispatcher } = createTestDispatcher();

    expect(() => dispatcher.dispose()).not.toThrow();
    expect(() => dispatcher.dispose()).not.toThrow();
  });

  it('dispose() settles pending debounced dispatch promises with cancelled result', async () => {
    vi.useFakeTimers();

    try {
      const adapter = createMockAdapter();
      const { dispatcher, runtime } = createTestDispatcher({ adapter });

      const resultPromise = dispatcher.dispatch(
        makeCompiledProgram([
          {
            action: 'setValue',
            payload: { args: staticCompiled({ path: 'name', value: 'hello' }) },
            targeting: {},
            control: { debounce: 25 },
            source: { action: 'setValue', args: { path: 'name', value: 'hello' }, debounce: 25 },
          },
        ]),
        createActionCtx({ runtime }),
      );

      dispatcher.dispose();

      await expect(resultPromise).resolves.toMatchObject({ ok: false, cancelled: true });
      expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('dispose() aborts in-flight action signals', async () => {
    let capturedSignal: AbortSignal | undefined;
    let releaseAction: (() => void) | undefined;
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async (invocation) => {
        capturedSignal = invocation.signal;
        await new Promise<void>((resolve) => {
          releaseAction = resolve;
        });
        if (invocation.signal?.aborted) {
          return { ok: false, cancelled: true, error: invocation.signal.reason ?? new Error('aborted') };
        }
        return { ok: true };
      }),
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const resultPromise = dispatcher.dispatch(
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

    await Promise.resolve();
    dispatcher.dispose();
    expect(capturedSignal?.aborted).toBe(true);
    releaseAction?.();

    await expect(resultPromise).resolves.toMatchObject({ ok: false, cancelled: true });
  });

  it('stops later actions in a chain after dispose cancels the active step', async () => {
    let releaseAction: (() => void) | undefined;
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async (invocation) => {
        if (invocation.action === 'setValue') {
          await new Promise<void>((resolve) => {
            releaseAction = resolve;
          });
          if (invocation.signal?.aborted) {
            return { ok: false, cancelled: true, error: invocation.signal.reason };
          }
        }

        return { ok: true };
      }),
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const resultPromise = dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'name', value: 'hello' }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'name', value: 'hello' } },
        },
        {
          action: 'showToast',
          payload: { args: staticCompiled({ message: 'should-not-run' }) },
          targeting: {},
          control: {},
          source: { action: 'showToast', args: { message: 'should-not-run' } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    await Promise.resolve();
    dispatcher.dispose();
    releaseAction?.();

    await expect(resultPromise).resolves.toMatchObject({ ok: false, cancelled: true });
    expect(adapter.invokeBuiltInAction).toHaveBeenCalledTimes(1);
  });
});
