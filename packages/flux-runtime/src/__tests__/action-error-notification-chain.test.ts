import { describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env as baseEnv } from './test-fixtures.js';

describe('action error notification chain propagation', () => {

  it('propagates ajax error through the action chain and notifies env.notify', async () => {
    const notify = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...baseEnv,
        fetcher: async () => ({ ok: false, status: 403, data: { message: 'Forbidden' } }),
        notify,
      } as unknown as RendererEnv,
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      { action: 'ajax', args: { url: '/api/secure', method: 'get' } },
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe('Forbidden');
    expect(notify).toHaveBeenCalledWith('error', 'Forbidden');
  });

  it('stops chained actions after error and notifies', async () => {
    const notify = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...baseEnv,
        fetcher: async () => ({ ok: false, status: 500, data: { message: 'Server Error' } }),
        notify,
      } as unknown as RendererEnv,
    });
    const page = runtime.createPageRuntime({ status: 'idle' });

    const result = await runtime.dispatch(
      [
        { action: 'ajax', args: { url: '/api/fail', method: 'get' } },
        { action: 'setValue', args: { path: 'status', value: 'done' } },
      ],
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(false);
    expect(page.scope.get('status')).toBe('idle');
    expect(notify).toHaveBeenCalledWith('error', 'Server Error');
  });

  it('runs onError handler and preserves the original error result', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...baseEnv,
        fetcher: async () => ({ ok: false, status: 400, data: { message: 'Bad Request' } }),
      } as unknown as RendererEnv,
    });
    const page = runtime.createPageRuntime({ errorMarker: 'none' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        args: { url: '/api/bad', method: 'get' },
        onError: {
          action: 'setValue',
          args: { path: 'errorMarker', value: '${error.message}' },
        },
      },
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe('Bad Request');
    expect(page.scope.get('errorMarker')).toBe('Bad Request');
  });

  it('runs onSettled after error without replacing the primary failure result', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...baseEnv,
        fetcher: async () => ({ ok: false, status: 500, data: { message: 'Server Error' } }),
      } as unknown as RendererEnv,
    });
    const page = runtime.createPageRuntime({ settled: 'no' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        args: { url: '/api/fail', method: 'get' },
        onSettled: {
          action: 'setValue',
          args: { path: 'settled', value: '${error.message}' },
        },
      },
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe('Server Error');
    expect(page.scope.get('settled')).toBe('Server Error');
  });

  it('does not notify for successful actions', async () => {
    const notify = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...baseEnv,
        fetcher: async () => ({ ok: true, status: 200, data: { result: 'ok' } }),
        notify,
      } as unknown as RendererEnv,
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      { action: 'ajax', args: { url: '/api/ok', method: 'get' } },
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(true);
    expect(notify).not.toHaveBeenCalled();
  });
});
