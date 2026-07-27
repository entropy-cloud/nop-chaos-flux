import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RendererEnv } from '@nop-chaos/flux-core';
import { compileAction } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';

describe('data source poll timer dispose-race', () => {
  const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

  it('clears poll timer on stop before first poll fires', () => {
    vi.useFakeTimers();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher: vi.fn(),
        notify: vi.fn(),
      } as unknown as RendererEnv,
    });
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      action: compileAction(
        { action: 'ajax', args: { url: '/api/poll' } },
        expressionCompiler,
      ),
      scope: page.scope,
      targetPath: 'data',
      interval: 1000,
    });

    controller.start();
    expect(vi.getTimerCount()).toBe(1);

    controller.stop();
    expect(vi.getTimerCount()).toBe(0);

    vi.useRealTimers();
  });

  it('clears poll timer on stop while timer is pending', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { value: 'ok' },
    }));
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher,
        notify: vi.fn(),
      } as unknown as RendererEnv,
    });
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      action: compileAction(
        { action: 'ajax', args: { url: '/api/poll' } },
        expressionCompiler,
      ),
      scope: page.scope,
      targetPath: 'data',
      interval: 1000,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(500);
    expect(vi.getTimerCount()).toBe(1);

    controller.stop();
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(2000);
    expect(fetcher).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('does not schedule new poll after stop during request execution', async () => {
    vi.useFakeTimers();
    let resolveRequest: (() => void) | undefined;
    const fetcher = vi.fn(async () => {
      await new Promise<void>((resolve) => { resolveRequest = resolve; });
      return { ok: true, status: 200, data: { done: true } };
    });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher,
        notify: vi.fn(),
      } as unknown as RendererEnv,
    });
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      action: compileAction(
        { action: 'ajax', args: { url: '/api/slow' } },
        expressionCompiler,
      ),
      scope: page.scope,
      targetPath: 'data',
      interval: 100,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(1);

    controller.stop();
    resolveRequest!();
    await vi.advanceTimersByTimeAsync(500);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    vi.useRealTimers();
  });

  it('reset clears poll timer and aborts active request', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { run: 1 },
    }));
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher,
        notify: vi.fn(),
      } as unknown as RendererEnv,
    });
    const page = runtime.createPageRuntime({});
    const controller = runtime.createDataSourceController({
      action: compileAction(
        { action: 'ajax', args: { url: '/api/reset' } },
        expressionCompiler,
      ),
      scope: page.scope,
      targetPath: 'data',
      interval: 200,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(page.scope.get('data')).toEqual({ run: 1 });
    expect(vi.getTimerCount()).toBe(1);

    controller.reset();
    expect(vi.getTimerCount()).toBe(0);
    expect(page.scope.get('data')).toBeUndefined();

    vi.useRealTimers();
  });
});
