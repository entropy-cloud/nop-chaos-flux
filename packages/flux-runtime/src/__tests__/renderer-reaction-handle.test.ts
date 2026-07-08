import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileActions } from '@nop-chaos/flux-compiler';
import { createRendererRuntime } from '../index.js';
import { env, textRenderer } from './test-fixtures.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

function makePlan(dependsOn: readonly string[], ignoreWritesTo?: readonly string[]) {
  return {
    action: compileActions(
      { action: 'record' },
      expressionCompiler,
      {},
    ),
    dependsOn,
    ...(ignoreWritesTo ? { ignoreWritesTo } : {}),
  };
}

function setup() {
  const runtime = createRendererRuntime({
    registry: createRendererRegistry([textRenderer]),
    env,
    expressionCompiler,
  });
  const page = runtime.createPageRuntime({ user: { id: 'u1' }, pagination: { page: 1 } });
  return { runtime, page };
}

describe('registerRendererReaction (Phase 4)', () => {
  it('returns a ReactionHandle with all methods', () => {
    const { runtime, page } = setup();
    const handle = runtime.registerRendererReaction({
      id: 'r1',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async () => ({ ok: true }),
    });

    expect(typeof handle.dispatch).toBe('function');
    expect(typeof handle.force).toBe('function');
    expect(typeof handle.ready).toBe('function');
    expect(typeof handle.pause).toBe('function');
    expect(typeof handle.resume).toBe('function');
    expect(typeof handle.getDebugState).toBe('function');

    handle.ready();
    expect(handle.getDebugState().phase).toBe('ready');
  });

  it('starts in initial-paused phase and does not fire on scope change until ready()', async () => {
    const { runtime, page } = setup();
    const dispatchCalls: unknown[] = [];
    const handle = runtime.registerRendererReaction({
      id: 'r2',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async (_action, ctx) => {
        dispatchCalls.push(ctx?.evaluationBindings);
        return { ok: true };
      },
    });

    expect(handle.getDebugState().phase).toBe('initial-paused');

    page.scope.update('user', { id: 'u2' });
    await Promise.resolve();

    expect(dispatchCalls).toHaveLength(0);
    expect(handle.getDebugState().pendingChange).toBe(true);

    handle.ready();
    await vi.waitFor(() => {
      expect(dispatchCalls).toHaveLength(1);
    });

    handle.ready(); // idempotent
  });

  it('fires on dependsOn root change when ready', async () => {
    const { runtime, page } = setup();
    const dispatchCalls: unknown[] = [];
    const handle = runtime.registerRendererReaction({
      id: 'r3',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async () => {
        dispatchCalls.push(Date.now());
        return { ok: true };
      },
    });
    handle.ready();

    page.scope.update('user', { id: 'u3' });
    await vi.waitFor(() => {
      expect(dispatchCalls).toHaveLength(1);
    });
  });

  it('does NOT fire on changes outside dependsOn roots', async () => {
    const { runtime, page } = setup();
    const dispatchCalls: unknown[] = [];
    const handle = runtime.registerRendererReaction({
      id: 'r4',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async () => {
        dispatchCalls.push(true);
        return { ok: true };
      },
    });
    handle.ready();

    page.scope.update('pagination', { page: 2 });
    await Promise.resolve();

    expect(dispatchCalls).toHaveLength(0);
  });

  it('filters self-writes via ignoreWritesTo', async () => {
    const { runtime, page } = setup();
    const dispatchCalls: unknown[] = [];
    const handle = runtime.registerRendererReaction({
      id: 'r5',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user'], ['pagination']),
      dispatch: async () => {
        dispatchCalls.push(true);
        return { ok: true };
      },
    });
    handle.ready();

    // Self-write to pagination (ignored) should not re-trigger.
    page.scope.update('pagination', { page: 99 });
    await Promise.resolve();
    expect(dispatchCalls).toHaveLength(0);

    // Real change on user root triggers.
    page.scope.update('user', { id: 'changed' });
    await vi.waitFor(() => {
      expect(dispatchCalls).toHaveLength(1);
    });
  });

  it('pause/resume accumulates pending and flushes once on final resume (counter-based)', async () => {
    const { runtime, page } = setup();
    const dispatchCalls: unknown[] = [];
    const handle = runtime.registerRendererReaction({
      id: 'r6',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async () => {
        dispatchCalls.push(true);
        return { ok: true };
      },
    });
    handle.ready();

    handle.pause();
    handle.pause();
    expect(handle.getDebugState().pauseCount).toBe(2);
    expect(handle.getDebugState().phase).toBe('explicit-paused');

    page.scope.update('user', { id: 'a' });
    page.scope.update('user', { id: 'b' });
    await Promise.resolve();
    expect(dispatchCalls).toHaveLength(0);
    expect(handle.getDebugState().pendingChange).toBe(true);

    handle.resume(); // pauseCount=1, still paused
    expect(dispatchCalls).toHaveLength(0);

    handle.resume(); // pauseCount=0, flush
    await vi.waitFor(() => {
      expect(dispatchCalls).toHaveLength(1);
    });
    expect(handle.getDebugState().phase).toBe('ready');
    expect(handle.getDebugState().pendingChange).toBe(false);
  });

  it('dispatch() invokes the action imperatively and returns the result', async () => {
    const { runtime, page } = setup();
    let calledWith: unknown = undefined;
    const handle = runtime.registerRendererReaction({
      id: 'r7',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async (action, ctx) => {
        calledWith = { action, evaluationBindings: ctx?.evaluationBindings };
        return { ok: true, data: 'dispatched-result' };
      },
    });

    const result = await handle.dispatch({ evaluationBindings: { page: 2 } });
    expect(result.ok).toBe(true);
    expect(calledWith).toMatchObject({ evaluationBindings: { page: 2 } });
  });

  it('new dispatch() aborts the previous in-flight dispatch (per-fire AbortController)', async () => {
    const { runtime, page } = setup();
    let firstResolve: ((value: unknown) => void) | undefined;
    const seenSignals: AbortSignal[] = [];
    const handle = runtime.registerRendererReaction({
      id: 'r8',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async (_action, ctx) => {
        seenSignals.push(ctx?.signal as AbortSignal);
        if (seenSignals.length === 1) {
          await new Promise((resolve) => {
            firstResolve = resolve;
          });
        }
        return { ok: true };
      },
    });

    const firstPromise = handle.dispatch();
    await Promise.resolve();
    expect(seenSignals[0].aborted).toBe(false);

    const secondPromise = handle.dispatch();
    await Promise.resolve();

    // First dispatch's signal should be aborted by the second.
    expect(seenSignals[0].aborted).toBe(true);

    firstResolve?.(undefined);
    const first = await firstPromise;
    const second = await secondPromise;
    // The first dispatch resolves (the underlying dispatch completed) but its signal was aborted.
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });

  it('dispose() makes handle inert and resolves pending dispatch to cancelled', async () => {
    const { runtime, page } = setup();
    const handle = runtime.registerRendererReaction({
      id: 'r9',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async () => ({ ok: true }),
    });
    handle.ready();

    // Not disposed yet — dispatch works.
    const okResult = await handle.dispatch();
    expect(okResult.ok).toBe(true);

    handle.force(); // not in test scope; just exercise
    handle.pause();
    handle.resume();

    // Dispose the handle.
    handle.dispose();

    expect(handle.getDebugState().phase).toBe('disposed');

    // After dispose, dispatch resolves to cancelled.
    const postDispose = await handle.dispatch();
    expect(postDispose.ok).toBe(false);
    expect(postDispose.cancelled).toBe(true);

    // Force/ready/pause/resume are silent no-ops.
    handle.force();
    handle.ready();
    handle.pause();
    handle.resume();

    // Scope change does not fire after dispose.
    const dispatchCalls: unknown[] = [];
    const handle2 = runtime.registerRendererReaction({
      id: 'r9b',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async () => {
        dispatchCalls.push(true);
        return { ok: true };
      },
    });
    handle2.ready();
    handle2.dispose();
    page.scope.update('user', { id: 'after-dispose' });
    await Promise.resolve();
    expect(dispatchCalls).toHaveLength(0);
  });

  it('force() triggers a fire even without scope change', async () => {
    const { runtime, page } = setup();
    const dispatchCalls: unknown[] = [];
    const handle = runtime.registerRendererReaction({
      id: 'r10',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async () => {
        dispatchCalls.push(true);
        return { ok: true };
      },
    });
    handle.ready();

    handle.force();
    await vi.waitFor(() => {
      expect(dispatchCalls).toHaveLength(1);
    });
  });

  it('bindings provider injects evaluationBindings on reactive trigger and force()', async () => {
    const { runtime, page } = setup();
    const seenBindings: Record<string, unknown>[] = [];
    const handle = runtime.registerRendererReaction({
      id: 'r11',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async (_action, ctx) => {
        seenBindings.push(ctx?.evaluationBindings ?? {});
        return { ok: true };
      },
    });

    // Register bindings provider (simulates CRUD registering its state provider)
    const handleWithSetter = handle as import('@nop-chaos/flux-core').ReactionHandle & {
      _setBindingsProvider?(fn: (() => Record<string, unknown>) | undefined): void;
    };
    handleWithSetter._setBindingsProvider?.(() => ({
      pagination: { currentPage: 1, pageSize: 10 },
      query: { keywords: 'test' },
    }));

    handle.ready();

    // Reactive trigger: scope change on dependsOn root
    page.scope.update('user', { id: 'triggered' });
    await vi.waitFor(() => {
      expect(seenBindings.length).toBeGreaterThanOrEqual(1);
    });

    // The action should have received CRUD evaluationBindings via the provider
    expect(seenBindings[seenBindings.length - 1]).toMatchObject({
      pagination: { currentPage: 1, pageSize: 10 },
      query: { keywords: 'test' },
    });

    // Force trigger should also include bindings
    seenBindings.length = 0;
    handle.force();
    await vi.waitFor(() => {
      expect(seenBindings.length).toBeGreaterThanOrEqual(1);
    });
    expect(seenBindings[seenBindings.length - 1]).toMatchObject({
      pagination: { currentPage: 1, pageSize: 10 },
    });
  });

  it('explicit dispatch bindings override provider bindings', async () => {
    const { runtime, page } = setup();
    const seenBindings: Record<string, unknown>[] = [];
    const handle = runtime.registerRendererReaction({
      id: 'r12',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async (_action, ctx) => {
        seenBindings.push(ctx?.evaluationBindings ?? {});
        return { ok: true };
      },
    });

    const handleWithSetter = handle as import('@nop-chaos/flux-core').ReactionHandle & {
      _setBindingsProvider?(fn: (() => Record<string, unknown>) | undefined): void;
    };
    handleWithSetter._setBindingsProvider?.(() => ({
      pagination: { currentPage: 1, pageSize: 10 },
    }));

    // Explicit dispatch with its own bindings — should override provider
    await handle.dispatch({
      evaluationBindings: { pagination: { currentPage: 5, pageSize: 20 } },
    });

    expect(seenBindings[0]).toMatchObject({
      pagination: { currentPage: 5, pageSize: 20 },
    });
  });
});
