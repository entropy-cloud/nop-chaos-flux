import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileReaction } from '@nop-chaos/flux-compiler';
import { createRendererRuntime } from '../index.js';
import {
  __getGlobalCascadeDepthForTests,
  __setGlobalCascadeDepthForTests,
  registerReaction as registerOwnedReaction,
} from '../async-data/reaction-runtime.js';

const textRenderer = {
  type: 'text' as const,
  component: () => null,
};

const notify = vi.fn();
const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true as const, status: 200, data: null as T }),
  notify,
};

function createRuntime() {
  return createRendererRuntime({
    registry: createRendererRegistry([textRenderer]),
    env,
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

describe('registerReaction dispose race with scheduled microtask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    __setGlobalCascadeDepthForTests(0);
    notify.mockReset();
  });

  it('does not create a debounce setTimeout when dispose races the scheduled microtask', async () => {
    const runtime = createRuntime();
    const page = runtime.createPageRuntime({ count: 0 });

    const registration = runtime.registerReaction({
      id: 'debounce-dispose-race',
      scope: page.scope,
      compiledReaction: compileReaction(
        'debounce-dispose-race',
        {
          type: 'reaction',
          watch: '${count}',
          debounce: 50,
          actions: { action: 'setValue', args: { path: 'flag', value: true } },
        },
        expressionCompiler,
      ),
      dispatch: vi.fn(),
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
      compiledReaction: compileReaction(
        'debounce-dispose-no-action',
        {
          type: 'reaction',
          watch: '${count}',
          debounce: 50,
          actions: { action: 'setValue', args: { path: 'flag', value: true } },
        },
        expressionCompiler,
      ),
      dispatch,
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
      compiledReaction: compileReaction(
        'debounce-normal',
        {
          type: 'reaction',
          watch: '${count}',
          debounce: 20,
          actions: { action: 'setValue', args: { path: 'message', value: 'fired' } },
        },
        expressionCompiler,
      ),
      dispatch: (action, ctx) =>
        runtime.dispatch(action, { runtime, scope: ctx?.scope ?? page.scope, page }),
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
      compiledReaction: compileReaction(
        'async-reaction-diagnostics',
        {
          type: 'reaction',
          watch: '${count}',
          actions: { action: 'custom:noop' },
        },
        expressionCompiler,
      ),
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
      }),
    });

    try {
      page.scope.update('count', 1);

      await vi.waitFor(() => {
        const reaction = runtime
          .getReactionDebugSnapshot?.()
          .reactions.find((entry) => entry.id === 'async-reaction-diagnostics');
        expect(reaction?.running).toBe(true);
      });

      page.scope.update('count', 2);

      await vi.waitFor(() => {
        const reaction = runtime
          .getReactionDebugSnapshot?.()
          .reactions.find((entry) => entry.id === 'async-reaction-diagnostics');
        expect(reaction?.queued).toBe(true);
      });

      resolveFirst?.();

      await vi.waitFor(() => {
        const reaction = runtime
          .getReactionDebugSnapshot?.()
          .reactions.find((entry) => entry.id === 'async-reaction-diagnostics');
        expect(reaction?.running).toBe(true);
        expect(reaction?.async?.recentRuns.some((run) => run.outcome === 'stale-dropped')).toBe(
          true,
        );
      });

      resolveSecond?.();

      await vi.waitFor(() => {
        const reaction = runtime
          .getReactionDebugSnapshot?.()
          .reactions.find((entry) => entry.id === 'async-reaction-diagnostics');
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
      compiledReaction: compileReaction(
        'cancelled-reaction-result',
        {
          type: 'reaction',
          watch: '${count}',
          actions: { action: 'custom:noop' },
        },
        expressionCompiler,
      ),
      dispatch: vi
        .fn()
        .mockResolvedValue({ ok: false, cancelled: true, error: new Error('aborted') }),
    });

    try {
      page.scope.update('count', 1);

      await vi.waitFor(() => {
        const reaction = runtime
          .getReactionDebugSnapshot?.()
          .reactions.find((entry) => entry.id === 'cancelled-reaction-result');
        expect(
          reaction?.async?.recentRuns.some((run) => run.outcome === 'cancelled' && run.cancelled),
        ).toBe(true);
      });
    } finally {
      registration.dispose();
    }
  });

  it('forwards an abort signal into dispatched reaction actions and aborts it on dispose', async () => {
    const runtime = createRuntime();
    const page = runtime.createPageRuntime({ count: 0 });
    let capturedSignal: AbortSignal | undefined;
    let releaseDispatch: (() => void) | undefined;

    const registration = runtime.registerReaction({
      id: 'reaction-abort-signal',
      scope: page.scope,
      compiledReaction: compileReaction(
        'reaction-abort-signal',
        {
          type: 'reaction',
          watch: '${count}',
          actions: { action: 'custom:noop' },
        },
        expressionCompiler,
      ),
      dispatch: vi.fn(async (_action, ctx) => {
        capturedSignal = ctx?.signal;
        await new Promise<void>((resolve) => {
          releaseDispatch = resolve;
        });
        return { ok: true };
      }),
    });

    page.scope.update('count', 1);

    await vi.waitFor(() => {
      expect(capturedSignal).toBeDefined();
    });

    expect(capturedSignal?.aborted).toBe(false);

    registration.dispose();

    expect(capturedSignal?.aborted).toBe(true);
    releaseDispatch?.();
  });

  it('marks reaction runs as failed when dispatch returns non-cancelled ok:false', async () => {
    const runtime = createRuntime();
    const page = runtime.createPageRuntime({ count: 0 });

    const registration = runtime.registerReaction({
      id: 'failed-reaction-result',
      scope: page.scope,
      compiledReaction: compileReaction(
        'failed-reaction-result',
        {
          type: 'reaction',
          watch: '${count}',
          actions: { action: 'custom:noop' },
        },
        expressionCompiler,
      ),
      dispatch: vi.fn().mockResolvedValue({ ok: false, error: new Error('reaction failed') }),
    });

    try {
      page.scope.update('count', 1);

      await vi.waitFor(() => {
        const reaction = runtime
          .getReactionDebugSnapshot?.()
          .reactions.find((entry) => entry.id === 'failed-reaction-result');
        expect(reaction?.async?.recentRuns.some((run) => run.outcome === 'failed')).toBe(true);
      });
    } finally {
      registration.dispose();
    }
  });

  it('does not underflow the global cascade counter when the limit is exceeded', async () => {
    __setGlobalCascadeDepthForTests(200);

    const runtime = createRuntime();
    const page = runtime.createPageRuntime({ count: 0 });

    const registration = runtime.registerReaction({
      id: 'global-cascade-limit',
      scope: page.scope,
      compiledReaction: compileReaction(
        'global-cascade-limit',
        {
          type: 'reaction',
          watch: '${count}',
          actions: { action: 'custom:noop' },
        },
        expressionCompiler,
      ),
      dispatch: vi.fn(),
    });

    page.scope.update('count', 1);
    await Promise.resolve();
    await Promise.resolve();

    expect(notify).not.toHaveBeenCalled();
    expect(__getGlobalCascadeDepthForTests()).toBe(200);

    registration.dispose();
  });

  it('reports the retained cascade-limit failure through the host channel', async () => {
    __setGlobalCascadeDepthForTests(200);

    const runtime = createRuntime();
    const page = runtime.createPageRuntime({ count: 0 });

    const registration = registerOwnedReaction({
      id: 'global-cascade-limit-reporting',
      runtime,
      scope: page.scope,
      compiledReaction: compileReaction(
        'global-cascade-limit-reporting',
        {
          type: 'reaction',
          watch: '${count}',
          actions: { action: 'custom:noop' },
        },
        expressionCompiler,
      ),
      helpers: { dispatch: vi.fn() },
    });

    page.scope.update('count', 1);
    await Promise.resolve();
    await Promise.resolve();

    expect(notify).toHaveBeenCalledWith('error', 'Global reaction cascade depth limit exceeded');

    registration.dispose();
  });
});
