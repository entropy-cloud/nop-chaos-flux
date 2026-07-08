import { describe, expect, it, vi } from 'vitest';
import { executeRuntimeAjaxAction } from '../runtime-action-helpers.js';

describe('ajax action messages', () => {
  it('shows messages.success via direct executeRuntimeAjaxAction call', async () => {
    const notify = vi.fn();
    const executeApiRequest = Object.assign(
      vi.fn().mockResolvedValue({ status: 0, data: { id: 1 } }),
      { dispose: vi.fn() },
    );

    const result = await executeRuntimeAjaxAction(
      { url: '/api/save', method: 'post' },
      {
        action: 'ajax',
        payload: {},
        targeting: {},
        control: {},
        source: {
          action: 'ajax',
          args: { url: '/api/save', method: 'post' },
          messages: { success: 'Saved!' },
        },
      } as any,
      { scope: { id: 'scope-1' } } as any,
      undefined,
      {
        getEnv: () => ({ notify }) as any,
        expressionCompiler: {} as any,
        evaluate: <T>(target: unknown) => target as T,
        executeApiRequest,
      },
    );

    expect(result.ok).toBe(true);
    expect(notify).toHaveBeenCalledWith('success', 'Saved!');
  });

  it('shows messages.failed on HTTP failure', async () => {
    const notify = vi.fn();
    const executeApiRequest = Object.assign(
      vi.fn().mockRejectedValue({
        response: { status: 500, data: null },
        status: 500,
        message: 'Server error',
      }),
      { dispose: vi.fn() },
    );

    const result = await executeRuntimeAjaxAction(
      { url: '/api/fail', method: 'post' },
      {
        action: 'ajax',
        payload: {},
        targeting: {},
        control: {},
        source: {
          action: 'ajax',
          args: { url: '/api/fail', method: 'post' },
          messages: { failed: 'Failed!' },
        },
      } as any,
      { scope: { id: 'scope-1' } } as any,
      undefined,
      {
        getEnv: () => ({ notify }) as any,
        expressionCompiler: {} as any,
        evaluate: <T>(target: unknown) => target as T,
        executeApiRequest,
      },
    );

    expect(result.ok).toBe(false);
    expect(notify).toHaveBeenCalledWith('error', 'Failed!');
  });

  it('does not call notify when messages is absent', async () => {
    const notify = vi.fn();
    const executeApiRequest = Object.assign(
      vi.fn().mockResolvedValue({ status: 0, data: { id: 1 } }),
      { dispose: vi.fn() },
    );

    const result = await executeRuntimeAjaxAction(
      { url: '/api/save', method: 'post' },
      {
        action: 'ajax',
        payload: {},
        targeting: {},
        control: {},
        source: {
          action: 'ajax',
          args: { url: '/api/save', method: 'post' },
        },
      } as any,
      { scope: { id: 'scope-1' } } as any,
      undefined,
      {
        getEnv: () => ({ notify }) as any,
        expressionCompiler: {} as any,
        evaluate: <T>(target: unknown) => target as T,
        executeApiRequest,
      },
    );

    expect(result.ok).toBe(true);
    expect(notify).not.toHaveBeenCalled();
  });

  it('supports template evaluation in messages', async () => {
    const notify = vi.fn();
    const executeApiRequest = Object.assign(
      vi.fn().mockResolvedValue({ status: 0, data: { id: 1 } }),
      { dispose: vi.fn() },
    );
    const scope = { id: 'scope-1', name: 'test-item' };

    const result = await executeRuntimeAjaxAction(
      { url: '/api/save', method: 'post' },
      {
        action: 'ajax',
        payload: {},
        targeting: {},
        control: {},
        source: {
          action: 'ajax',
          args: { url: '/api/save', method: 'post' },
          messages: { success: 'Saved ${name}' },
        },
      } as any,
      { scope } as any,
      undefined,
      {
        getEnv: () => ({ notify }) as any,
        expressionCompiler: {} as any,
        evaluate: <T>(target: unknown, sc: any) => {
          const str = String(target);
          return str.replace(/\$\{(\w+)\}/g, (_, key) => String(sc[key] ?? '')) as T;
        },
        executeApiRequest,
      },
    );

    expect(result.ok).toBe(true);
    expect(notify).toHaveBeenCalledWith('success', 'Saved test-item');
  });

  it('shows confirm dialog and cancels when user declines', async () => {
    const notify = vi.fn();
    const confirm = vi.fn().mockResolvedValue(false);
    const executeApiRequest = Object.assign(
      vi.fn().mockResolvedValue({ status: 0, data: { id: 1 } }),
      { dispose: vi.fn() },
    );

    const result = await executeRuntimeAjaxAction(
      { url: '/api/users', method: 'delete' },
      {
        action: 'ajax',
        payload: {},
        targeting: {},
        control: {},
        source: {
          action: 'ajax',
          args: { url: '/api/users', method: 'delete' },
          confirmText: 'Are you sure?',
        },
      } as any,
      { scope: { id: 'scope-1' } } as any,
      undefined,
      {
        getEnv: () => ({ notify, confirm }) as any,
        expressionCompiler: {} as any,
        evaluate: <T>(target: unknown) => target as T,
        executeApiRequest,
      },
    );

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith('Are you sure?');
    expect(executeApiRequest).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.cancelled).toBe(true);
  });

  it('proceeds with ajax when user confirms', async () => {
    const confirm = vi.fn().mockResolvedValue(true);
    const executeApiRequest = Object.assign(
      vi.fn().mockResolvedValue({ status: 0, data: { deleted: true } }),
      { dispose: vi.fn() },
    );

    const result = await executeRuntimeAjaxAction(
      { url: '/api/users', method: 'delete' },
      {
        action: 'ajax',
        payload: {},
        targeting: {},
        control: {},
        source: {
          action: 'ajax',
          args: { url: '/api/users', method: 'delete' },
          confirmText: 'Proceed?',
          messages: { success: 'Deleted' },
        },
      } as any,
      { scope: { id: 'scope-1' } } as any,
      undefined,
      {
        getEnv: () => ({ notify: vi.fn(), confirm }) as any,
        expressionCompiler: {} as any,
        evaluate: <T>(target: unknown) => target as T,
        executeApiRequest,
      },
    );

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(executeApiRequest).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it('returns error when confirmText is set but env.confirm is missing', async () => {
    const executeApiRequest = Object.assign(
      vi.fn().mockResolvedValue({ status: 0, data: { id: 1 } }),
      { dispose: vi.fn() },
    );

    const result = await executeRuntimeAjaxAction(
      { url: '/api/users', method: 'delete' },
      {
        action: 'ajax',
        payload: {},
        targeting: {},
        control: {},
        source: {
          action: 'ajax',
          args: { url: '/api/users', method: 'delete' },
          confirmText: 'Sure?',
        },
      } as any,
      { scope: { id: 'scope-1' } } as any,
      undefined,
      {
        getEnv: () => ({ notify: vi.fn() }) as any,
        expressionCompiler: {} as any,
        evaluate: <T>(target: unknown) => target as T,
        executeApiRequest,
      },
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(String(result.error)).toContain('confirmText');
    expect(executeApiRequest).not.toHaveBeenCalled();
  });
});
