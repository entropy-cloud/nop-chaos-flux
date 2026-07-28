import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { pageRenderer, textRenderer, env } from './test-fixtures.js';

/**
 * Phase 3 end-to-end test: openDialog → close triggers onCloseNodes hook
 * (dispatched in owner ctx). Validates that hook schema captured at open
 * dispatches against the owner runtime/scope when surface closes.
 */
describe('surface lifecycle hooks — Phase 3 close hook', () => {
  it('triggers onCloseNodes when close() is called', async () => {
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
        action: 'openDialog',
        args: {
          title: 'With onClose hook',
          body: [{ type: 'text', text: 'Body' }],
          onClose: { action: 'setValue', args: { path: 'closed', value: true } },
        },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );
    expect(openResult.ok, String(openResult.error)).toBe(true);

    const entryBeforeClose = surfaceRuntime.store.getState().entries[0]!;
    expect(entryBeforeClose.onCloseNodes).toBeDefined();

    // Close the surface; this should fire-and-forget the onClose hook.
    surfaceRuntime.close(entryBeforeClose.id);

    // Hook is dispatched asynchronously (fire-and-forget). Wait a tick.
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Owner scope should now reflect the setValue side effect.
    expect(page.scope.get('closed')).toBe(true);
    // Surface entry disposed.
    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
  });

  it('does not fire onCloseNodes when surface has no hook', async () => {
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
        args: { body: [{ type: 'text', text: 'x' }] },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );

    const entry = surfaceRuntime.store.getState().entries[0]!;
    surfaceRuntime.close(entry.id);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
    // page scope untouched
    expect(page.scope.readOwn()).toEqual({});
  });

  it('forwards onClose hook results through runtime.dispatch and reports failures on reject', async () => {
    const notifySpy = vi.spyOn(env, 'notify');
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const mockRuntime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = mockRuntime.createPageRuntime({});
    const surfaceRuntime = mockRuntime.createSurfaceRuntime();

    // Open dialog first (with real dispatch), then override dispatch to reject
    await mockRuntime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: 'Rejecting onClose',
          body: [{ type: 'text', text: 'Body' }],
          onClose: { action: 'setValue', args: { path: 'x', value: 1 } },
        },
      },
      { runtime: mockRuntime, scope: page.scope, page, surfaceRuntime },
    );

    const rejection = new Error('onClose reject');
    mockRuntime.dispatch = vi.fn().mockRejectedValue(rejection) as typeof mockRuntime.dispatch;

    const entry = surfaceRuntime.store.getState().entries[0]!;
    surfaceRuntime.close(entry.id);

    await vi.waitFor(() => {
      expect(notifySpy).toHaveBeenCalledWith('warning', 'Surface onClose hook failed');
    });
    notifySpy.mockRestore();
  });

  it('triggerHook dispatches submit:success with $formData + $result', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const surfaceRuntime = runtime.createSurfaceRuntime();

    const notifySpy = vi.spyOn(env, 'notify');

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
    expect(entry.onSubmitSuccessNodes).toBeDefined();

    // Simulate form submit success firing triggerHook.
    await surfaceRuntime.triggerHook!(entry, 'submit:success', {
      result: { id: 42 },
      formData: { name: 'Alice' },
      hookName: 'submit:success',
    });

    expect(notifySpy).toHaveBeenCalledWith('success', 'ok');
  });
});
