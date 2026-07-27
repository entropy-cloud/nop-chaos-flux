import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RendererEnv } from '@nop-chaos/flux-core';
import { compileDataSource, compileReaction } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';

describe('data-source and reaction lowering interop', () => {
  const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('registers a reaction before data source fetch, reaction triggers when data populates scope', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { items: [1, 2, 3] },
    }));
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher,
        notify: vi.fn(),
      } as unknown as RendererEnv,
    });
    const page = runtime.createPageRuntime({});

    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    runtime.registerReaction({
      id: 'rx-on-items',
      scope: page.scope,
      compiledReaction: compileReaction(
        'rx-on-items',
        {
          type: 'reaction',
          watch: '${items}',
          actions: { action: 'setValue', args: { path: 'summary', value: 'computed' } },
        },
        expressionCompiler,
      ),
      dispatch,
    });

    runtime.registerDataSource({
      id: 'ds-items',
      scope: page.scope,
      compiledSource: compileDataSource(
        'ds-items',
        {
          type: 'data-source',
          name: 'items',
          action: 'ajax',
          args: { url: '/api/items' },
        },
        expressionCompiler,
      ),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(page.scope.get('items')).toEqual({ items: [1, 2, 3] });
    await vi.advanceTimersByTimeAsync(0);
    expect(dispatch).toHaveBeenCalled();
  });

  it('reaction watches data source output and reacts to refreshes', async () => {
    let fetchCount = 0;
    const fetcher = vi.fn(async () => {
      fetchCount += 1;
      return { ok: true, status: 200, data: { value: fetchCount } };
    });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher,
        notify: vi.fn(),
      } as unknown as RendererEnv,
    });
    const page = runtime.createPageRuntime({});

    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    runtime.registerReaction({
      id: 'rx-counter-watch',
      scope: page.scope,
      compiledReaction: compileReaction(
        'rx-counter-watch',
        {
          type: 'reaction',
          watch: '${counter}',
          actions: { action: 'setValue', args: { path: 'doubled', value: 'processed' } },
        },
        expressionCompiler,
      ),
      dispatch,
    });

    runtime.registerDataSource({
      id: 'ds-counter',
      scope: page.scope,
      compiledSource: compileDataSource(
        'ds-counter',
        {
          type: 'data-source',
          name: 'counter',
          action: 'ajax',
          args: { url: '/api/counter' },
        },
        expressionCompiler,
      ),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(page.scope.get('counter')).toEqual({ value: 1 });
    await vi.advanceTimersByTimeAsync(0);
    expect(dispatch).toHaveBeenCalled();
  });

  it('compiled data source with polling and reaction cleanup on dispose', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { timestamp: Date.now() },
    }));
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher,
        notify: vi.fn(),
      } as unknown as RendererEnv,
    });
    const page = runtime.createPageRuntime({});

    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    runtime.registerReaction({
      id: 'rx-poll-watch',
      scope: page.scope,
      compiledReaction: compileReaction(
        'rx-poll-watch',
        {
          type: 'reaction',
          watch: '${pollData}',
          actions: { action: 'setValue', args: { path: 'lastPoll', value: 'seen' } },
        },
        expressionCompiler,
      ),
      dispatch,
    });

    const dsRegistration = runtime.registerDataSource({
      id: 'ds-poll',
      scope: page.scope,
      compiledSource: compileDataSource(
        'ds-poll',
        {
          type: 'data-source',
          name: 'pollData',
          action: 'ajax',
          args: { url: '/api/time' },
          interval: 100,
        },
        expressionCompiler,
      ),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(1);

    dsRegistration.dispose();
    const timerCountBefore = vi.getTimerCount();
    await vi.advanceTimersByTimeAsync(500);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBeLessThanOrEqual(timerCountBefore);
  });

  it('reaction triggers after data source is set up by watching scope changes', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      data: { value: 'ready' },
    }));
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([]),
      env: {
        fetcher,
        notify: vi.fn(),
      } as unknown as RendererEnv,
    });
    const page = runtime.createPageRuntime({});

    runtime.registerDataSource({
      id: 'ds-data',
      scope: page.scope,
      compiledSource: compileDataSource(
        'ds-data',
        {
          type: 'data-source',
          name: 'myData',
          action: 'ajax',
          args: { url: '/api/data' },
        },
        expressionCompiler,
      ),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    runtime.registerReaction({
      id: 'rx-data-watch',
      scope: page.scope,
      compiledReaction: compileReaction(
        'rx-data-watch',
        {
          type: 'reaction',
          watch: '${myData}',
          actions: { action: 'setValue', args: { path: 'seen', value: '${myData.value}' } },
        },
        expressionCompiler,
      ),
      dispatch,
    });

    page.scope.update('myData', { value: 'updated' });
    await vi.advanceTimersByTimeAsync(0);
    expect(dispatch).toHaveBeenCalled();
  });
});
