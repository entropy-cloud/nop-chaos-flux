import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry, createRendererRuntime } from '../index';
import { textRenderer, pageRenderer, env } from './test-fixtures';

describe('createRendererRuntime', () => {
  it('opens and closes dialogs through dialog actions', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ message: 'Hello' });

    const openResult = await runtime.dispatch(
      {
        action: 'dialog',
        dialog: {
          title: 'Runtime dialog',
      body: [{ type: 'text', text: '${message}' }]
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(openResult.ok, String(openResult.error)).toBe(true);
    expect(page.surfaceStore.getState().dialogs).toHaveLength(1);
    const dialogState = page.surfaceStore.getState().dialogs[0];
    expect(dialogState.dialog.title).toBe('Runtime dialog');
    expect(dialogState.body).toBeTruthy();
    expect(dialogState.scope.get('dialogId')).toBe(dialogState.id);

    const closeResult = await runtime.dispatch(
      {
        action: 'closeDialog'
      },
      {
        runtime,
        scope: dialogState.scope,
        page,
        dialogId: dialogState.id
      }
    );

    expect(closeResult.ok).toBe(true);
    expect(page.surfaceStore.getState().dialogs).toHaveLength(0);
  });

  it('stores schema-based dialog title and body as raw schema when opening dialogs', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    await runtime.dispatch(
      {
        action: 'dialog',
        dialog: {
          title: { type: 'text', text: 'Compiled title' },
          body: [{ type: 'text', text: 'Compiled body' }]
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    const dialogState = page.surfaceStore.getState().dialogs[0] as any;
    expect(dialogState.title).toEqual({ type: 'text', text: 'Compiled title' });
    expect(Array.isArray(dialogState.body)).toBe(true);
    expect(dialogState.body[0]).toEqual({ type: 'text', text: 'Compiled body' });
  });

  it('stores ownerNodeInstance in dialog state when opened from a trigger node', async () => {
    const buttonRenderer: RendererDefinition = {
      type: 'button',
      component: () => null
    };
    const registry = createRendererRegistry([pageRenderer, textRenderer, buttonRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const pageCompiled = runtime.compile({
      type: 'page',
      body: [
        {
          type: 'button',
          label: 'Open dialog'
        }
      ]
    });
    const page = runtime.createPageRuntime({});
    const pageRoot = Array.isArray(pageCompiled.root) ? pageCompiled.root[0] : pageCompiled.root;
    const bodyRegion = pageRoot.regions['body'];
    const triggerTemplateNode = bodyRegion
      ? (Array.isArray(bodyRegion.node) ? bodyRegion.node[0] : bodyRegion.node)
      : undefined;
    const triggerNodeInstance = triggerTemplateNode
      ? {
          cid: triggerTemplateNode.templateNodeId,
          templateNode: triggerTemplateNode,
          scope: page.scope,
          state: { metaState: {}, mounted: true }
        } as any
      : undefined;

    await runtime.dispatch(
      {
        action: 'dialog',
        dialog: {
          title: { type: 'text', text: 'Compiled title' },
          body: [{ type: 'text', text: 'Compiled body' }]
        }
      },
      {
        runtime,
        scope: page.scope,
        page,
        nodeInstance: triggerNodeInstance
      }
    );

    const dialogState = page.surfaceStore.getState().dialogs[0] as any;
    expect(dialogState.ownerNodeInstance).toBe(triggerNodeInstance);
    expect(dialogState.title).toEqual({ type: 'text', text: 'Compiled title' });
    expect(dialogState.body).toEqual([{ type: 'text', text: 'Compiled body' }]);
  });

  it('stores ownerNodeInstance in dialog state when opened directly via page.openDialog', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
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
        scopePlan: { kind: 'inherit' }
      },
      scope: page.scope,
      state: {
        metaState: {},
        mounted: true
      }
    } as any;

    page.openDialog(
      {
        title: { type: 'text', text: 'Compiled title' },
        body: [{ type: 'text', text: 'Compiled body' }]
      },
      page.scope,
      runtime,
      {
        ownerNodeInstance
      }
    );

    const dialogState = page.surfaceStore.getState().dialogs[0] as any;
    expect(dialogState.ownerNode).toBeUndefined();
    expect(dialogState.ownerNodeInstance).toBe(ownerNodeInstance);
    expect(dialogState.title).toEqual({ type: 'text', text: 'Compiled title' });
    expect(dialogState.body).toEqual([{ type: 'text', text: 'Compiled body' }]);
  });

  it('evaluates expressions against child row scopes', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });
    const rowScope = runtime.createChildScope(page.scope, {
      record: { name: 'Bob' },
      index: 1
    });

    expect(runtime.evaluate('User: ${record.name}', rowScope)).toBe('User: Bob');
  });

  it('resolves lexical scope paths through scope.get', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
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
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const compiled = runtime.compile({
      type: 'text',
      text: 'Status',
      visible: '${canView}',
      disabled: '${isLocked}'
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
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    await runtime.dispatch(
      {
        action: 'dialog',
        dialog: {
          title: 'First',
          body: [{ type: 'text', text: 'First body' }]
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    await runtime.dispatch(
      {
        action: 'dialog',
        dialog: {
          title: 'Second',
          body: [{ type: 'text', text: 'Second body' }]
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    const dialogs = page.surfaceStore.getState().dialogs;
    expect(dialogs).toHaveLength(2);

    const closeResult = await runtime.dispatch(
      {
        action: 'closeDialog'
      },
      {
        runtime,
        scope: dialogs[1].scope,
        page,
        dialogId: dialogs[1].id
      }
    );

    expect(closeResult.ok).toBe(true);
    expect(page.surfaceStore.getState().dialogs).toHaveLength(1);
    expect(page.surfaceStore.getState().dialogs[0].id).toBe(dialogs[0].id);
  });

  it('opens and closes drawers through drawer actions', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    runtime.compile({ type: 'text', text: 'trigger' });
    const page = runtime.createPageRuntime({});

    const openResult = await runtime.dispatch(
      {
        action: 'openDrawer',
        drawer: {
          title: 'Runtime drawer',
          body: [{ type: 'text', text: 'Drawer body' }],
          statusPath: 'drawerStatus'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(openResult.ok).toBe(true);
    expect(page.surfaceStore.getState().surfaces).toHaveLength(1);
    expect(page.surfaceStore.getState().surfaces[0].kind).toBe('drawer');
    expect(page.scope.get('drawerStatus')).toEqual({
      id: page.surfaceStore.getState().surfaces[0].id,
      kind: 'drawer',
      open: true,
      active: true,
      opening: false,
      closing: false,
    });

    const closeResult = await runtime.dispatch(
      {
        action: 'closeDrawer'
      },
      {
        runtime,
        scope: page.surfaceStore.getState().surfaces[0].scope,
        page,
        dialogId: page.surfaceStore.getState().surfaces[0].id
      }
    );

    expect(closeResult.ok).toBe(true);
    expect(page.surfaceStore.getState().surfaces).toHaveLength(0);
  });
});
