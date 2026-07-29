import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, pageRenderer, env } from './test-fixtures.js';

describe('createRendererRuntime - dialog/drawer scope isolation', () => {
  it('action-driven dialog with isolate: true does NOT inherit parent scope values', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ parentKey: 'parent-value' });
    const surfaceRuntime = runtime.createSurfaceRuntime();

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: 'Isolated dialog',
          isolate: true,
          data: { localKey: 'local-value' },
          body: [{ type: 'text', text: 'Body' }],
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
      },
    );

    const dialogState = surfaceRuntime.store.getState().entries[0];
    expect(dialogState.scope.get('localKey')).toBe('local-value');
    expect(dialogState.scope.get('parentKey')).toBeUndefined();
    expect(dialogState.scope.readOwn()).toMatchObject({
      dialogId: dialogState.id,
      localKey: 'local-value',
    });
  });

  it('action-driven dialog without isolate (default) inherits parent scope values', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ parentKey: 'parent-value' });
    const surfaceRuntime = runtime.createSurfaceRuntime();

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: 'Inheriting dialog',
          data: { localKey: 'local-value' },
          body: [{ type: 'text', text: 'Body' }],
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
      },
    );

    const dialogState = surfaceRuntime.store.getState().entries[0];
    expect(dialogState.scope.get('localKey')).toBe('local-value');
    expect(dialogState.scope.get('parentKey')).toBe('parent-value');
  });

  it('action-driven dialog with isolate: true sees parent mutation after opening is NOT reflected', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ mutable: 'original' });
    const surfaceRuntime = runtime.createSurfaceRuntime();

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: 'Isolated dialog',
          isolate: true,
          body: [{ type: 'text', text: 'Body' }],
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
      },
    );

    page.scope.update('mutable', 'changed');

    const dialogState = surfaceRuntime.store.getState().entries[0];
    expect(dialogState.scope.get('mutable')).toBeUndefined();
  });

  it('action-driven drawer with isolate: true does NOT inherit parent scope values', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ parentKey: 'parent-value' });
    const surfaceRuntime = runtime.createSurfaceRuntime();

    await runtime.dispatch(
      {
        action: 'openDrawer',
        args: {
          title: 'Isolated drawer',
          isolate: true,
          data: { localKey: 'local-value' },
          body: [{ type: 'text', text: 'Body' }],
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
      },
    );

    const drawerState = surfaceRuntime.store.getState().entries[0];
    expect(drawerState.scope.get('localKey')).toBe('local-value');
    expect(drawerState.scope.get('parentKey')).toBeUndefined();
    expect(drawerState.scope.readOwn()).toMatchObject({
      dialogId: drawerState.id,
      drawerId: drawerState.id,
      localKey: 'local-value',
    });
  });

  it('action-driven drawer without isolate (default) inherits parent scope values', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ parentKey: 'parent-value' });
    const surfaceRuntime = runtime.createSurfaceRuntime();

    await runtime.dispatch(
      {
        action: 'openDrawer',
        args: {
          title: 'Inheriting drawer',
          body: [{ type: 'text', text: 'Body' }],
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
      },
    );

    const drawerState = surfaceRuntime.store.getState().entries[0];
    expect(drawerState.scope.get('parentKey')).toBe('parent-value');
  });
});
