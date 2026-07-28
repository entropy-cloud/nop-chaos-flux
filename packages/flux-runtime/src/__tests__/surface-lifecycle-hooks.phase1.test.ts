import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { pageRenderer, textRenderer, env } from './test-fixtures.js';

describe('surface lifecycle hooks — Phase 1 infrastructure', () => {
  it('captures ownerActionCtx and compiled hook schema nodes on dialog entry', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const surfaceRuntime = runtime.createSurfaceRuntime();

    const ownerCtx = {
      runtime,
      scope: page.scope,
      page,
      surfaceRuntime,
    };

    const openResult = await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: 'With hooks',
          body: [{ type: 'text', text: 'Body' }],
          onClose: { action: 'setValue', args: { path: 'closed', value: true } },
          onSubmitSuccess: [{ action: 'setValue', args: { path: 'saved', value: true } }],
          onSubmitError: { action: 'setValue', args: { path: 'errored', value: true } },
        },
      },
      ownerCtx,
    );

    expect(openResult.ok, String(openResult.error)).toBe(true);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(1);

    const entry = surfaceRuntime.store.getState().entries[0]!;

    // Hook schema nodes captured as ActionSchema (not pre-compiled); Phase 3 dispatches them.
    expect(entry.onCloseNodes).toEqual({
      action: 'setValue',
      args: { path: 'closed', value: true },
    });
    expect(entry.onSubmitSuccessNodes).toHaveLength(1);
    expect((entry.onSubmitSuccessNodes as any[])[0]?.action).toBe('setValue');
    expect(entry.onSubmitErrorNodes).toEqual({
      action: 'setValue',
      args: { path: 'errored', value: true },
    });

    // ownerActionCtx captured (owner runtime + scope snapshot).
    expect(entry.ownerActionCtx).toBeDefined();
    expect(entry.ownerActionCtx?.runtime).toBe(runtime);
    expect(entry.ownerActionCtx?.scope).toBe(page.scope);
    expect(entry.ownerActionCtx?.surfaceRuntime).toBe(surfaceRuntime);
  });

  it('captures hooks on drawer entry', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const surfaceRuntime = runtime.createSurfaceRuntime();

    const openResult = await runtime.dispatch(
      {
        action: 'openDrawer',
        args: {
          title: 'Drawer with hooks',
          body: [{ type: 'text', text: 'Body' }],
          onClose: { action: 'setValue', args: { path: 'drawerClosed', value: true } },
          onSubmitSuccess: { action: 'setValue', args: { path: 'drawerSaved', value: true } },
          onSubmitError: { action: 'setValue', args: { path: 'drawerErrored', value: true } },
        },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );

    expect(openResult.ok, String(openResult.error)).toBe(true);
    const entry = surfaceRuntime.store.getState().entries[0]!;
    expect(entry.kind).toBe('drawer');
    expect(entry.onCloseNodes).toBeDefined();
    expect(entry.onSubmitSuccessNodes).toBeDefined();
    expect(entry.onSubmitErrorNodes).toBeDefined();
    expect(entry.ownerActionCtx?.runtime).toBe(runtime);
  });

  it('does not set hook fields when schema omits them', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const surfaceRuntime = runtime.createSurfaceRuntime();

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: 'No hooks',
          body: [{ type: 'text', text: 'Body' }],
        },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );

    const entry = surfaceRuntime.store.getState().entries[0]!;
    expect(entry.onCloseNodes).toBeUndefined();
    expect(entry.onSubmitSuccessNodes).toBeUndefined();
    expect(entry.onSubmitErrorNodes).toBeUndefined();
    // ownerActionCtx is captured regardless (cheap snapshot; Phase 3 dispatch uses it conditionally).
    expect(entry.ownerActionCtx).toBeDefined();
  });
});
