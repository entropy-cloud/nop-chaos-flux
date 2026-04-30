import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileReaction } from '@nop-chaos/flux-compiler';
import { createRendererRegistry, createRendererRuntime } from '../index';

const textRenderer = {
  type: 'text' as const,
  component: () => null
};

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true as const, status: 200, data: null as T }),
  notify: () => undefined
};

function createRuntime() {
  return createRendererRuntime({
    registry: createRendererRegistry([textRenderer]),
    env,
    expressionCompiler: createExpressionCompiler(createFormulaCompiler())
  });
}

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

describe('registerReaction dispose race with scheduled microtask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not create a debounce setTimeout when dispose races the scheduled microtask', async () => {
    const runtime = createRuntime();
    const page = runtime.createPageRuntime({ count: 0 });

    const registration = runtime.registerReaction({
      id: 'debounce-dispose-race',
      scope: page.scope,
      compiledReaction: compileReaction('debounce-dispose-race', {
        type: 'reaction',
        watch: '${count}',
        debounce: 50,
        actions: { action: 'setValue', args: { path: 'flag', value: true } }
      }, expressionCompiler),
      dispatch: vi.fn()
    });

    page.scope.update('count', 1);
    registration.dispose();

    const pendingBeforeFlush = vi.getTimerCount();

    await Promise.resolve();

    const pendingAfterFlush = vi.getTimerCount();

    expect(pendingBeforeFlush).toBe(0);
    expect(pendingAfterFlush).toBe(0);
  });

  it('does not invoke the action when dispose races the scheduled microtask', async () => {
    const runtime = createRuntime();
    const page = runtime.createPageRuntime({ count: 0 });
    const dispatch = vi.fn();

    const registration = runtime.registerReaction({
      id: 'debounce-dispose-no-action',
      scope: page.scope,
      compiledReaction: compileReaction('debounce-dispose-no-action', {
        type: 'reaction',
        watch: '${count}',
        debounce: 50,
        actions: { action: 'setValue', args: { path: 'flag', value: true } }
      }, expressionCompiler),
      dispatch
    });

    page.scope.update('count', 1);
    registration.dispose();

    await Promise.resolve();
    vi.advanceTimersByTime(100);

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('still fires the action when dispose does NOT race the microtask', async () => {
    vi.useRealTimers();

    const runtime = createRuntime();
    const page = runtime.createPageRuntime({ count: 0, message: 'initial' });

    const registration = runtime.registerReaction({
      id: 'debounce-normal',
      scope: page.scope,
      compiledReaction: compileReaction('debounce-normal', {
        type: 'reaction',
        watch: '${count}',
        debounce: 20,
        actions: { action: 'setValue', args: { path: 'message', value: 'fired' } }
      }, expressionCompiler),
      dispatch: (action, ctx) =>
        runtime.dispatch(action, { runtime, scope: ctx?.scope ?? page.scope, page })
    });

    try {
      page.scope.update('count', 1);

      await vi.waitFor(() => {
        expect(page.scope.get('message')).toBe('fired');
      });
    } finally {
      registration.dispose();
    }
  });

  it('exposes queued/running async diagnostics and stale-drops superseded late settles', async () => {
    vi.useRealTimers();

    const runtime = createRuntime();
    const page = runtime.createPageRuntime({ count: 0 });
    let resolveFirst: (() => void) | undefined;
    let resolveSecond: (() => void) | undefined;
    let dispatchCount = 0;

    const registration = runtime.registerReaction({
      id: 'async-reaction-diagnostics',
      scope: page.scope,
      compiledReaction: compileReaction('async-reaction-diagnostics', {
        type: 'reaction',
        watch: '${count}',
        actions: { action: 'custom:noop' }
      }, expressionCompiler),
      dispatch: vi.fn(async () => {
        dispatchCount += 1;

        await new Promise<void>((resolve) => {
          if (dispatchCount === 1) {
            resolveFirst = resolve;
          } else {
            resolveSecond = resolve;
          }
        });

        return { ok: true };
      })
    });

    try {
      page.scope.update('count', 1);

      await vi.waitFor(() => {
        const reaction = runtime.getReactionDebugSnapshot?.().reactions.find((entry) => entry.id === 'async-reaction-diagnostics');
        expect(reaction?.running).toBe(true);
      });

      page.scope.update('count', 2);

      await vi.waitFor(() => {
        const reaction = runtime.getReactionDebugSnapshot?.().reactions.find((entry) => entry.id === 'async-reaction-diagnostics');
        expect(reaction?.queued).toBe(true);
      });

      resolveFirst?.();

      await vi.waitFor(() => {
        const reaction = runtime.getReactionDebugSnapshot?.().reactions.find((entry) => entry.id === 'async-reaction-diagnostics');
        expect(reaction?.running).toBe(true);
        expect(reaction?.async?.recentRuns.some((run) => run.outcome === 'stale-dropped')).toBe(true);
      });

      resolveSecond?.();

      await vi.waitFor(() => {
        const reaction = runtime.getReactionDebugSnapshot?.().reactions.find((entry) => entry.id === 'async-reaction-diagnostics');
        expect(reaction?.queued).toBe(false);
        expect(reaction?.running).toBe(false);
        expect(reaction?.async?.recentRuns.some((run) => run.outcome === 'succeeded')).toBe(true);
      });
    } finally {
      registration.dispose();
    }
  });

  it('marks reaction runs as cancelled when dispatch returns a cancelled result', async () => {
    const runtime = createRuntime();
    const page = runtime.createPageRuntime({ count: 0 });

    const registration = runtime.registerReaction({
      id: 'cancelled-reaction-result',
      scope: page.scope,
      compiledReaction: compileReaction('cancelled-reaction-result', {
        type: 'reaction',
        watch: '${count}',
        actions: { action: 'custom:noop' }
      }, expressionCompiler),
      dispatch: vi.fn().mockResolvedValue({ ok: false, cancelled: true, error: new Error('aborted') })
    });

    try {
      page.scope.update('count', 1);

      await vi.waitFor(() => {
        const reaction = runtime.getReactionDebugSnapshot?.().reactions.find((entry) => entry.id === 'cancelled-reaction-result');
        expect(reaction?.async?.recentRuns.some((run) => run.outcome === 'cancelled' && run.cancelled)).toBe(true);
      });
    } finally {
      registration.dispose();
    }
  });
});
