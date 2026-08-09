import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { pageRenderer, textRenderer, env } from './test-fixtures.js';

/**
 * closeOnSubmit (AMIS semantic): a surface opened with `closeOnSubmit: true`
 * closes automatically after a `submitScope: 'surface'` form submits
 * successfully (submit:success hook), regardless of whether the submit was
 * triggered by a button click or the Enter key — both funnel through
 * `triggerHook('submit:success')`. Failure paths keep the surface open.
 */
describe('surface closeOnSubmit', () => {
  function setupRuntime() {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const surfaceRuntime = runtime.createSurfaceRuntime();
    return { runtime, page, surfaceRuntime };
  }

  it('closes the surface after submit:success when closeOnSubmit is true', async () => {
    const { runtime, page, surfaceRuntime } = setupRuntime();
    const notifySpy = vi.spyOn(env, 'notify');

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: 'Close on submit',
          body: [{ type: 'text', text: 'Form' }],
          closeOnSubmit: true,
          onSubmitSuccess: { action: 'showToast', args: { level: 'success', message: 'ok' } },
        },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );

    const entry = surfaceRuntime.store.getState().entries[0]!;
    expect(entry.closeOnSubmit).toBe(true);

    await surfaceRuntime.triggerHook!(entry, 'submit:success', {
      result: { id: 42 },
      formData: { name: 'Alice' },
      hookName: 'submit:success',
    });

    // onSubmitSuccess hook ran before close.
    expect(notifySpy).toHaveBeenCalledWith('success', 'ok');
    // Surface auto-closed.
    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
  });

  it('keeps the surface open when closeOnSubmit is absent', async () => {
    const { runtime, page, surfaceRuntime } = setupRuntime();

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          body: [{ type: 'text', text: 'Form' }],
          onSubmitSuccess: { action: 'showToast', args: { level: 'success', message: 'ok' } },
        },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );

    const entry = surfaceRuntime.store.getState().entries[0]!;
    expect(entry.closeOnSubmit).toBeFalsy();

    await surfaceRuntime.triggerHook!(entry, 'submit:success', {
      result: { id: 42 },
      hookName: 'submit:success',
    });

    expect(surfaceRuntime.store.getState().entries).toHaveLength(1);
  });

  it('keeps the surface open on submit:error even with closeOnSubmit', async () => {
    const { runtime, page, surfaceRuntime } = setupRuntime();

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          body: [{ type: 'text', text: 'Form' }],
          closeOnSubmit: true,
          onSubmitError: { action: 'showToast', args: { level: 'error', message: 'failed' } },
        },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );

    const entry = surfaceRuntime.store.getState().entries[0]!;

    await surfaceRuntime.triggerHook!(entry, 'submit:error', {
      result: { ok: false, error: new Error('boom') },
      hookName: 'submit:error',
    });

    expect(surfaceRuntime.store.getState().entries).toHaveLength(1);
  });

  it('closes even when no onSubmitSuccess hook nodes are declared', async () => {
    const { runtime, page, surfaceRuntime } = setupRuntime();

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          body: [{ type: 'text', text: 'Form' }],
          closeOnSubmit: true,
        },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );

    const entry = surfaceRuntime.store.getState().entries[0]!;

    const result = await surfaceRuntime.triggerHook!(entry, 'submit:success', {
      result: { id: 42 },
      hookName: 'submit:success',
    });

    expect(result.ok).toBe(true);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
  });

  it('passes closeOnSubmit through for openDrawer', async () => {
    const { runtime, page, surfaceRuntime } = setupRuntime();

    await runtime.dispatch(
      {
        action: 'openDrawer',
        args: {
          title: 'Drawer',
          body: [{ type: 'text', text: 'Form' }],
          closeOnSubmit: true,
        },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );

    const entry = surfaceRuntime.store.getState().entries[0]!;
    expect(entry.kind).toBe('drawer');
    expect(entry.closeOnSubmit).toBe(true);
  });
});
