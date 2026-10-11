import { describe, expect, it, vi } from 'vitest';
import type { BuiltInActionInvocation } from '@nop-chaos/flux-core';
import {
  createActionCtx,
  createMockAdapter,
  createTestDispatcher,
  makeCompiledProgram,
  staticCompiled,
} from './action-dispatcher-test-support.js';

describe('built-in surface close actions', () => {
  it('closeDrawer normalizes to closeSurface invocation with surfaceId targeting', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'closeDrawer',
          payload: {},
          targeting: { surfaceId: 'drawer-1' },
          control: {},
          source: { action: 'closeDrawer' },
        },
      ]),
      createActionCtx({ runtime }),
    );

    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.action).toBe('closeSurface');
    expect(invocation.args).toEqual({ surfaceId: 'drawer-1' });
  });

  it('closeDialog falls back to dialogId when surfaceId is absent', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'closeDialog',
          payload: {},
          targeting: { dialogId: 'dialog-1' },
          control: {},
          source: { action: 'closeDialog' },
        },
      ]),
      createActionCtx({ runtime }),
    );

    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.action).toBe('closeSurface');
    expect(invocation.args).toEqual({ surfaceId: 'dialog-1' });
  });

  it('closeSurface prefers surfaceId over dialogId', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'closeSurface',
          payload: {},
          targeting: { surfaceId: 's-1', dialogId: 'd-1' },
          control: {},
          source: { action: 'closeSurface' },
        },
      ]),
      createActionCtx({ runtime }),
    );

    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.action).toBe('closeSurface');
    expect(invocation.args).toEqual({ surfaceId: 's-1' });
  });

  it('close actions without targeting pass undefined args', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'closeDrawer',
          payload: {},
          targeting: {},
          control: {},
          source: { action: 'closeDrawer' },
        },
      ]),
      createActionCtx({ runtime }),
    );

    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.action).toBe('closeSurface');
    expect(invocation.args).toBeUndefined();
  });
});

describe('built-in download and copy actions', () => {
  it('download without args payload fails without invoking adapter', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'download',
          payload: {},
          targeting: {},
          control: {},
          source: { action: 'download' },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect((result as { error: Error }).error.message).toBe(
      'download requires args payload',
    );
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });

  it('download forwards evaluated payload as invocation args', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'download',
          payload: { args: staticCompiled({ url: '/api/export' }) },
          targeting: {},
          control: {},
          source: { action: 'download', args: { url: '/api/export' } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.action).toBe('download');
    expect(invocation.args).toEqual({ url: '/api/export' });
  });

  it('copy without args payload fails without invoking adapter', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'copy',
          payload: {},
          targeting: {},
          control: {},
          source: { action: 'copy' },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(false);
    expect((result as { error: Error }).error.message).toBe(
      'copy requires args payload',
    );
    expect(adapter.invokeBuiltInAction).not.toHaveBeenCalled();
  });

  it('copy forwards evaluated payload as invocation args', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, runtime } = createTestDispatcher({ adapter });

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'copy',
          payload: { args: staticCompiled({ content: 'text' }) },
          targeting: {},
          control: {},
          source: { action: 'copy', args: { content: 'text' } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result.ok).toBe(true);
    const invocation = (adapter.invokeBuiltInAction as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as BuiltInActionInvocation;
    expect(invocation.action).toBe('copy');
    expect(invocation.args).toEqual({ content: 'text' });
  });
});
