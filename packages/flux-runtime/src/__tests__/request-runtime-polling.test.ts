import { describe, expect, it, vi } from 'vitest';
import type { ApiObject, RendererEnv } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '../registry';
import { createRendererRuntime } from '../index';

describe('createDataSourceController', () => {
  it('stops polling once stopWhen becomes true', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher: vi.fn(async () => {
          callCount += 1;
          return {
            ok: true,
            status: 200,
            data: { status: callCount >= 2 ? 'done' : 'running' }
          };
        }),
        notify: vi.fn()
      } as RendererEnv
    });
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      api: { url: '/api/job' },
      scope: page.scope,
      targetPath: 'job',
      interval: 10,
      stopWhen: '${job.status === "done"}'
    });

    controller.start();
    await vi.runAllTimersAsync();

    expect(callCount).toBe(2);
    expect(page.scope.get('job')).toEqual({ status: 'done' });

    await vi.advanceTimersByTimeAsync(50);
    expect(callCount).toBe(2);
    controller.stop();
    vi.useRealTimers();
  });

  it('stops polling and surfaces an error when stopWhen evaluation throws', async () => {
    vi.useFakeTimers();
    const notify = vi.fn();
    let callCount = 0;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher: vi.fn(async () => {
          callCount += 1;
          return {
            ok: true,
            status: 200,
            data: { status: 'running' }
          };
        }),
        notify
      } as RendererEnv
    });
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      api: { url: '/api/job' },
      scope: page.scope,
      targetPath: 'job',
      interval: 10,
      stopWhen: '${job.status === "running"}'
    });

    vi.spyOn(runtime, 'evaluate').mockImplementation(() => {
      throw new Error('stopWhen exploded');
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(callCount).toBe(0);
    expect(notify).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);
    expect(callCount).toBe(0);
    controller.stop();
    vi.useRealTimers();
  });

  it('aborts the active request when stopped', async () => {
    let capturedSignal: AbortSignal | undefined;
    let releaseRequest: (() => void) | undefined;
    const fetcher = vi.fn(async (_api: ApiObject, ctx: { signal?: AbortSignal }) => {
      capturedSignal = ctx.signal;
      await new Promise<void>((resolve) => {
        releaseRequest = resolve;
      });
      if (ctx.signal?.aborted) {
        const error = new Error('aborted');
        (error as Error & { name: string }).name = 'AbortError';
        throw error;
      }
      return { ok: true, status: 200, data: { ok: true } };
    });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher,
        notify: vi.fn()
      } as RendererEnv
    });
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      api: { url: '/api/slow' },
      scope: page.scope,
      targetPath: 'payload'
    });

    controller.start();
    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    controller.stop();
    expect(capturedSignal?.aborted).toBe(true);
    releaseRequest?.();
  });

  it('reuses runtime-local cache across controller refreshes', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { value: 'cached' }
    }));
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher,
        notify: vi.fn()
      } as RendererEnv
    });
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      api: { url: '/api/cache', cacheTTL: 60_000, cacheKey: 'shared-cache' },
      scope: page.scope,
      targetPath: 'payload'
    });

    controller.start();

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: 'cached' });
    });

    expect(fetcher).toHaveBeenCalledTimes(1);

    page.scope.update('payload', { value: 'stale-local' });
    await controller.refresh();

    expect(page.scope.get('payload')).toEqual({ value: 'cached' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    controller.stop();
  });

  it('reuses cache for equivalent final executable requests after params canonicalization', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { value: 'cached' }
    }));
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher,
        notify: vi.fn()
      } as RendererEnv
    });
    const page = runtime.createPageRuntime({ page: 1 });
    const first = runtime.createDataSourceController({
      api: { url: '/api/cache?page=1', cacheTTL: 60_000 },
      scope: page.scope,
      targetPath: 'payload'
    });
    const second = runtime.createDataSourceController({
      api: { url: '/api/cache', params: { page: 1 }, cacheTTL: 60_000 },
      scope: page.scope,
      targetPath: 'payload2'
    });

    first.start();

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: 'cached' });
    });

    second.start();

    await vi.waitFor(() => {
      expect(page.scope.get('payload2')).toEqual({ value: 'cached' });
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    first.stop();
    second.stop();
  });
});
