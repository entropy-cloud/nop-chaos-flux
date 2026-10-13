import { describe, expect, it, vi } from 'vitest';
import { makePlan, setup } from './renderer-reaction-handle-fixtures.js';

/**
 * Configure-channel characterization for renderer-owned reaction handles
 * (CX-7 WA-react-005): the four renderer-owned channels (`bindingsProvider`,
 * `scopeOverride`, `ignoreWritesTo`, `loadCallbacks`) are reached exclusively
 * through `ReactionHandle.configure(options)` with per-key present semantics.
 */
describe('registerRendererReaction configure channels (CX-7 WA-react-005)', () => {
  it('scope override channels dispatches at the renderer scope (characterization)', async () => {
    const { runtime, page } = setup();
    const seenScopes: unknown[] = [];
    const handle = runtime.registerRendererReaction({
      id: 'r13',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async (_action, ctx) => {
        seenScopes.push(ctx?.scope);
        return { ok: true };
      },
    });

    const overrideScope = runtime.createHostProjectionScope({
      parentScope: page.scope,
      projection: { crud: { page: 1 } },
      path: '$.crud',
      scopeLabel: 'probe',
    });
    handle.configure({ scopeOverride: overrideScope });

    await handle.dispatch();

    expect(seenScopes[0]).toBe(overrideScope);
  });

  it('renderer-declared ignore roots suppress self-write triggers (characterization)', async () => {
    const { runtime, page } = setup();
    let fireCount = 0;
    const handle = runtime.registerRendererReaction({
      id: 'r14',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async () => {
        fireCount += 1;
        return { ok: true };
      },
    });

    handle.configure({ ignoreWritesTo: ['local'] });

    handle.ready();
    page.scope.update('local', { revision: 1 });
    await Promise.resolve();
    await Promise.resolve();
    expect(fireCount).toBe(0);

    page.scope.update('user', { id: 'u2' });
    await vi.waitFor(() => {
      expect(fireCount).toBe(1);
    });
  });

  it('load callbacks capture reactive force() results (characterization)', async () => {
    const { runtime, page } = setup();
    const started: number[] = [];
    const settled: unknown[] = [];
    const handle = runtime.registerRendererReaction({
      id: 'r15',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async () => ({ ok: true, data: { rows: [] } }),
    });

    handle.configure({
      loadCallbacks: {
        onStart: () => {
          started.push(1);
        },
        onSettle: (result) => {
          settled.push(result);
        },
      },
    });

    handle.ready();
    handle.force();

    await vi.waitFor(() => {
      expect(settled).toHaveLength(1);
    });
    expect(started).toHaveLength(1);
  });

  it('clears the bindings provider when re-registered with undefined (characterization)', async () => {
    const { runtime, page } = setup();
    const seenBindings: Record<string, unknown>[] = [];
    const handle = runtime.registerRendererReaction({
      id: 'r16',
      scope: page.scope,
      compiledReactionPlan: makePlan(['user']),
      dispatch: async (_action, ctx) => {
        seenBindings.push(ctx?.evaluationBindings ?? {});
        return { ok: true };
      },
    });

    handle.configure({ bindingsProvider: () => ({ query: { keywords: 'x' } }) });
    handle.configure({ bindingsProvider: undefined });

    handle.ready();
    await handle.dispatch();

    expect(seenBindings[0]).toEqual({});
  });
});
