import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { pageRenderer, textRenderer, env } from './test-fixtures.js';

describe('onSubmitSuccess $formData binding (plan 460 compile-side fix)', () => {
  it('openDialog succeeds with ${$formData.x} in onSubmitSuccess; hook writes owner scope', async () => {
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
          title: 'Picker',
          body: [{ type: 'text', text: 'Body' }],
          onSubmitSuccess: {
            action: 'setValue',
            args: { path: 'todoDate', value: '${$formData.todoDate}' },
          },
        },
      },
      { runtime, scope: page.scope, page, surfaceRuntime },
    );
    expect(openResult.ok, (openResult.error as Error | undefined)?.stack ?? String(openResult.error)).toBe(true);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(1);

    const entry = surfaceRuntime.store.getState().entries[0]!;
    expect(entry.onSubmitSuccessNodes).toBeDefined();

    await surfaceRuntime.triggerHook!(entry, 'submit:success', {
      result: { id: 1 },
      formData: { todoDate: 'tomorrow' },
      hookName: 'submit:success',
    });

    // Hook dispatched in owner ctx: setValue wrote $formData.todoDate into the owner scope.
    expect(page.scope.get('todoDate')).toBe('tomorrow');
  });
});
