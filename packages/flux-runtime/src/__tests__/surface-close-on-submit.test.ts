import { describe, expect, it, vi } from 'vitest';
import type { RendererEnv, RendererRuntime } from '@nop-chaos/flux-core';
import type { ApiRequestExecutor } from '../async-data/request-runtime.js';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { pageRenderer, textRenderer, env } from './test-fixtures.js';
import {
  createActionRuntimeAdapter,
  createBuiltInInvocation,
  createCtx,
} from './action-adapter.test-support.js';
import { createScopeRef } from '../scope.js';

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
    const removeSpy = vi.spyOn(surfaceRuntime.store, 'remove');

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

    // Order contract: the onSubmitSuccess hook runs BEFORE the surface
    // closes ("hook 先跑后关闭"). close() → disposeOwnedScope destroys the
    // surface scope, so a hook reading surface scope values must run first.
    // Detectable: inverting to close-then-dispatch turns this assertion red.
    expect(notifySpy).toHaveBeenCalledWith('success', 'ok');
    expect(notifySpy.mock.invocationCallOrder[0]).toBeLessThan(
      removeSpy.mock.invocationCallOrder[0],
    );
    // Surface auto-closed.
    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);

    notifySpy.mockRestore();
    removeSpy.mockRestore();
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

  it('closes after submit:success when the hook action fails with {ok:false}', async () => {
    const { runtime, page, surfaceRuntime } = setupRuntime();

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          body: [{ type: 'text', text: 'Form' }],
          closeOnSubmit: true,
          onSubmitSuccess: { action: 'refreshNearest', args: { notFound: 'error' } },
        },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );

    const entry = surfaceRuntime.store.getState().entries[0]!;

    const result = await surfaceRuntime.triggerHook!(entry, 'submit:success', {
      result: { id: 42 },
      hookName: 'submit:success',
    });

    expect(result.ok).toBe(false);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
  });

  it('closes after submit:success when the hook throws', async () => {
    const { runtime, page, surfaceRuntime } = setupRuntime();

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          body: [{ type: 'text', text: 'Form' }],
          closeOnSubmit: true,
          onSubmitSuccess: { action: 'showToast', args: { level: 'success', message: 'ok' } },
        },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );

    const entry = surfaceRuntime.store.getState().entries[0]!;
    const dispatchSpy = vi
      .spyOn(entry.ownerActionCtx!.runtime, 'dispatch')
      .mockRejectedValueOnce(new Error('owner runtime torn down'));

    const result = await surfaceRuntime.triggerHook!(entry, 'submit:success', {
      result: { id: 42 },
      hookName: 'submit:success',
    });

    expect(result.ok).toBe(false);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
    dispatchSpy.mockRestore();
  });

  it('keeps the surface open on hook {ok:false} when closeOnSubmit is absent', async () => {
    const { runtime, page, surfaceRuntime } = setupRuntime();

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          body: [{ type: 'text', text: 'Form' }],
          onSubmitSuccess: { action: 'refreshNearest', args: { notFound: 'error' } },
        },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );

    const entry = surfaceRuntime.store.getState().entries[0]!;

    const result = await surfaceRuntime.triggerHook!(entry, 'submit:success', {
      result: { id: 42 },
      hookName: 'submit:success',
    });

    expect(result.ok).toBe(false);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(1);
  });

  it('keeps the surface open on hook throw when closeOnSubmit is absent', async () => {
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
    const dispatchSpy = vi
      .spyOn(entry.ownerActionCtx!.runtime, 'dispatch')
      .mockRejectedValueOnce(new Error('owner runtime torn down'));

    const result = await surfaceRuntime.triggerHook!(entry, 'submit:success', {
      result: { id: 42 },
      hookName: 'submit:success',
    });

    expect(result.ok).toBe(false);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(1);
    dispatchSpy.mockRestore();
  });

  it('keeps the surface open on submit:error even when the hook throws', async () => {
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
    const dispatchSpy = vi
      .spyOn(entry.ownerActionCtx!.runtime, 'dispatch')
      .mockRejectedValueOnce(new Error('owner runtime torn down'));

    await surfaceRuntime.triggerHook!(entry, 'submit:error', {
      result: { ok: false, error: new Error('boom') },
      hookName: 'submit:error',
    });

    expect(surfaceRuntime.store.getState().entries).toHaveLength(1);
    dispatchSpy.mockRestore();
  });

  it('keeps the surface open on submit:error even when the hook fails with {ok:false}', async () => {
    const { runtime, page, surfaceRuntime } = setupRuntime();

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          body: [{ type: 'text', text: 'Form' }],
          closeOnSubmit: true,
          onSubmitError: { action: 'refreshNearest', args: { notFound: 'error' } },
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

  it('normalizes closeOnSubmit at the adapter entry — only boolean true triggers auto-close (matrix: true / "true" / undefined)', async () => {
    const { page, surfaceRuntime } = setupRuntime();
    const adapter = createActionRuntimeAdapter({
      getEnv: () => env as RendererEnv,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as unknown as ApiRequestExecutor,
      runtime: { env, compile: vi.fn() } as unknown as RendererRuntime,
      createSurfaceScope: (kind, _ctx, patch) =>
        createScopeRef({
          id: `${kind}-matrix-scope`,
          path: `$${kind}`,
          initialData: patch,
        }),
    });
    const ctx = createCtx({ page, surfaceRuntime, scope: page.scope });

    const cases: Array<{ input: unknown; normalized: boolean }> = [
      { input: true, normalized: true },
      { input: 'true', normalized: false },
      { input: undefined, normalized: false },
    ];

    for (const { input, normalized } of cases) {
      const args: Record<string, unknown> = { title: 'Matrix dialog' };
      if (input !== undefined) {
        args.closeOnSubmit = input;
      }

      const result = await adapter.invokeBuiltInAction(
        createBuiltInInvocation('openDialog', args),
        ctx,
      );
      expect(result.ok).toBe(true);

      const entry = surfaceRuntime.store.getState().entries.at(-1)!;
      expect(entry.closeOnSubmit).toBe(normalized);

      await surfaceRuntime.triggerHook!(entry, 'submit:success', {
        result: { id: 42 },
        hookName: 'submit:success',
      });

      const remaining = surfaceRuntime.store
        .getState()
        .entries.find((candidate) => candidate.id === entry.id);
      if (normalized) {
        expect(remaining).toBeUndefined();
      } else {
        expect(remaining).toBeDefined();
      }
    }
  });
});
