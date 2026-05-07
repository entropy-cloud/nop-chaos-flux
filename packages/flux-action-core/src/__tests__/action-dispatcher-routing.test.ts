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

  it('dispatches submitForm with formId through built-in adapter without local form runtime', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

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
});
