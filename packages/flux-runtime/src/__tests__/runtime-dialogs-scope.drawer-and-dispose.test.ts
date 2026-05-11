import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { pageRenderer, textRenderer, env } from './test-fixtures.js';

describe('createRendererRuntime - drawer and teardown behavior', () => {
  it('opens and closes drawers through openDrawer actions', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    runtime.compile({ type: 'text', text: 'trigger' });
    const page = runtime.createPageRuntime({});
    const surfaceRuntime = runtime.createSurfaceRuntime();

    const openResult = await runtime.dispatch(
      {
        action: 'openDrawer',
        args: {
          title: 'Runtime drawer',
          body: [{ type: 'text', text: 'Drawer body' }],
          statusPath: 'drawerStatus',
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
      },
    );

    expect(openResult.ok).toBe(true);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(1);
    expect(surfaceRuntime.store.getState().entries[0].kind).toBe('drawer');
    expect(page.scope.get('drawerStatus')).toEqual({
      id: surfaceRuntime.store.getState().entries[0].id,
      kind: 'drawer',
      open: true,
      active: true,
      opening: false,
      closing: false,
    });

    const closeResult = await runtime.dispatch(
      {
        action: 'closeDrawer',
      },
      {
        runtime,
        scope: surfaceRuntime.store.getState().entries[0].scope,
        page,
        surfaceRuntime,
        dialogId: surfaceRuntime.store.getState().entries[0].id,
      },
    );

    expect(closeResult.ok).toBe(true);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
    expect(page.scope.get('drawerStatus')).toEqual({
      id: expect.any(String),
      kind: 'drawer',
      open: false,
      active: false,
      opening: false,
      closing: false,
    });
  });

  it('supports args as the recommended drawer payload carrier', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ drawerTitle: 'Args drawer' });
    const surfaceRuntime = runtime.createSurfaceRuntime();

    const result = await runtime.dispatch(
      {
        action: 'openDrawer',
        args: {
          title: '${drawerTitle}',
          body: [{ type: 'text', text: 'Drawer from args' }],
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
      },
    );

    expect(result.ok).toBe(true);
    expect(surfaceRuntime.store.getState().entries).toHaveLength(1);
    expect(surfaceRuntime.store.getState().entries[0].kind).toBe('drawer');
    expect(surfaceRuntime.store.getState().entries[0].surface.title).toBe('Args drawer');
  });

  it('applies drawer data as the child-scope init patch', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ pageOnly: 'root' });
    const surfaceRuntime = runtime.createSurfaceRuntime();

    await runtime.dispatch(
      {
        action: 'openDrawer',
        args: {
          title: 'Drawer with data',
          data: { recordId: 99, mode: 'preview' },
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
    expect(drawerState.scope.get('dialogId')).toBe(drawerState.id);
    expect(drawerState.scope.get('drawerId')).toBe(drawerState.id);
    expect(drawerState.scope.get('recordId')).toBe(99);
    expect(drawerState.scope.get('mode')).toBe('preview');
    expect(drawerState.scope.get('pageOnly')).toBe('root');
  });

  it('disposes open surface entries during runtime teardown', async () => {
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
          title: 'Dispose dialog',
          statusPath: 'dialogStatus',
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

    expect(surfaceRuntime.store.getState().entries).toHaveLength(1);

    runtime.dispose();

    expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
    expect(page.scope.get('dialogStatus')).toEqual({
      id: expect.any(String),
      kind: 'dialog',
      open: false,
      active: false,
      opening: false,
      closing: false,
    });
  });
});
