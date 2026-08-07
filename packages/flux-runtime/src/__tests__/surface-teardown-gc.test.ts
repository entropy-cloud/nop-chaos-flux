import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { pageRenderer, textRenderer, env } from './test-fixtures.js';

// L1 regression gate: after repeated open/close cycles no SurfaceEntry and no
// surface scope is retained. jsdom has no real GC, so "detached scope" is
// asserted through the production teardown chain itself: surface scopes are
// created via the production `runtime.createChildScope` (registered for
// disposal), and `close()` runs `disposeEntry` → `disposeOwnedScope` →
// `runtime.disposeScope`, which reaches the real `scope.dispose()` for both the
// surface scope and its opening scope. The dispose effect is observable: a
// disposed ScopeRef returns `undefined` for `get()` and `{}` for `value`. This
// pins the disposeEntry chain (surface-runtime.ts disposeEntry) against
// retain-leak regressions without injecting a mock that bypasses the
// production chain.
describe('createRendererRuntime - surface teardown GC across repeated cycles', () => {
  function setup() {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    runtime.compile({ type: 'text', text: 'trigger' });
    const page = runtime.createPageRuntime({});
    const surfaceRuntime = runtime.createSurfaceRuntime();
    return { runtime, page, surfaceRuntime };
  }

  async function openDialog(
    runtime: ReturnType<typeof createRendererRuntime>,
    page: ReturnType<ReturnType<typeof createRendererRuntime>['createPageRuntime']>,
    surfaceRuntime: ReturnType<ReturnType<typeof createRendererRuntime>['createSurfaceRuntime']>,
  ) {
    return runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: 'GC dialog',
          statusPath: 'dialogStatus',
          body: [{ type: 'text', text: 'Body' }],
        },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );
  }

  it('disposes the surface scope pair through the production chain across 50 open→close cycles (close path)', async () => {
    const { runtime, page, surfaceRuntime } = setup();
    const createSpy = vi.spyOn(runtime, 'createChildScope');
    const CYCLES = 50;

    for (let i = 0; i < CYCLES; i++) {
      const createdBefore = createSpy.mock.calls.length;
      const openResult = await openDialog(runtime, page, surfaceRuntime);
      expect(openResult.ok).toBe(true);
      // surface scope pair (opening + main) is created through the production
      // createChildScope chain — registered for disposal, not raw createScopeRef
      expect(createSpy.mock.calls.length - createdBefore).toBe(2);
      // exactly one live entry while open
      expect(surfaceRuntime.store.getState().entries).toHaveLength(1);
      const entry = surfaceRuntime.store.getState().entries[0]!;
      // the surface scope carries the dialogId and its opening scope sees the
      // owner status while both are alive
      expect(entry.scope.get('dialogId')).toBeTruthy();
      expect(entry.scope.parent!.value).toMatchObject({ dialogStatus: expect.anything() });

      surfaceRuntime.closeTop();
      // entry removed immediately — no retained SurfaceEntry
      expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
      // real scope.dispose() ran through the production chain: reads on the
      // disposed surface scope and its opening scope are inert
      expect(entry.scope.get('dialogId')).toBeUndefined();
      expect(entry.scope.parent!.value).toEqual({});
      // status flipped back to closed every cycle
      expect(page.scope.get('dialogStatus')).toMatchObject({ open: false, active: false });
    }

    // exactly one scope pair created per opened surface — no leaked scope objects
    expect(createSpy.mock.calls.length).toBe(CYCLES * 2);
    createSpy.mockRestore();
  });

  it('drives ownedSurfaceRuntimes disposal: root runtime.dispose() clears all stacked entries', async () => {
    const { runtime, page, surfaceRuntime } = setup();
    const STACK = 3;

    for (let i = 0; i < STACK; i++) {
      await openDialog(runtime, page, surfaceRuntime);
    }
    expect(surfaceRuntime.store.getState().entries).toHaveLength(STACK);
    const openScopes = surfaceRuntime.store
      .getState()
      .entries.map((entry) => ({ scope: entry.scope, opening: entry.scope.parent }));

    // root teardown path (runtime-factory dispose → ownedSurfaceRuntimes.dispose)
    runtime.dispose();

    // every stacked entry torn down — no retained SurfaceEntry
    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
    // every surface scope pair really disposed
    for (const { scope, opening } of openScopes) {
      expect(scope.get('dialogId')).toBeUndefined();
      expect(opening!.value).toEqual({});
    }
  });

  it('explicit close(id) teardown path leaves no entry and disposes the real scope', async () => {
    const { runtime, page, surfaceRuntime } = setup();

    await openDialog(runtime, page, surfaceRuntime);
    const entryId = surfaceRuntime.store.getState().entries[0]?.id;
    expect(entryId).toBeTruthy();
    const scope = surfaceRuntime.store.getState().entries[0]!.scope;

    surfaceRuntime.close(entryId!);

    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
    expect(scope.get('dialogId')).toBeUndefined();
    expect(scope.parent!.value).toEqual({});
  });
});
