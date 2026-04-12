import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
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
      schema: {
        type: 'reaction',
        watch: '${count}',
        debounce: 50,
        actions: { action: 'setValue', componentPath: 'flag', value: true }
      },
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
      schema: {
        type: 'reaction',
        watch: '${count}',
        debounce: 50,
        actions: { action: 'setValue', componentPath: 'flag', value: true }
      },
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
      schema: {
        type: 'reaction',
        watch: '${count}',
        debounce: 20,
        actions: { action: 'setValue', componentPath: 'message', value: 'fired' }
      },
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
});
