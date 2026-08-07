import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RendererEnv } from '@nop-chaos/flux-core';
import { compileAction } from '@nop-chaos/flux-compiler';
import { createRendererRuntime } from '../index.js';

describe('data source child scope dispose (1-10)', () => {
  function makeRuntime() {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher: vi.fn(async () => ({ ok: true, status: 200, data: { value: 'ok' } })),
        notify: vi.fn(),
      } as unknown as RendererEnv,
    });
    const createSpy = vi.spyOn(runtime, 'createChildScope');
    const disposeSpy = vi.spyOn(runtime, 'disposeScope');
    return { runtime, createSpy, disposeSpy };
  }

  function createdIds(createSpy: ReturnType<typeof vi.spyOn>) {
    return createSpy.mock.results.map(
      (result: { value: unknown }) => (result.value as { id: string }).id,
    );
  }

  function disposedIds(disposeSpy: ReturnType<typeof vi.spyOn>) {
    return disposeSpy.mock.calls.map((call: unknown[]) => call[0] as string);
  }

  it('disposes every child scope created by each run/poll cycle once it settles', async () => {
    vi.useFakeTimers();
    const { runtime, createSpy, disposeSpy } = makeRuntime();
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      action: compileAction(
        { action: 'ajax', args: { url: '/api/poll' } },
        runtime.expressionCompiler,
      ),
      scope: page.scope,
      targetPath: 'data',
      interval: 100,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(page.scope.get('data')).toEqual({ value: 'ok' });

    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(250);
    controller.stop();

    const created = createdIds(createSpy);
    expect(created.length).toBeGreaterThanOrEqual(3);
    const disposed = disposedIds(disposeSpy);
    for (const id of created) {
      expect(disposed).toContain(id);
    }

    vi.useRealTimers();
  });

  it('disposes the result-mapping child scope after the request settles', async () => {
    vi.useFakeTimers();
    const { runtime, createSpy, disposeSpy } = makeRuntime();
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      action: compileAction(
        { action: 'ajax', args: { url: '/api/mapped' } },
        runtime.expressionCompiler,
      ),
      scope: page.scope,
      targetPath: 'data',
      compiledResultMapping: runtime.expressionCompiler.compileValue(
        '${payload.value}',
      ) as never,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(page.scope.get('data')).toBe('ok');

    const created = createdIds(createSpy);
    expect(created.length).toBe(2);
    const disposed = disposedIds(disposeSpy);
    for (const id of created) {
      expect(disposed).toContain(id);
    }

    controller.stop();
    vi.useRealTimers();
  });

  it('releases the in-flight request child scope when the controller is disposed', async () => {
    let resolveRequest: (() => void) | undefined;
    const fetcher = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        resolveRequest = resolve;
      });
      return { ok: true, status: 200, data: { done: true } };
    });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: { fetcher, notify: vi.fn() } as unknown as RendererEnv,
    });
    const createSpy = vi.spyOn(runtime, 'createChildScope');
    const disposeSpy = vi.spyOn(runtime, 'disposeScope');
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      action: compileAction(
        { action: 'ajax', args: { url: '/api/slow' } },
        runtime.expressionCompiler,
      ),
      scope: page.scope,
      targetPath: 'data',
    });

    controller.start();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    const created = createdIds(createSpy);
    expect(created.length).toBe(1);

    controller.stop();
    expect(disposedIds(disposeSpy)).toEqual(created);

    resolveRequest!();
    await vi.waitFor(() => expect(disposedIds(disposeSpy).length).toBe(1));
  });
});
