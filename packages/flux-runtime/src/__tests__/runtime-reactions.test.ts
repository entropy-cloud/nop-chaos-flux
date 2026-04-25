import { describe, expect, it, vi } from 'vitest';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileReaction } from '@nop-chaos/flux-compiler';
import { createRendererRegistry, createRendererRuntime } from '../index';
import { textRenderer, env } from './test-fixtures';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

describe('createRendererRuntime', () => {
  it('replaces same-id reactions within the same scope through runtime registry ownership', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler
    });
    const page = runtime.createPageRuntime({ count: 1 });
    const updates: string[] = [];

    const first = runtime.registerReaction({
      id: 'count-reaction',
      scope: page.scope,
      compiledReaction: compileReaction('count-reaction', {
        type: 'reaction',
        watch: '${count}',
        actions: {
          action: 'setValue',
          args: {
            path: 'message',
            value: 'first:${count}'
          }
        }
      }, expressionCompiler),
      dispatch: async (action, ctx) => {
        updates.push('first');
        return runtime.dispatch(action, {
          runtime,
          scope: ctx?.scope ?? page.scope,
          page
        });
      }
    });

    const second = runtime.registerReaction({
      id: 'count-reaction',
      scope: page.scope,
      compiledReaction: compileReaction('count-reaction', {
        type: 'reaction',
        watch: '${count}',
        actions: {
          action: 'setValue',
          args: {
            path: 'message',
            value: 'second:${count}'
          }
        }
      }, expressionCompiler),
      dispatch: async (action, ctx) => {
        updates.push('second');
        return runtime.dispatch(action, {
          runtime,
          scope: ctx?.scope ?? page.scope,
          page
        });
      }
    });

    page.scope.update('count', 2);

    await vi.waitFor(() => {
      expect(page.scope.get('message')).toBe('second:2');
    });

    expect(updates).toEqual(['second']);

    first.dispose();
    second.dispose();
  });

  it('exposes reaction debug snapshots through the public runtime contract', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler
    });
    const page = runtime.createPageRuntime({ count: 1 });

    const registration = runtime.registerReaction({
      id: 'debug-reaction',
      scope: page.scope,
      compiledReaction: compileReaction('debug-reaction', {
        type: 'reaction',
        watch: '${count}',
        immediate: true,
        actions: {
          action: 'setValue',
          args: {
            path: 'message',
            value: 'count:${count}'
          }
        }
      }, expressionCompiler),
      dispatch: (action, ctx) => runtime.dispatch(action, {
        runtime,
        scope: ctx?.scope ?? page.scope,
        page
      })
    });

    await vi.waitFor(() => {
      expect(page.scope.get('message')).toBe('count:1');
    });

    expect(runtime.getReactionDebugSnapshot?.()).toEqual({
      reactions: [
        expect.objectContaining({
          id: 'debug-reaction',
          scopeId: page.scope.id,
          immediate: true,
          fireCount: 1,
          disposed: false,
          dependencies: ['count']
        })
      ]
    });

    registration.dispose();
    expect(runtime.getReactionDebugSnapshot?.()).toEqual({ reactions: [] });
  });

  it('coalesces debounced reaction updates against the latest scope value', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler
    });
    const page = runtime.createPageRuntime({ count: 0, message: 'start' });

    const registration = runtime.registerReaction({
      id: 'debounced-reaction',
      scope: page.scope,
      compiledReaction: compileReaction('debounced-reaction', {
        type: 'reaction',
        watch: '${count}',
        debounce: 20,
        actions: {
          action: 'setValue',
          args: {
            path: 'message',
            value: 'count:${count}'
          }
        }
      }, expressionCompiler),
      dispatch: (action, ctx) => runtime.dispatch(action, {
        runtime,
        scope: ctx?.scope ?? page.scope,
        page
      })
    });

    try {
      page.scope.update('count', 1);
      page.scope.update('count', 2);
      page.scope.update('count', 3);

      await vi.waitFor(() => {
        expect(page.scope.get('message')).toBe('count:3');
      });
    } finally {
      registration.dispose();
    }
  });

  it('schedules reaction dispatch after the triggering write settles', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler
    });
    const page = runtime.createPageRuntime({ count: 0 });
    const dispatches: number[] = [];

    const registration = runtime.registerReaction({
      id: 'async-reaction',
      scope: page.scope,
      compiledReaction: compileReaction('async-reaction', {
        type: 'reaction',
        watch: '${count}',
        actions: {
          action: 'setValue',
          args: {
            path: 'message',
            value: 'count:${count}'
          }
        }
      }, expressionCompiler),
      dispatch: (action, ctx) => {
        dispatches.push(Number(page.scope.get('count') ?? 0));
        return runtime.dispatch(action, {
          runtime,
          scope: ctx?.scope ?? page.scope,
          page
        });
      }
    });

    try {
      page.scope.update('count', 1);

      expect(page.scope.get('message')).toBeUndefined();
      expect(dispatches).toEqual([]);

      await vi.waitFor(() => {
        expect(page.scope.get('message')).toBe('count:1');
      });

      expect(dispatches).toEqual([1]);
    } finally {
      registration.dispose();
    }
  });

  it('reports and removes reactions that exceed the fire-count limit', async () => {
    const notify = vi.fn();
    const onError = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        notify,
        monitor: { onError }
      },
      expressionCompiler
    });
    const page = runtime.createPageRuntime({ count: 0 });

    runtime.registerReaction({
      id: 'bounded-reaction',
      scope: page.scope,
      compiledReaction: compileReaction('bounded-reaction', {
        type: 'reaction',
        watch: '${count}',
        actions: {
          action: 'setValue',
          args: {
            path: 'count',
            value: '${count + 1}'
          }
        }
      }, expressionCompiler),
      dispatch: (action, ctx) => runtime.dispatch(action, {
        runtime,
        scope: ctx?.scope ?? page.scope,
        page
      })
    });

    page.scope.update('count', 1);

    await vi.waitFor(() => {
      expect(notify).toHaveBeenCalledWith(
        'warning',
        expect.stringContaining('bounded-reaction')
      );
    });

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      phase: 'action',
      details: expect.objectContaining({
        reason: 'reaction-fire-count-limit',
        reactionId: 'bounded-reaction',
        maxFireCount: 10
      })
    }));
    expect(runtime.getReactionDebugSnapshot?.()).toEqual({ reactions: [] });
  });

  it('exposes reaction value bindings to action evaluation', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler
    });
    const page = runtime.createPageRuntime({ count: 1 });

    const registration = runtime.registerReaction({
      id: 'reaction-bindings',
      scope: page.scope,
      compiledReaction: compileReaction('reaction-bindings', {
        type: 'reaction',
        watch: '${count}',
        actions: {
          action: 'setValue',
          args: {
            path: 'message',
            value: '${value}:${prev}:${changed}:${changedPaths[0]}'
          }
        }
      }, expressionCompiler),
      dispatch: (action, ctx) => runtime.dispatch(action, {
        runtime,
        scope: ctx?.scope ?? page.scope,
        page,
        event: ctx?.event,
        evaluationBindings: ctx?.evaluationBindings
      })
    });

    try {
      page.scope.update('count', 2);

      await vi.waitFor(() => {
        expect(page.scope.get('message')).toBe('2:1:true:count');
      });
    } finally {
      registration.dispose();
    }
  });

});
