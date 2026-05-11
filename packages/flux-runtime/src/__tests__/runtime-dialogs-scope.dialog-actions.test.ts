import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { pageRenderer, textRenderer, env } from './test-fixtures.js';

describe('createRendererRuntime - dialog and drawer actions', () => {
  it('opens and closes dialogs through openDialog actions', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ message: 'Hello' });
    const surfaceRuntime = runtime.createSurfaceRuntime();

    const openResult = await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: 'Runtime dialog',
          body: [{ type: 'text', text: '${message}' }],
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
      },
    );

    expect(openResult.ok, String(openResult.error)).toBe(true);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(1);
    const dialogState = surfaceRuntime.store.getState().entries[0];
    expect(dialogState.surface.title).toBe('Runtime dialog');
    expect(dialogState.body).toBeTruthy();
    expect(dialogState.scope.get('dialogId')).toBe(dialogState.id);
    expect(dialogState.validationOwner?.scopeId).toBe(`${dialogState.id}-validation`);
    expect(dialogState.validationOwner?.scope).toBe(dialogState.scope);

    const closeResult = await runtime.dispatch(
      {
        action: 'closeDialog',
      },
      {
        runtime,
        scope: dialogState.scope,
        page,
        surfaceRuntime,
        dialogId: dialogState.id,
      },
    );

    expect(closeResult.ok).toBe(true);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
  });

  it('closes surfaces through closeSurface actions', async () => {
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
          title: 'Runtime dialog',
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

    const entry = surfaceRuntime.store.getState().entries[0];
    const closeResult = await runtime.dispatch(
      {
        action: 'closeSurface',
      },
      {
        runtime,
        scope: entry.scope,
        page,
        surfaceRuntime,
        dialogId: entry.id,
      },
    );

    expect(closeResult.ok).toBe(true);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
  });

  it('closes explicit surface ids through closeSurface actions', async () => {
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
          title: 'First',
          body: [{ type: 'text', text: 'First body' }],
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
      },
    );

    await runtime.dispatch(
      {
        action: 'openDrawer',
        args: {
          title: 'Second',
          body: [{ type: 'text', text: 'Second body' }],
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
      },
    );

    const entries = surfaceRuntime.store.getState().entries;
    const firstId = entries[0].id;
    const secondId = entries[1].id;
    const closeResult = await runtime.dispatch(
      {
        action: 'closeSurface',
        surfaceId: firstId,
      },
      {
        runtime,
        scope: entries[1].scope,
        page,
        surfaceRuntime,
        dialogId: entries[1].id,
      },
    );

    expect(closeResult.ok).toBe(true);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(1);
    expect(surfaceRuntime.store.getState().entries[0].id).toBe(secondId);
  });

  it('closes the nearest dialog by default', async () => {
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
          title: 'First',
          body: [{ type: 'text', text: 'First body' }],
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
      },
    );

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: 'Second',
          body: [{ type: 'text', text: 'Second body' }],
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
      },
    );

    const entries = surfaceRuntime.store.getState().entries;
    expect(entries).toHaveLength(2);

    const closeResult = await runtime.dispatch(
      {
        action: 'closeDialog',
      },
      {
        runtime,
        scope: entries[1].scope,
        page,
        surfaceRuntime,
        dialogId: entries[1].id,
      },
    );

    expect(closeResult.ok).toBe(true);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(1);
    expect(surfaceRuntime.store.getState().entries[0].id).toBe(entries[0].id);
  });
});
