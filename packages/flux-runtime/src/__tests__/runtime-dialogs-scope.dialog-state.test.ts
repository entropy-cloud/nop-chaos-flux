import { describe, expect, it } from 'vitest';
import { createRendererRegistry, type RendererDefinition } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, pageRenderer, env } from './test-fixtures.js';

describe('createRendererRuntime - dialog state', () => {
  it('stores schema-based dialog title and body as raw schema when opening dialogs', async () => {
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
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
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

  it('keeps action-opened surface validation owners active even without a compiled validation plan', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
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
          title: 'Plain dialog',
          body: [{ type: 'text', text: 'No validation fields' }],
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
    await expect(dialogState.validationOwner?.validateAll('submit')).resolves.toMatchObject({ ok: true });
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
      registry: createRendererRegistry([pageRenderer, textRenderer]),
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
});
