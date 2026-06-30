import { describe, expect, it, vi } from 'vitest';
import type { BuiltInActionInvocation } from '@nop-chaos/flux-core';
import {
  createActionCtx,
  createMockAdapter,
  createTestDispatcher,
  makeCompiledProgram,
  staticCompiled,
} from './action-dispatcher-test-support.js';

describe('built-in confirm action', () => {
  it('dispatches confirm through adapter with message and title', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'confirm',
          payload: { args: staticCompiled({ message: '确定删除？', title: '提示' }) },
          targeting: {},
          control: {},
          source: { action: 'confirm', args: { message: '确定删除？', title: '提示' } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(adapter.invokeBuiltInAction).toHaveBeenCalledOnce();
    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.action).toBe('confirm');
    expect(invocation.args).toEqual({ message: '确定删除？', title: '提示' });
  });

  it('dispatches confirm with only message', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'confirm',
          payload: { args: staticCompiled({ message: '确定？' }) },
          targeting: {},
          control: {},
          source: { action: 'confirm', args: { message: '确定？' } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.args).toEqual({ message: '确定？', title: undefined });
  });

  it('dispatches confirm with no args', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'confirm',
          payload: { args: staticCompiled({}) },
          targeting: {},
          control: {},
          source: { action: 'confirm' },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.args).toEqual({ message: undefined, title: undefined });
  });
});

describe('built-in alert action', () => {
  it('dispatches alert through adapter with message and title', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'alert',
          payload: { args: staticCompiled({ message: '操作成功', title: '提示' }) },
          targeting: {},
          control: {},
          source: { action: 'alert', args: { message: '操作成功', title: '提示' } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(adapter.invokeBuiltInAction).toHaveBeenCalledOnce();
    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.action).toBe('alert');
    expect(invocation.args).toEqual({ message: '操作成功', title: '提示' });
  });

  it('dispatches alert with only message', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'alert',
          payload: { args: staticCompiled({ message: 'hello' }) },
          targeting: {},
          control: {},
          source: { action: 'alert', args: { message: 'hello' } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.args).toEqual({ message: 'hello', title: undefined });
  });
});

describe('confirm action in then-chain', () => {
  it('confirm then ajax chain works through dispatcher', async () => {
    const adapter = createMockAdapter({
      invokeBuiltInAction: vi.fn(async (invocation) => {
        if (invocation.action === 'confirm') {
          return { ok: true, data: { confirmed: true } };
        }
        return { ok: true, data: invocation.action };
      }),
    });
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'confirm',
          payload: { args: staticCompiled({ message: '确定？' }) },
          targeting: {},
          control: {},
          source: { action: 'confirm', args: { message: '确定？' } },
          then: [
            {
              action: 'showToast',
              payload: { args: staticCompiled({ message: '已确认' }) },
              targeting: {},
              control: {},
              source: { action: 'showToast', args: { message: '已确认' } },
            },
          ],
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    expect(adapter.invokeBuiltInAction).toHaveBeenCalledTimes(2);
    const calls = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock.calls;
    const actions = calls.map(
      (call: any[]) => (call[0] as BuiltInActionInvocation).action,
    );
    expect(actions).toEqual(['confirm', 'showToast']);
  });
});
