import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { pageRenderer, textRenderer, env } from './test-fixtures.js';

// L1 regression gate: after repeated open/close cycles no SurfaceEntry and no
// child scope is retained. jsdom has no real GC, so "detached DOM" is asserted
// via the falsifiable proxy the surface contract exposes — the entries array
// returns to zero length after every close, and `disposeScope` (the child-scope
// teardown hook) is invoked exactly once per opened surface. This pins the
// disposeEntry chain (surface-runtime.ts disposeEntry) against retain-leak
// regressions without depending on jsdom garbage collection.
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
    const disposedScopeIds: string[] = [];
    const surfaceRuntime = runtime.createSurfaceRuntime({
      disposeScope: (scopeId: string) => {
        disposedScopeIds.push(scopeId);
      },
    });
    return { runtime, page, surfaceRuntime, disposedScopeIds };
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

  it('retains no SurfaceEntry / child scope across 50 open→close cycles (close path)', async () => {
    const { runtime, page, surfaceRuntime, disposedScopeIds } = setup();
    const CYCLES = 50;

    for (let i = 0; i < CYCLES; i++) {
      const openResult = await openDialog(runtime, page, surfaceRuntime);
      expect(openResult.ok).toBe(true);
      // exactly one live entry while open
      expect(surfaceRuntime.store.getState().entries).toHaveLength(1);

      surfaceRuntime.closeTop();
      // entry removed immediately — no retained SurfaceEntry
      expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
      // status flipped back to closed every cycle
      expect(page.scope.get('dialogStatus')).toMatchObject({ open: false, active: false });
    }

    // one child-scope dispose per opened surface — no leaked scope objects
    expect(disposedScopeIds).toHaveLength(CYCLES);
    // every disposed id was a real (non-empty) scope id, not a no-op
    expect(disposedScopeIds.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
  });

  it('drives ownedSurfaceRuntimes disposal: root runtime.dispose() clears all stacked entries', async () => {
    const { runtime, page, surfaceRuntime, disposedScopeIds } = setup();
    const STACK = 3;

    for (let i = 0; i < STACK; i++) {
      await openDialog(runtime, page, surfaceRuntime);
    }
    expect(surfaceRuntime.store.getState().entries).toHaveLength(STACK);

    // root teardown path (runtime-factory dispose → ownedSurfaceRuntimes.dispose)
    runtime.dispose();

    // every stacked entry torn down — no retained SurfaceEntry
    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
    // every child scope disposed exactly once through disposeEntry
    expect(disposedScopeIds).toHaveLength(STACK);
  });

  it('explicit close(id) teardown path leaves no entry and disposes exactly one scope', async () => {
    const { runtime, page, surfaceRuntime, disposedScopeIds } = setup();

    await openDialog(runtime, page, surfaceRuntime);
    const entryId = surfaceRuntime.store.getState().entries[0]?.id;
    expect(entryId).toBeTruthy();

    surfaceRuntime.close(entryId!);

    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
    expect(disposedScopeIds).toHaveLength(1);
    expect(disposedScopeIds[0]).toBeTruthy();
  });
});
