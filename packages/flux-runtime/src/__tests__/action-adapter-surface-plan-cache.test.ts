import { describe, expect, it, vi } from 'vitest';
import type { SchemaValue } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { pageRenderer, textRenderer, env } from './test-fixtures.js';

// R3-P2: opening the same dialog/drawer body repeatedly must reuse the cached
// validation plan instead of re-running the full page-schema compilation for
// every open. The cache keys on the body schema object identity.
describe('surface validation plan compile cache', () => {
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
    const compileSpy = vi.spyOn(runtime, 'compile');
    return { runtime, page, surfaceRuntime, compileSpy };
  }

  function countPageCompiles(compileSpy: ReturnType<typeof vi.spyOn>) {
    return compileSpy.mock.calls.filter(
      (call: unknown[]) => (call[0] as { type?: string } | undefined)?.type === 'page',
    ).length;
  }

  it('compiles the dialog validation plan once across repeated opens of the same body', async () => {
    const { runtime, page, surfaceRuntime, compileSpy } = setup();
    const body = [{ type: 'text', text: 'Body' }] as unknown as SchemaValue;

    const openOnce = () =>
      runtime.dispatch(
        {
          action: 'openDialog',
          args: { title: 'Cached dialog', body },
        },
        { runtime, scope: page.scope, page, surfaceRuntime },
      );

    await openOnce();
    const afterFirst = countPageCompiles(compileSpy);
    expect(afterFirst).toBeGreaterThan(0);

    surfaceRuntime.closeTop();
    await openOnce();
    surfaceRuntime.closeTop();
    await openOnce();

    expect(countPageCompiles(compileSpy)).toBe(afterFirst);
  });

  it('recompiles when the body schema identity changes and the new plan takes effect', async () => {
    const { runtime, page, surfaceRuntime, compileSpy } = setup();

    const openWith = (body: SchemaValue) =>
      runtime.dispatch(
        {
          action: 'openDialog',
          args: { title: 'Cached dialog', body },
        },
        { runtime, scope: page.scope, page, surfaceRuntime },
      );

    await openWith([{ type: 'text', text: 'Body A' }]);
    const afterFirst = countPageCompiles(compileSpy);
    surfaceRuntime.closeTop();

    await openWith([{ type: 'text', text: 'Body B' }]);
    expect(countPageCompiles(compileSpy)).toBeGreaterThan(afterFirst);
  });

  it('caches drawer validation plans the same way', async () => {
    const { runtime, page, surfaceRuntime, compileSpy } = setup();
    const body = [{ type: 'text', text: 'Drawer body' }] as unknown as SchemaValue;

    const openOnce = () =>
      runtime.dispatch(
        {
          action: 'openDrawer',
          args: { title: 'Cached drawer', body },
        },
        { runtime, scope: page.scope, page, surfaceRuntime },
      );

    await openOnce();
    const afterFirst = countPageCompiles(compileSpy);
    expect(afterFirst).toBeGreaterThan(0);

    surfaceRuntime.closeTop();
    await openOnce();

    expect(countPageCompiles(compileSpy)).toBe(afterFirst);
  });
});
