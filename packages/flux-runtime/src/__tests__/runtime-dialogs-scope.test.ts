import { describe, expect, it } from 'vitest';
import { createRendererRegistry, type RendererDefinition } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, pageRenderer, env } from './test-fixtures.js';

describe('createRendererRuntime', () => {
  it('opens and closes dialogs through openDialog actions', async () => {
    const registry = createRendererRegistry([textRenderer]);
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
    expect(dialogState.validationOwner?.scope?.parent).toBe(dialogState.scope);

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
    const registry = createRendererRegistry([textRenderer]);
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
    const registry = createRendererRegistry([textRenderer]);
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

  it('stores schema-based dialog title and body as raw schema when opening dialogs', async () => {
    const registry = createRendererRegistry([textRenderer]);
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
          title: { type: 'text', text: 'Compiled title' },
          body: [{ type: 'text', text: 'Compiled body' }],
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
      },
    );

    const dialogState = surfaceRuntime.store.getState().entries[0] as any;
    expect(dialogState.title).toEqual({ type: 'text', text: 'Compiled title' });
    expect(Array.isArray(dialogState.body)).toBe(true);
    expect(dialogState.body[0]).toEqual({ type: 'text', text: 'Compiled body' });
  });

  it('supports args as the recommended dialog payload carrier', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ dialogTitle: 'Args dialog' });
    const surfaceRuntime = runtime.createSurfaceRuntime();

    const result = await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: '${dialogTitle}',
          body: [{ type: 'text', text: 'Body from args' }],
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
    const dialogState = surfaceRuntime.store.getState().entries[0] as any;
    expect(dialogState.surface.title).toBe('Args dialog');
    expect(dialogState.body).toEqual([{ type: 'text', text: 'Body from args' }]);
    expect(dialogState.validationOwner?.scopeId).toBe(`${dialogState.id}-validation`);
  });

  it('activates action-opened surface validation owners when the opened body compiles a validation plan', async () => {
    const fieldProbeRenderer: RendererDefinition = {
      type: 'field-probe',
      component: () => null,
      validation: {
        kind: 'field',
        valueKind: 'scalar',
        getFieldPath(schema) {
          return typeof schema.name === 'string' ? schema.name : undefined;
        },
        collectRules() {
          return [{ kind: 'required' as const }];
        },
      },
    };
    const registry = createRendererRegistry([pageRenderer, textRenderer, fieldProbeRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const surfaceRuntime = runtime.createSurfaceRuntime();

    const result = await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: 'Validation dialog',
          body: [{ type: 'field-probe', name: 'email' }],
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
    const dialogState = surfaceRuntime.store.getState().entries[0];
    expect(dialogState.validationOwner?.getScopeState()).toMatchObject({
      lifecycleState: 'active',
      ready: true,
    });
    expect(dialogState.validationOwner?.validation?.nodes).toBeDefined();
    expect(dialogState.validationOwner?.validation?.nodes?.email).toBeDefined();
  });

  it('applies dialog data as the child-scope init patch', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ pageOnly: 'root' });
    const surfaceRuntime = runtime.createSurfaceRuntime();

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: 'Dialog with data',
          data: { recordId: 42, mode: 'edit' },
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
    expect(dialogState.scope.get('dialogId')).toBe(dialogState.id);
    expect(dialogState.scope.get('recordId')).toBe(42);
    expect(dialogState.scope.get('mode')).toBe('edit');
    expect(dialogState.scope.get('pageOnly')).toBe('root');
  });

  it('stores ownerNodeInstance in dialog state when opened from a trigger node', async () => {
    const buttonRenderer: RendererDefinition = {
      type: 'button',
      component: () => null,
    };
    const registry = createRendererRegistry([pageRenderer, textRenderer, buttonRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const pageCompiled = runtime.compile({
      type: 'page',
      body: [
        {
          type: 'button',
          label: 'Open dialog',
        },
      ],
    });
    const page = runtime.createPageRuntime({});
    const surfaceRuntime = runtime.createSurfaceRuntime();
    const pageRoot = Array.isArray(pageCompiled.root) ? pageCompiled.root[0] : pageCompiled.root;
    const bodyRegion = pageRoot.regions['body'];
    const triggerTemplateNode = bodyRegion
      ? Array.isArray(bodyRegion.node)
        ? bodyRegion.node[0]
        : bodyRegion.node
      : undefined;
    const triggerNodeInstance = triggerTemplateNode
      ? ({
          cid: triggerTemplateNode.templateNodeId,
          templateNode: triggerTemplateNode,
          scope: page.scope,
          state: { metaState: {}, mounted: true },
        } as any)
      : undefined;

    await runtime.dispatch(
      {
        action: 'openDialog',
        args: {
          title: { type: 'text', text: 'Compiled title' },
          body: [{ type: 'text', text: 'Compiled body' }],
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        surfaceRuntime,
        nodeInstance: triggerNodeInstance,
      },
    );

    const dialogState = surfaceRuntime.store.getState().entries[0] as any;
    expect(dialogState.ownerNodeInstance).toBe(triggerNodeInstance);
    expect(dialogState.title).toEqual({ type: 'text', text: 'Compiled title' });
    expect(dialogState.body).toEqual([{ type: 'text', text: 'Compiled body' }]);
  });

  it('stores ownerNodeInstance in dialog state when opened directly via surfaceRuntime.open', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const surfaceRuntime = runtime.createSurfaceRuntime();
    const ownerNodeInstance = {
      cid: 12,
      templateNode: {
        templateNodeId: 12,
        id: 'dialog-owner',
        type: 'button',
        schema: { type: 'button' },
        templatePath: 'page.body.0',
        rendererType: 'button',
        propsProgram: {},
        metaProgram: {},
        eventPlans: {},
        regions: {},
        scopePlan: { kind: 'inherit' },
      },
      scope: page.scope,
      state: {
        metaState: {},
        mounted: true,
      },
    } as any;

    surfaceRuntime.open({
      kind: 'dialog',
      surface: {
        title: { type: 'text', text: 'Compiled title' },
        body: [{ type: 'text', text: 'Compiled body' }],
      },
      scope: page.scope,
      runtime,
      options: {
        ownerNodeInstance,
      },
    });

    const dialogState = surfaceRuntime.store.getState().entries[0] as any;
    expect(dialogState.ownerNode).toBeUndefined();
    expect(dialogState.ownerNodeInstance).toBe(ownerNodeInstance);
    expect(dialogState.title).toEqual({ type: 'text', text: 'Compiled title' });
    expect(dialogState.body).toEqual([{ type: 'text', text: 'Compiled body' }]);
  });

  it('evaluates expressions against child row scopes', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });
    const rowScope = runtime.createChildScope(page.scope, {
      record: { name: 'Bob' },
      index: 1,
    });

    expect(runtime.evaluate('User: ${record.name}', rowScope)).toBe('User: Bob');
  });

  it('resolves lexical scope paths through scope.get', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ rootValue: 'page' });
    const child = runtime.createChildScope(page.scope, { record: { name: 'Alice' } });

    expect(child.get('record.name')).toBe('Alice');
    expect(child.get('rootValue')).toBe('page');
    expect(child.has('record.name')).toBe(true);
    expect(child.has('missing')).toBe(false);
  });

  it('supports unified visible and disabled meta fields', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const compiled = runtime.compile({
      type: 'text',
      text: 'Status',
      visible: '${canView}',
      disabled: '${isLocked}',
    });
    const page = runtime.createPageRuntime({ canView: true, isLocked: true });
    const templateNode = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    const meta = runtime.resolveNodeMeta(templateNode, page.scope);

    expect(meta.visible).toBe(true);
    expect(meta.hidden).toBe(false);
    expect(meta.disabled).toBe(true);
  });

  it('closes the nearest dialog by default', async () => {
    const registry = createRendererRegistry([textRenderer]);
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

  it('opens and closes drawers through openDrawer actions', async () => {
    const registry = createRendererRegistry([textRenderer]);
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
    const registry = createRendererRegistry([textRenderer]);
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
    const registry = createRendererRegistry([textRenderer]);
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
    const registry = createRendererRegistry([textRenderer]);
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
