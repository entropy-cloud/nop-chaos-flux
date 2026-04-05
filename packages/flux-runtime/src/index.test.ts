import { describe, expect, it, vi } from 'vitest';
import {
  getCompiledValidationDependents,
  getCompiledValidationField,
  getCompiledValidationNode,
  getCompiledValidationNodeMap,
  getCompiledValidationRootPath,
  getCompiledValidationTraversalOrder,
  hasCompiledValidationNodes,
  buildCompiledValidationDependentMap,
  buildCompiledValidationOrder,
  buildCompiledFormValidationModel,
  type ActionSchema,
  type ApiObject,
  type ApiRequestContext,
  type CompiledFormValidationModel,
  type RendererDefinition,
  type RendererEnv,
  type RendererPlugin
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { setIn } from '@nop-chaos/flux-core';
import {
  createActionScope,
  createComponentHandleRegistry,
  createFormComponentHandle,
  createRendererRegistry,
  createRendererRuntime,
  createSchemaCompiler
} from './index';

function compiledRule(rule: any, path: string, index = 0) {
  return {
    id: `${path}#${index}:${rule.kind}`,
    rule,
    dependencyPaths:
      rule.kind === 'equalsField' ||
      rule.kind === 'notEqualsField' ||
      rule.kind === 'requiredWhen' ||
      rule.kind === 'requiredUnless'
        ? [rule.path]
        : []
  };
}

const textRenderer: RendererDefinition = {
  type: 'text',
  component: () => null
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: () => null,
  regions: ['body']
};

const cardRenderer: RendererDefinition = {
  type: 'card',
  component: () => null,
  fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }, { key: 'body', kind: 'region', regionKey: 'body' }]
};

const actionButtonRenderer: RendererDefinition = {
  type: 'action-button',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }]
};

const importHostRenderer: RendererDefinition = {
  type: 'import-host',
  component: () => null
};

const formRenderer: RendererDefinition = {
  type: 'form',
  component: () => null,
  regions: ['body', 'actions'],
  scopePolicy: 'form',
  validation: {
    kind: 'container'
  }
};

const inputRenderer: RendererDefinition = {
  type: 'input-text',
  component: () => null,
  validation: {
    kind: 'field',
    getFieldPath(schema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    }
  }
};

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined
};

describe('createSchemaCompiler', () => {
  it('compiles regions and dynamic props', () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile({
      type: 'page',
      body: [{ type: 'text', text: '${message}' }]
    });

    expect(Array.isArray(node)).toBe(false);
    expect((node as any).regions.body.node).toBeTruthy();
  });

  it('treats value-or-region fields as plain props when given plain values', () => {
    const registry = createRendererRegistry([cardRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile({
      type: 'card',
      title: 'Profile',
      body: [{ type: 'text', text: 'body' }]
    }) as any;

    expect(node.regions.title).toBeUndefined();
    expect(node.props.kind).toBe('static');
    expect(node.props.value.title).toBe('Profile');
  });

  it('treats value-or-region fields as compiled regions when given schema input', () => {
    const registry = createRendererRegistry([cardRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile(
      {
        type: 'card',
        title: { type: 'text', text: 'Profile' },
        body: [{ type: 'text', text: 'body' }]
      } as any
    ) as any;

    expect(node.regions.title.node).toBeTruthy();
    expect(node.props.kind).toBe('static');
    expect(node.props.value.title).toBeUndefined();
  });

  it('lets field metadata override default meta handling for title', () => {
    const registry = createRendererRegistry([cardRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = runtime.compile({
      type: 'card',
      title: 'Profile'
    }) as any;
    const page = runtime.createPageRuntime({});
    const meta = runtime.resolveNodeMeta(node, page.scope, node.createRuntimeState());

    expect(meta.title).toBeUndefined();
    expect(node.props.value.title).toBe('Profile');
  });

  it('tracks event fields separately from normal props and regions', () => {
    const registry = createRendererRegistry([actionButtonRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile({
      type: 'action-button',
      onClick: {
        action: 'setValue',
        componentPath: 'message',
        value: 'clicked'
      }
    }) as any;

    expect(node.eventKeys).toEqual(['onClick']);
    expect(node.regions.onClick).toBeUndefined();
    expect(node.props.value.onClick).toBeUndefined();
    expect(node.eventActions.onClick).toMatchObject({ action: 'setValue' });
  });

  it('pre-resolves component targets to _targetCid during compile', () => {
    const registry = createRendererRegistry([pageRenderer, formRenderer, actionButtonRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile({
      type: 'page',
      body: [
        { type: 'form', id: 'user-form', name: 'userForm' },
        {
          type: 'action-button',
          onClick: {
            action: 'component:validate',
            componentName: 'userForm'
          }
        }
      ]
    }) as any;

    const bodyNodes = Array.isArray(node.regions.body.node) ? node.regions.body.node : [node.regions.body.node];
    const formNode = bodyNodes[0];
    const buttonNode = bodyNodes[1];
    expect(typeof formNode.schema._cid).toBe('number');
    expect(buttonNode.eventActions.onClick._targetCid).toBe(formNode.schema._cid);
  });

  it('preserves xui:imports on compiled schema for runtime registration', () => {
    const registry = createRendererRegistry([importHostRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile({
      type: 'import-host',
      'xui:imports': [
        {
          from: 'demo-lib',
          as: 'demo'
        }
      ]
    }) as any;

    expect(node.schema['xui:imports']).toEqual([{ from: 'demo-lib', as: 'demo' }]);
  });

  it('extracts table operation buttons into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null
    };
    const buttonRenderer: RendererDefinition = {
      type: 'button',
      component: () => null
    };
    const registry = createRendererRegistry([tableRenderer, buttonRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile({
      type: 'table',
      columns: [
        {
          type: 'operation',
          label: 'Actions',
          buttons: [{ type: 'button', label: 'Inspect' }]
        }
      ]
    }) as any;

    expect(node.regions['columns.0.buttons']?.node).toBeTruthy();
    expect(node.props.value.columns[0].buttons).toBeUndefined();
    expect(node.props.value.columns[0].buttonsRegionKey).toBe('columns.0.buttons');
  });

  it('extracts table column label fragments into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null
    };
    const textRenderer: RendererDefinition = {
      type: 'text',
      component: () => null
    };
    const registry = createRendererRegistry([tableRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile({
      type: 'table',
      columns: [
        {
          label: { type: 'text', text: 'Member header' },
          name: 'name'
        }
      ]
    }) as any;

    expect(node.regions['columns.0.label']?.node).toBeTruthy();
    expect(node.props.value.columns[0].label).toBeUndefined();
    expect(node.props.value.columns[0].labelRegionKey).toBe('columns.0.label');
  });

  it('extracts table column cell fragments into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null
    };
    const textRenderer: RendererDefinition = {
      type: 'text',
      component: () => null
    };
    const registry = createRendererRegistry([tableRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = compiler.compile({
      type: 'table',
      columns: [
        {
          label: 'Member',
          name: 'name',
          cell: { type: 'text', text: 'User ${record.name}' }
        }
      ]
    }) as any;

    expect(node.regions['columns.0.cell']?.node).toBeTruthy();
    expect(node.props.value.columns[0].cell).toBeUndefined();
    expect(node.props.value.columns[0].cellRegionKey).toBe('columns.0.cell');
  });

  it('treats table empty as a plain prop or compiled region based on field metadata', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      fields: [{ key: 'empty', kind: 'value-or-region', regionKey: 'empty' }]
    };
    const textRenderer: RendererDefinition = {
      type: 'text',
      component: () => null
    };
    const registry = createRendererRegistry([tableRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const plainNode = compiler.compile({
      type: 'table',
      empty: 'Nothing here'
    }) as any;
    const regionNode = compiler.compile({
      type: 'table',
      empty: { type: 'text', text: 'No rows' }
    }) as any;

    expect(plainNode.props.value.empty).toBe('Nothing here');
    expect(plainNode.regions.empty).toBeUndefined();
    expect(regionNode.props.value.empty).toBeUndefined();
    expect(regionNode.regions.empty?.node).toBeTruthy();
  });
});

describe('createRendererRuntime', () => {
  it('preserves arrays when writing nested numeric paths', () => {
    const result = setIn({ reviewers: [] }, 'reviewers.0.value', 'alice');

    expect(Array.isArray(result.reviewers)).toBe(true);
    expect(result.reviewers[0]).toMatchObject({ value: 'alice' });
  });

  it('reuses resolved props references when values stay unchanged', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = runtime.compile({
      type: 'text',
      text: '${message}'
    }) as any;

    const page = runtime.createPageRuntime({ message: 'Hello' });
    const state = node.createRuntimeState();
    const first = runtime.resolveNodeProps(node, page.scope, state);
    const second = runtime.resolveNodeProps(node, page.scope, state);

    expect(first.value).toBe(second.value);
    expect(second.reusedReference).toBe(true);
  });

  it('records changed-path dependencies for node props and meta', () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = runtime.compile({
      type: 'text',
      text: '${user.name}',
      visible: '${showText}'
    }) as any;

    const page = runtime.createPageRuntime({ user: { name: 'Alice' }, showText: true });
    const state = node.createRuntimeState();

    runtime.resolveNodeMeta(node, page.scope, state);
    runtime.resolveNodeProps(node, page.scope, state);

    expect(state.metaDependencies).toEqual({
      paths: ['showText'],
      wildcard: false,
      broadAccess: false
    });
    expect(state.propsDependencies).toEqual({
      paths: ['user', 'user.name'],
      wildcard: false,
      broadAccess: false
    });
  });

  it('updates page scope through setValue action', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const page = runtime.createPageRuntime({ message: 'Hello' });

    await runtime.dispatch(
      {
        action: 'setValue',
        componentPath: 'message',
        value: 'World'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(page.store.getState().data.message).toBe('World');
  });

  it('runs plugins by ascending priority and preserves declaration order on ties', () => {
    const order: string[] = [];
    const plugins: RendererPlugin[] = [
      {
        name: 'late',
        priority: 20,
        beforeCompile(schema) {
          order.push('late');
          return schema;
        }
      },
      {
        name: 'first-tie',
        priority: 5,
        beforeCompile(schema) {
          order.push('first-tie');
          return schema;
        }
      },
      {
        name: 'second-tie',
        priority: 5,
        beforeCompile(schema) {
          order.push('second-tie');
          return schema;
        }
      }
    ];

    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      plugins
    });

    runtime.compile({ type: 'text', text: 'hello' });

    expect(order).toEqual(['first-tie', 'second-tie', 'late']);
    expect(runtime.plugins.map((plugin) => plugin.name)).toEqual(['first-tie', 'second-tie', 'late']);
  });

  it('updates multiple page scope values through setValues action', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const page = runtime.createPageRuntime({ message: 'Hello', status: 'idle' });

    const result = await runtime.dispatch(
      {
        action: 'setValues',
        values: {
          message: 'World',
          status: 'done'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result).toMatchObject({
      ok: true,
      data: {
        message: 'World',
        status: 'done'
      }
    });
    expect(page.store.getState().data).toMatchObject({ message: 'World', status: 'done' });
  });

  it('dispatches component:<method> to explicit form handles by id and name', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const form = runtime.createFormRuntime({
      id: 'user-form',
      name: 'userForm',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });

    const unregister = componentRegistry.register(createFormComponentHandle(form));

    try {
      const setValueResult = await runtime.dispatch(
        {
          action: 'component:setValue',
          componentId: 'user-form',
          args: {
            name: 'username',
            value: 'Bob'
          }
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry
        }
      );

      expect(setValueResult).toMatchObject({ ok: true, data: 'Bob' });
      expect(form.scope.get('username')).toBe('Bob');

      const validateResult = await runtime.dispatch(
        {
          action: 'component:validate',
          componentName: 'userForm'
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry
        }
      );

      expect(validateResult.ok).toBe(true);
      expect((validateResult.data as { ok: boolean }).ok).toBe(true);
    } finally {
      unregister();
    }
  });

  it('fails component action when componentId and componentName target different handles', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const firstForm = runtime.createFormRuntime({
      id: 'first-form',
      name: 'firstForm',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });
    const secondForm = runtime.createFormRuntime({
      id: 'second-form',
      name: 'secondForm',
      initialValues: { username: 'Bob' },
      parentScope: page.scope,
      page
    });

    const unregisterFirst = componentRegistry.register(createFormComponentHandle(firstForm));
    const unregisterSecond = componentRegistry.register(createFormComponentHandle(secondForm));

    try {
      const result = await runtime.dispatch(
        {
          action: 'component:validate',
          componentId: 'first-form',
          componentName: 'secondForm'
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry
        }
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe('Component handle not found');
    } finally {
      unregisterSecond();
      unregisterFirst();
    }
  });

  it('dispatches component action by compiled _targetCid without componentId/componentName', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const form = runtime.createFormRuntime({
      id: 'compiled-cid-form',
      name: 'compiledCidForm',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });
    const handle = createFormComponentHandle(form);
    const unregister = componentRegistry.register(handle, { cid: 42 });

    try {
      const result = await runtime.dispatch(
        {
          action: 'component:setValue',
          _targetCid: 42,
          args: {
            name: 'username',
            value: 'Carol'
          }
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry
        }
      );

      expect(result).toMatchObject({ ok: true, data: 'Carol' });
      expect(form.scope.get('username')).toBe('Carol');
    } finally {
      unregister();
    }
  });

  it('dispatches component action by dynamic _targetTemplateId and instance key', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const form = runtime.createFormRuntime({
      id: 'dynamic-form',
      name: 'dynamicForm',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });
    const handle = createFormComponentHandle(form);
    const unregister = componentRegistry.register(handle, {
      templateId: 'table.row.rowForm',
      instanceKey: 'row:1'
    });

    try {
      const result = await runtime.dispatch(
        {
          action: 'component:setValue',
          _targetTemplateId: 'table.row.rowForm',
          args: {
            name: 'username',
            value: 'Dave'
          }
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry,
          getInstanceKey: () => 'row:1'
        }
      );

      expect(result).toMatchObject({ ok: true, data: 'Dave' });
      expect(form.scope.get('username')).toBe('Dave');
    } finally {
      unregister();
    }
  });

  it('rejects component action without any resolvable target', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      {
        action: 'component:validate'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe(
      'component:<method> requires _targetCid, _targetTemplateId, componentId or componentName'
    );
  });

  it('supports cleanupDynamic and mounted-state aware resolve behavior', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const form = runtime.createFormRuntime({
      id: 'dynamic-cleanup-form',
      name: 'dynamicCleanupForm',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });
    const handle = createFormComponentHandle(form);
    const unregister = componentRegistry.register(handle, {
      templateId: 'table.row.cleanup',
      instanceKey: 'row:2'
    });

    try {
      const beforeCleanup = await runtime.dispatch(
        {
          action: 'component:validate',
          _targetTemplateId: 'table.row.cleanup'
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry,
          getInstanceKey: () => 'row:2'
        }
      );
      expect(beforeCleanup.ok).toBe(true);

      componentRegistry.cleanupDynamic('table.row.cleanup');

      const afterCleanup = await runtime.dispatch(
        {
          action: 'component:validate',
          _targetTemplateId: 'table.row.cleanup'
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry,
          getInstanceKey: () => 'row:2'
        }
      );
      expect(afterCleanup.ok).toBe(false);
      expect((afterCleanup.error as Error).message).toBe('Component handle not found');
      expect(handle._mounted).toBe(false);
    } finally {
      unregister();
    }
  });

  it('exposes component registry debug helpers through the public contract', () => {
    const componentRegistry = createComponentHandleRegistry({ id: 'debug-components' });
    const handle = {
      id: 'debug-form',
      name: 'debugForm',
      type: 'form',
      capabilities: {
        invoke: vi.fn()
      }
    };

    const unregister = componentRegistry.register(handle, { cid: 88 });

    expect(componentRegistry.getHandleByCid?.(88)).toBe(handle);
    expect(componentRegistry.getDebugSnapshot?.()).toEqual({
      handles: [
        expect.objectContaining({
          cid: 88,
          id: 'debug-form',
          name: 'debugForm',
          type: 'form',
          mounted: true
        })
      ]
    });

    unregister();
    expect(componentRegistry.getHandleByCid?.(88)).toBeUndefined();
  });

  it('resolves namespaced actions through parent action scopes', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const parentActionScope = createActionScope({ id: 'parent-scope' });
    const childActionScope = createActionScope({ id: 'child-scope', parent: parentActionScope });
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: { exported: true } });
    parentActionScope.registerNamespace('designer', {
      kind: 'host',
      invoke
    });

    const result = await runtime.dispatch(
      {
        action: 'designer:export',
        args: {
          source: 'toolbar'
        }
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope: childActionScope
      }
    );

    expect(result).toMatchObject({ ok: true, data: { exported: true } });
    expect(invoke).toHaveBeenCalledWith('export', { source: 'toolbar' }, expect.objectContaining({ actionScope: childActionScope }));
  });

  it('exposes action scope debug snapshots through the public contract', () => {
    const parentActionScope = createActionScope({ id: 'parent-debug-scope' });
    const childActionScope = createActionScope({ id: 'child-debug-scope', parent: parentActionScope });

    childActionScope.registerNamespace('designer', {
      kind: 'host',
      invoke: vi.fn(),
      listMethods: () => ['export', 'save']
    });

    expect(childActionScope.getDebugSnapshot?.()).toEqual({
      id: 'child-debug-scope',
      parentId: 'parent-debug-scope',
      namespaces: [
        {
          namespace: 'designer',
          providerKind: 'host',
          methods: ['export', 'save']
        }
      ]
    });
  });

  it('treats top-level action fields as payload when args is omitted', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ baseX: 160 });
    const actionScope = createActionScope({ id: 'designer-scope' });
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: { id: 'node-1' } });
    actionScope.registerNamespace('designer', {
      kind: 'host',
      invoke
    });

    const result = await runtime.dispatch(
      {
        action: 'designer:addNode',
        nodeType: 'task',
        position: {
          x: '${baseX}',
          y: 120
        }
      } as any,
      {
        runtime,
        scope: page.scope,
        page,
        actionScope
      }
    );

    expect(result).toMatchObject({ ok: true, data: { id: 'node-1' } });
    expect(invoke).toHaveBeenCalledWith(
      'addNode',
      {
        nodeType: 'task',
        position: {
          x: 160,
          y: 120
        }
      },
      expect.objectContaining({ actionScope })
    );
  });

  it('dedupes imported namespace registration per scope and disposes on final release', async () => {
    const dispose = vi.fn();
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => ({
        createNamespace: () => ({
          kind: 'import' as const,
          dispose,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
            ok: true,
            data: `${spec.from}:${method}:${String(payload?.value ?? '')}`
          })
        })
      }))
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'import-scope' });
    const imports = [{ from: 'demo-lib', as: 'demo' }] as const;

    await runtime.ensureImportedNamespaces({
      imports,
      actionScope,
      scope: page.scope
    });
    await runtime.ensureImportedNamespaces({
      imports,
      actionScope,
      scope: page.scope
    });

    expect(importLoader.load).toHaveBeenCalledTimes(1);

    const firstResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'live' }
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope
      }
    );

    expect(firstResult).toMatchObject({ ok: true, data: 'demo-lib:ping:live' });

    runtime.releaseImportedNamespaces({ imports, actionScope });
    await Promise.resolve();

    expect(dispose).not.toHaveBeenCalled();

    const secondResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'still-live' }
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope
      }
    );

    expect(secondResult).toMatchObject({ ok: true, data: 'demo-lib:ping:still-live' });

    runtime.releaseImportedNamespaces({ imports, actionScope });
    await Promise.resolve();

    expect(dispose).toHaveBeenCalledTimes(1);

    const releasedResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'released' }
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope
      }
    );

    expect(releasedResult.ok).toBe(false);
    expect(String(releasedResult.error)).toContain('Unsupported action: demo:ping');
  });

  it('allows child import scopes to shadow parent imports and restores parent after release', async () => {
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
            ok: true,
            data: `${spec.from}:${method}:${String(payload?.value ?? '')}`
          })
        })
      }))
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const parentActionScope = runtime.createActionScope({ id: 'parent-import-scope' });
    const childActionScope = runtime.createActionScope({ id: 'child-import-scope', parent: parentActionScope });

    await runtime.ensureImportedNamespaces({
      imports: [{ from: 'parent-lib', as: 'demo' }],
      actionScope: parentActionScope,
      scope: page.scope
    });
    await runtime.ensureImportedNamespaces({
      imports: [{ from: 'child-lib', as: 'demo' }],
      actionScope: childActionScope,
      scope: page.scope
    });

    const shadowedResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'child' }
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope: childActionScope
      }
    );

    expect(shadowedResult).toMatchObject({ ok: true, data: 'child-lib:ping:child' });

    runtime.releaseImportedNamespaces({
      imports: [{ from: 'child-lib', as: 'demo' }],
      actionScope: childActionScope
    });
    await Promise.resolve();

    const restoredResult = await runtime.dispatch(
      {
        action: 'demo:ping',
        args: { value: 'parent' }
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope: childActionScope
      }
    );

    expect(restoredResult).toMatchObject({ ok: true, data: 'parent-lib:ping:parent' });
  });

  it('rejects colliding import aliases within the same action scope', async () => {
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({ ok: true })
        })
      }))
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'collision-scope' });

    await runtime.ensureImportedNamespaces({
      imports: [{ from: 'first-lib', as: 'demo' }],
      actionScope,
      scope: page.scope
    });

    await expect(
      runtime.ensureImportedNamespaces({
        imports: [{ from: 'second-lib', as: 'demo' }],
        actionScope,
        scope: page.scope
      })
    ).rejects.toThrow('Namespace collision for import alias: demo');
  });

  it('retries a failed import within the same action scope when loader behavior changes', async () => {
    let shouldFail = true;
    const importLoader = {
      load: vi.fn(async (spec: { from: string; as: string }) => {
        if (shouldFail) {
          throw new Error('loader exploded');
        }

        return {
          createNamespace: () => ({
            kind: 'import' as const,
            invoke: async (method: string, payload: Record<string, unknown> | undefined) => ({
              ok: true,
              data: `${spec.from}:${method}:${String(payload?.value ?? '')}`
            })
          })
        };
      })
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        importLoader
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const actionScope = runtime.createActionScope({ id: 'retry-import-scope' });
    const imports = [{ from: 'retry-lib', as: 'retry' }] as const;

    await expect(
      runtime.ensureImportedNamespaces({
        imports,
        actionScope,
        scope: page.scope
      })
    ).rejects.toThrow('Imported namespace retry failed to load: loader exploded');

    shouldFail = false;

    await expect(
      runtime.ensureImportedNamespaces({
        imports,
        actionScope,
        scope: page.scope
      })
    ).resolves.toBeUndefined();

    const result = await runtime.dispatch(
      {
        action: 'retry:ping',
        args: { value: 'ok' }
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope
      }
    );

    expect(importLoader.load).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, data: 'retry-lib:ping:ok' });
  });

  it('registers data sources in a scope-local runtime registry and replaces same-id entries', async () => {
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(api: ApiObject) => ({
      ok: true,
      status: 200,
      data: { value: api.url } as T
    });
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const first = runtime.registerDataSource({
      id: 'users',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/first' },
        dataPath: 'payload'
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: '/api/first' });
    });

    const second = runtime.registerDataSource({
      id: 'users',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/second' },
        dataPath: 'payload'
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: '/api/second' });
    });

    expect(fetcher).toHaveBeenCalledTimes(2);

    first.dispose();
    second.dispose();
  });

  it('disposes registered data sources and aborts their active requests', async () => {
    let capturedSignal: AbortSignal | undefined;
    let releaseRequest: (() => void) | undefined;
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(_api: ApiObject, ctx: { signal?: AbortSignal }) => {
      capturedSignal = ctx.signal;
      await new Promise<void>((resolve) => {
        releaseRequest = resolve;
      });

      if (ctx.signal?.aborted) {
        const error = new Error('aborted');
        (error as Error & { name: string }).name = 'AbortError';
        throw error;
      }

      return {
        ok: true,
        status: 200,
        data: { ok: true } as T
      };
    };
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'slow-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/slow' },
        dataPath: 'payload'
      }
    });

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    registration.dispose();

    expect(capturedSignal?.aborted).toBe(true);
    releaseRequest?.();
  });

  it('exposes source state for api-backed sources across loading and success', async () => {
    let releaseRequest: ((value: { ok: boolean; status: number; data: { value: string } }) => void) | undefined;
    const fetcherImpl: RendererEnv['fetcher'] = async () => new Promise((resolve) => {
      releaseRequest = resolve as typeof releaseRequest;
    });
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'stateful-api-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/stateful' },
        dataPath: 'payload',
        initialData: { value: 'initial' }
      }
    });

    expect(registration.controller.getState()).toMatchObject({
      started: true,
      loading: true,
      stale: true,
      value: { value: 'initial' },
      error: undefined
    });

    releaseRequest?.({ ok: true, status: 200, data: { value: 'loaded' } });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ value: 'loaded' });
    });

    expect(registration.controller.getState()).toMatchObject({
      started: true,
      loading: false,
      stale: false,
      value: { value: 'loaded' },
      error: undefined
    });

    registration.dispose();
  });

  it('exposes source state for api-backed sources after request failure', async () => {
    const fetcherImpl: RendererEnv['fetcher'] = async () => {
      throw new Error('source failed');
    };
    const fetcher = vi.fn(fetcherImpl);
    const notify = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        notify,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'failing-api-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/fail' },
        dataPath: 'payload',
        initialData: { value: 'initial' }
      }
    });

    await vi.waitFor(() => {
      expect(notify).toHaveBeenCalledWith('error', 'source failed');
    });

    expect(registration.controller.getState()).toMatchObject({
      started: true,
      loading: false,
      stale: true,
      value: { value: 'initial' }
    });
    expect(registration.controller.getState().error).toBeInstanceOf(Error);

    registration.dispose();
  });

  it('registers formula data sources and refreshes derived values through runtime ownership', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ price: 3, qty: 4 });

    const registration = runtime.registerDataSource({
      id: 'total-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        dataPath: 'total',
        formula: '${(price || 0) * (qty || 0)}'
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(12);
    });

    page.scope.update('qty', 5);
    await registration.controller.refresh();

    expect(page.scope.get('total')).toBe(15);
    expect(registration.controller.getState()).toMatchObject({
      started: true,
      loading: false,
      stale: false,
      value: 15,
      error: undefined
    });

    registration.dispose();
  });

  it('refreshes registered data sources by id within an explicit scope', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3 });

    const registration = runtime.registerDataSource({
      id: 'scoped-total',
      scope: page.scope,
      schema: {
        type: 'data-source',
        dataPath: 'total',
        formula: '${(price || 0) * (qty || 0)}'
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(6);
    });

    page.scope.update('qty', 5);

    await expect(runtime.refreshDataSource({ id: 'scoped-total', scope: page.scope })).resolves.toBe(true);
    expect(page.scope.get('total')).toBe(10);

    registration.dispose();
  });

  it('auto-recomputes formula sources when dependent scope paths change', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3, note: 'ignore' });

    const registration = runtime.registerDataSource({
      id: 'auto-total',
      scope: page.scope,
      schema: {
        type: 'data-source',
        dataPath: 'total',
        formula: '${(price || 0) * (qty || 0)}'
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(6);
    });

    page.scope.update('note', 'still ignore');
    await Promise.resolve();
    expect(page.scope.get('total')).toBe(6);

    page.scope.update('qty', 4);

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(8);
    });

    registration.dispose();
  });

  it('auto-refreshes api sources when request dependencies change', async () => {
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(api: ApiObject) => ({
      ok: true,
      status: 200,
      data: { url: api.url } as T
    });
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ userId: 1, note: 'ignore' });

    const registration = runtime.registerDataSource({
      id: 'user-api-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        api: { url: '/api/users/${userId}' },
        dataPath: 'payload'
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/users/1' });
    });

    page.scope.update('note', 'still ignore');
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);

    page.scope.update('userId', 2);

    await vi.waitFor(() => {
      expect(page.scope.get('payload')).toEqual({ url: '/api/users/2' });
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    registration.dispose();
  });

  it('refreshes the matching source inside the provided scope when ids collide', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const firstScope = runtime.createChildScope(page.scope, { value: 1 }, { pathSuffix: 'first-source-scope' });
    const secondScope = runtime.createChildScope(page.scope, { value: 10 }, { pathSuffix: 'second-source-scope' });

    const first = runtime.registerDataSource({
      id: 'shared-source',
      scope: firstScope,
      schema: {
        type: 'data-source',
        dataPath: 'derived',
        formula: '${value}'
      }
    });
    const second = runtime.registerDataSource({
      id: 'shared-source',
      scope: secondScope,
      schema: {
        type: 'data-source',
        dataPath: 'derived',
        formula: '${value}'
      }
    });

    await vi.waitFor(() => {
      expect(firstScope.get('derived')).toBe(1);
      expect(secondScope.get('derived')).toBe(10);
    });

    secondScope.update('value', 11);

    await expect(runtime.refreshDataSource({ id: 'shared-source', scope: secondScope })).resolves.toBe(true);

    expect(firstScope.get('derived')).toBe(1);
    expect(secondScope.get('derived')).toBe(11);

    first.dispose();
    second.dispose();
  });

  it('returns false when refreshing an unknown data source id', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    await expect(runtime.refreshDataSource({ id: 'missing-source', scope: page.scope })).resolves.toBe(false);
  });

  it('replaces same-id reactions within the same scope through runtime registry ownership', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ count: 1 });
    const updates: string[] = [];

    const first = runtime.registerReaction({
      id: 'count-reaction',
      scope: page.scope,
      schema: {
        type: 'reaction',
        watch: '${count}',
        actions: {
          action: 'setValue',
          componentPath: 'message',
          value: 'first:${count}'
        }
      },
      dispatch: async (action, ctx) => {
        updates.push('first');
        return runtime.dispatch(action, {
          runtime,
          scope: ctx?.scope ?? page.scope,
          page
        });
      }
    });

    const second = runtime.registerReaction({
      id: 'count-reaction',
      scope: page.scope,
      schema: {
        type: 'reaction',
        watch: '${count}',
        actions: {
          action: 'setValue',
          componentPath: 'message',
          value: 'second:${count}'
        }
      },
      dispatch: async (action, ctx) => {
        updates.push('second');
        return runtime.dispatch(action, {
          runtime,
          scope: ctx?.scope ?? page.scope,
          page
        });
      }
    });

    page.scope.update('count', 2);

    await vi.waitFor(() => {
      expect(page.scope.get('message')).toBe('second:2');
    });

    expect(updates).toEqual(['second']);

    first.dispose();
    second.dispose();
  });

  it('exposes reaction debug snapshots through the public runtime contract', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ count: 1 });

    const registration = runtime.registerReaction({
      id: 'debug-reaction',
      scope: page.scope,
      schema: {
        type: 'reaction',
        watch: '${count}',
        immediate: true,
        actions: {
          action: 'setValue',
          componentPath: 'message',
          value: 'count:${count}'
        }
      },
      dispatch: (action, ctx) => runtime.dispatch(action, {
        runtime,
        scope: ctx?.scope ?? page.scope,
        page
      })
    });

    await vi.waitFor(() => {
      expect(page.scope.get('message')).toBe('count:1');
    });

    expect(runtime.getReactionDebugSnapshot?.()).toEqual({
      reactions: [
        expect.objectContaining({
          id: 'debug-reaction',
          scopeId: page.scope.id,
          immediate: true,
          fireCount: 1,
          disposed: false,
          dependencies: ['count']
        })
      ]
    });

    registration.dispose();
    expect(runtime.getReactionDebugSnapshot?.()).toEqual({ reactions: [] });
  });

  it('opens and closes dialogs through dialog actions', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const node = runtime.compile({ type: 'text', text: 'trigger' }) as any;
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
        page,
        node
      }
    );

    expect(openResult.ok).toBe(true);
    expect(page.store.getState().dialogs).toHaveLength(1);
    const dialogState = page.store.getState().dialogs[0];
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
        node,
        dialogId: dialogState.id
      }
    );

    expect(closeResult.ok).toBe(true);
    expect(page.store.getState().dialogs).toHaveLength(0);
  });

  it('compiles schema-based dialog title and body when opening dialogs', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const node = runtime.compile({ type: 'text', text: 'trigger' }) as any;
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
        page,
        node
      }
    );

    const dialogState = page.store.getState().dialogs[0] as any;
    expect(dialogState.title?.component).toBeTruthy();
    expect(Array.isArray(dialogState.body)).toBe(true);
    expect(dialogState.body[0]?.component).toBeTruthy();
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
    const node = runtime.compile({
      type: 'text',
      text: 'Status',
      visible: '${canView}',
      disabled: '${isLocked}'
    }) as any;
    const page = runtime.createPageRuntime({ canView: true, isLocked: true });

    const meta = runtime.resolveNodeMeta(node, page.scope, node.createRuntimeState());

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
    const node = runtime.compile({ type: 'text', text: 'trigger' }) as any;
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
        page,
        node
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
        page,
        node
      }
    );

    const dialogs = page.store.getState().dialogs;
    expect(dialogs).toHaveLength(2);

    const closeResult = await runtime.dispatch(
      {
        action: 'closeDialog'
      },
      {
        runtime,
        scope: dialogs[1].scope,
        page,
        node,
        dialogId: dialogs[1].id
      }
    );

    expect(closeResult.ok).toBe(true);
    expect(page.store.getState().dialogs).toHaveLength(1);
    expect(page.store.getState().dialogs[0].id).toBe(dialogs[0].id);
  });

  it('writes ajax response data into page state via dataPath', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => {
          return {
            ok: true,
            status: 200,
            data: {
              users: {
                list: [{ id: 1, name: 'Alice' }]
              }
            } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ filter: 'active' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/users',
          method: 'get'
        },
        dataPath: 'users.list'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(page.store.getState().data).toEqual({
      filter: 'active',
      users: {
        list: [{ id: 1, name: 'Alice' }]
      }
    });
  });

  it('applies requestAdaptor before fetcher and responseAdaptor after fetcher', async () => {
    const fetchCalls: ApiObject[] = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiObject) => {
          fetchCalls.push(api);
          return {
            ok: true,
            status: 200,
            data: {
              items: [{ id: 1, name: 'Alice' }],
              total: 1
            } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ token: 'secure-token' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/users',
          method: 'get',
          requestAdaptor: "return {headers: {Authorization: scope.token}, data: {query: scope.token}};",
          responseAdaptor: 'return {rows: payload.items, count: payload.total};'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toMatchObject({
      url: '/api/users',
      method: 'get',
      headers: {
        Authorization: 'secure-token'
      },
      data: {
        query: 'secure-token'
      }
    });
    expect(result).toMatchObject({
      ok: true,
      data: {
        rows: [{ id: 1, name: 'Alice' }],
        count: 1
      }
    });
  });

  it('evaluates declarative ajax api values before request execution convergence', async () => {
    const fetchCalls: ApiObject[] = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiObject) => {
          fetchCalls.push(api);
          return {
            ok: true,
            status: 200,
            data: { ok: true } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ userId: 7, token: 'page-token' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/users/${userId}',
          method: 'post',
          includeScope: ['token'],
          params: {
            mode: '${token}'
          },
          data: {
            userId: '${userId}'
          }
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toMatchObject({
      url: '/api/users/7?mode=page-token',
      method: 'post',
      data: {
        token: 'page-token',
        userId: 7
      }
    });
    expect(fetchCalls[0].params).toBeUndefined();
  });

  it('evaluates adaptor scope through lexical scope view without eager whole-scope reads', async () => {
    const fetchCalls: ApiObject[] = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiObject) => {
          fetchCalls.push(api);
          return {
            ok: true,
            status: 200,
            data: { ok: true } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ token: 'page-token' });
    const childScope = runtime.createChildScope(page.scope, { username: 'Alice' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/adaptor-check',
          method: 'post',
          requestAdaptor: 'return {headers: {Authorization: scope.token}, data: {username: scope.username}};'
        }
      },
      {
        runtime,
        scope: childScope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(fetchCalls[0]).toMatchObject({
      headers: {
        Authorization: 'page-token'
      },
      data: {
        username: 'Alice'
      }
    });
  });

  it('blocks form submit when async validation fails', async () => {
    const fetchCalls: ApiObject[] = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiObject) => {
          fetchCalls.push(api);

          if (api.url === '/api/validate-username') {
            return {
              ok: true,
              status: 200,
              data: {
                valid: false,
                message: 'Username already exists'
              } as T
            };
          }

          return {
            ok: true,
            status: 200,
            data: { ok: true } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'user-form',
      initialValues: {
        username: 'alice'
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        nodes: {
          username: {
            path: 'username',
            kind: 'field',
            controlType: 'input-text',
            label: 'Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule({
                kind: 'async',
                api: {
                  method: 'post',
                  url: '/api/validate-username',
                  requestAdaptor: 'return {data: {username: scope.username}};'
                },
                message: 'Username already exists'
              }, 'username')
            ],
            children: [],
            parent: ''
          }
        },
        order: ['username'],
        dependents: {}
      }
    });

    const result = await form.submit({
      method: 'post',
      url: '/api/users'
    });

    expect(result.ok).toBe(false);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe('/api/validate-username');
    expect(form.getError('username')?.[0]?.message).toBe('Username already exists');
  });

  it('tracks field-level validating state during async validation', async () => {
    let resolveValidation: ((value: any) => void) | undefined;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async () =>
          await new Promise((resolve) => {
            resolveValidation = resolve;
          })
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'user-form',
      initialValues: {
        username: 'alice'
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        nodes: {
          username: {
            path: 'username',
            kind: 'field',
            controlType: 'input-text',
            label: 'Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule({
                kind: 'async',
                api: {
                  method: 'post',
                  url: '/api/validate-username'
                }
              }, 'username')
            ],
            children: [],
            parent: ''
          }
        },
        order: ['username'],
        dependents: {}
      }
    });

    const validationPromise = form.validateField('username');

    await vi.waitFor(() => {
      expect(resolveValidation).toBeTypeOf('function');
    });

    expect(form.isValidating('username')).toBe(true);

    resolveValidation?.({
      ok: true,
      status: 200,
      data: { valid: true }
    });

    await expect(validationPromise).resolves.toMatchObject({ ok: true, errors: [] });
    expect(form.isValidating('username')).toBe(false);
  });

  it('ignores stale async validation results after field value changes', async () => {
    let resolveFirst: ((value: any) => void) | undefined;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async () =>
          await new Promise((resolve) => {
            resolveFirst = resolve;
          })
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'user-form',
      initialValues: {
        username: 'alice'
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        nodes: {
          username: {
            path: 'username',
            kind: 'field',
            controlType: 'input-text',
            label: 'Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule({
                kind: 'async',
                api: {
                  method: 'post',
                  url: '/api/validate-username'
                },
                message: 'Username already exists'
              }, 'username')
            ],
            children: [],
            parent: ''
          }
        },
        order: ['username'],
        dependents: {}
      }
    });

    const firstValidation = form.validateField('username');

    await vi.waitFor(() => {
      expect(resolveFirst).toBeTypeOf('function');
    });

    form.setValue('username', 'alice-2');

    resolveFirst?.({
      ok: true,
      status: 200,
      data: {
        valid: false,
        message: 'Username already exists'
      }
    });

    await expect(firstValidation).resolves.toMatchObject({ ok: true, errors: [] });
    expect(form.getError('username')).toBeUndefined();
    expect(form.isValidating('username')).toBe(false);
  });

  it('debounces async field validation and cancels superseded runs', async () => {
    vi.useFakeTimers();

    try {
      const fetcherMock = vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { valid: true }
      }));
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          fetcher: fetcherMock as RendererEnv['fetcher']
        },
        expressionCompiler: createExpressionCompiler(createFormulaCompiler())
      });
      const page = runtime.createPageRuntime({});
      const form = runtime.createFormRuntime({
        id: 'user-form',
        initialValues: {
          username: 'alice'
        },
        parentScope: page.scope,
        validation: {
          behavior: {
            triggers: ['blur'],
            showErrorOn: ['touched', 'submit']
          },
          nodes: {
            username: {
              path: 'username',
              kind: 'field',
              controlType: 'input-text',
              label: 'Username',
              behavior: {
                triggers: ['blur'],
                showErrorOn: ['touched', 'submit']
              },
              rules: [
                compiledRule({
                  kind: 'async',
                  debounce: 50,
                  api: {
                    method: 'post',
                    url: '/api/validate-username'
                  }
                }, 'username')
              ],
              children: [],
              parent: ''
            }
          },
          order: ['username'],
          dependents: {}
        }
      });

      const firstValidation = form.validateField('username');
      const secondValidation = form.validateField('username');

      await expect(firstValidation).resolves.toMatchObject({ ok: true, errors: [] });
      expect(fetcherMock).not.toHaveBeenCalled();
      expect(form.isValidating('username')).toBe(true);

      await vi.advanceTimersByTimeAsync(50);

      await expect(secondValidation).resolves.toMatchObject({ ok: true, errors: [] });
      expect(fetcherMock).toHaveBeenCalledTimes(1);
      expect(form.isValidating('username')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('tracks visited, touched, and dirty state through field interactions', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: {
        username: 'alice'
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        nodes: {
          username: {
            path: 'username',
            kind: 'field',
            controlType: 'input-text',
            label: 'Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [],
            children: [],
            parent: ''
          }
        },
        order: ['username'],
        dependents: {}
      }
    });

    expect(form.isVisited('username')).toBe(false);
    expect(form.isTouched('username')).toBe(false);
    expect(form.isDirty('username')).toBe(false);

    form.visitField('username');
    form.touchField('username');
    form.setValue('username', 'bob');

    expect(form.isVisited('username')).toBe(true);
    expect(form.isTouched('username')).toBe(true);
    expect(form.isDirty('username')).toBe(true);

    form.reset({ username: 'bob' });

    expect(form.isVisited('username')).toBe(false);
    expect(form.isTouched('username')).toBe(false);
    expect(form.isDirty('username')).toBe(false);
  });

  it('compiles field validation triggers with field override and form fallback', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const node = runtime.compile({
      type: 'form',
      validateOn: 'submit',
      body: [
        {
          type: 'input-text',
          name: 'username',
          label: 'Username',
          required: true,
          validateOn: ['blur', 'change']
        },
        {
          type: 'input-text',
          name: 'nickname',
          label: 'Nickname',
          required: true
        }
      ]
    }) as any;

    expect(node.validation.behavior.triggers).toEqual(['submit']);
    expect(node.validation.behavior.showErrorOn).toEqual(['touched', 'submit']);
    expect(node.validation.nodes.username.behavior.triggers).toEqual(['blur', 'change']);
    expect(node.validation.nodes.username.behavior.showErrorOn).toEqual(['touched', 'submit']);
    expect(node.validation.nodes.nickname.behavior.triggers).toEqual(['submit']);
    expect(node.validation.nodes.nickname.behavior.showErrorOn).toEqual(['touched', 'submit']);
  });

  it('compiles error visibility policy with field override and form fallback', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const node = runtime.compile({
      type: 'form',
      validateOn: 'submit',
      showErrorOn: 'submit',
      body: [
        {
          type: 'input-text',
          name: 'username',
          label: 'Username',
          required: true,
          showErrorOn: ['visited', 'dirty']
        },
        {
          type: 'input-text',
          name: 'nickname',
          label: 'Nickname',
          required: true
        }
      ]
    }) as any;

    expect(node.validation.behavior.showErrorOn).toEqual(['submit']);
    expect(node.validation.nodes.username.behavior.showErrorOn).toEqual(['visited', 'dirty']);
    expect(node.validation.nodes.nickname.behavior.showErrorOn).toEqual(['submit']);
  });

  it('reuses pooled validation behavior objects for equivalent field policies', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const node = runtime.compile({
      type: 'form',
      validateOn: 'submit',
      showErrorOn: ['touched', 'submit'],
      body: [
        {
          type: 'input-text',
          name: 'username',
          label: 'Username',
          required: true
        },
        {
          type: 'input-text',
          name: 'nickname',
          label: 'Nickname',
          required: true
        },
        {
          type: 'input-text',
          name: 'email',
          label: 'Email',
          required: true,
          validateOn: ['blur', 'change']
        }
      ]
    }) as any;

    expect(node.validation.nodes.username.behavior).toBe(node.validation.nodes.nickname.behavior);
    expect(node.validation.nodes.username.behavior).not.toBe(node.validation.nodes.email.behavior);
    expect(node.validation.nodes.username.behavior).toBe(node.validation.nodes.username.behavior);
  });

  it('compiles relational validation rules and dependency metadata', () => {
    const registry = createRendererRegistry([formRenderer, inputRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = runtime.compile({
      type: 'form',
      body: [
        {
          type: 'input-text',
          name: 'password',
          label: 'Password'
        },
        {
          type: 'input-text',
          name: 'confirmPassword',
          label: 'Confirm Password',
          equalsField: 'password'
        },
        {
          type: 'input-text',
          name: 'adminCode',
          label: 'Admin Code',
          requiredWhen: {
            path: 'role',
            equals: 'admin',
            message: 'Admin code required for admins'
          }
        }
      ]
    }) as any;

    expect(node.validation.nodes.confirmPassword.rules[0].rule).toMatchObject({
      kind: 'equalsField',
      path: 'password'
    });
    expect(node.validation.nodes.confirmPassword.rules[0].dependencyPaths).toEqual(['password']);
    expect(node.validation.nodes.adminCode.rules[0].rule).toMatchObject({
      kind: 'requiredWhen',
      path: 'role',
      equals: 'admin'
    });
    expect(node.validation.dependents.password).toEqual(['confirmPassword']);
    expect(node.validation.dependents.role).toEqual(['adminCode']);
  });

  it('revalidates dependent fields when an upstream value changes', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'dependency-form',
      initialValues: {
        password: 'alpha',
        confirmPassword: 'alpha',
        role: 'viewer',
        adminCode: ''
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        nodes: {
          password: {
            path: 'password',
            kind: 'field',
            controlType: 'input-text',
            label: 'Password',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [],
            children: [],
            parent: ''
          },
          confirmPassword: {
            path: 'confirmPassword',
            kind: 'field',
            controlType: 'input-text',
            label: 'Confirm Password',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              {
                id: 'confirmPassword#0:equalsField',
                rule: {
                  kind: 'equalsField',
                  path: 'password',
                  message: 'Passwords must match'
                },
                dependencyPaths: ['password']
              }
            ],
            children: [],
            parent: ''
          },
          role: {
            path: 'role',
            kind: 'field',
            controlType: 'input-text',
            label: 'Role',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [],
            children: [],
            parent: ''
          },
          adminCode: {
            path: 'adminCode',
            kind: 'field',
            controlType: 'input-text',
            label: 'Admin Code',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              {
                id: 'adminCode#0:requiredWhen',
                rule: {
                  kind: 'requiredWhen',
                  path: 'role',
                  equals: 'admin',
                  message: 'Admin code required for admins'
                },
                dependencyPaths: ['role']
              }
            ],
            children: [],
            parent: ''
          }
        },
        order: ['password', 'confirmPassword', 'role', 'adminCode'],
        dependents: {
          password: ['confirmPassword'],
          role: ['adminCode']
        }
      }
    });

    form.touchField('confirmPassword');
    await form.validateField('confirmPassword');
    expect(form.getError('confirmPassword')).toBeUndefined();

    form.setValue('password', 'beta');

    await vi.waitFor(() => {
      expect(form.getError('confirmPassword')?.[0]?.message).toBe('Passwords must match');
    });

    form.touchField('adminCode');
    form.setValue('role', 'admin');

    await vi.waitFor(() => {
      expect(form.getError('adminCode')?.[0]?.message).toBe('Admin code required for admins');
    });

    form.setValue('role', 'viewer');

    await vi.waitFor(() => {
      expect(form.getError('adminCode')).toBeUndefined();
    });
  });

  it('supports not-equals and required-unless relational validators', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'relational-form',
      initialValues: {
        username: 'alice',
        backupUsername: 'bob',
        status: 'draft',
        publishReason: ''
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        nodes: {
          username: {
            path: 'username',
            kind: 'field',
            controlType: 'input-text',
            label: 'Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [],
            children: [],
            parent: ''
          },
          backupUsername: {
            path: 'backupUsername',
            kind: 'field',
            controlType: 'input-text',
            label: 'Backup Username',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [compiledRule({ kind: 'notEqualsField', path: 'username', message: 'Backup username must differ' }, 'backupUsername')],
            children: [],
            parent: ''
          },
          status: {
            path: 'status',
            kind: 'field',
            controlType: 'input-text',
            label: 'Status',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [],
            children: [],
            parent: ''
          },
          publishReason: {
            path: 'publishReason',
            kind: 'field',
            controlType: 'input-text',
            label: 'Publish Reason',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule(
                {
                  kind: 'requiredUnless',
                  path: 'status',
                  equals: 'published',
                  message: 'Publish reason is required before publishing'
                },
                'publishReason'
              )
            ],
            children: [],
            parent: ''
          }
        },
        order: ['username', 'backupUsername', 'status', 'publishReason'],
        dependents: {
          username: ['backupUsername'],
          status: ['publishReason']
        }
      }
    });

    form.touchField('backupUsername');
    form.setValue('username', 'bob');

    await vi.waitFor(() => {
      expect(form.getError('backupUsername')?.[0]?.message).toBe('Backup username must differ');
    });

    form.setValue('username', 'carol');

    await vi.waitFor(() => {
      expect(form.getError('backupUsername')).toBeUndefined();
    });

    form.touchField('publishReason');
    form.setValue('status', 'review');

    await vi.waitFor(() => {
      expect(form.getError('publishReason')?.[0]?.message).toBe('Publish reason is required before publishing');
    });

    form.setValue('status', 'published');

    await vi.waitFor(() => {
      expect(form.getError('publishReason')).toBeUndefined();
    });
  });

  it('compiles validation nodes with array metadata', () => {
    const arrayRenderer: RendererDefinition = {
      type: 'array-editor',
      component: () => null,
      validation: {
        kind: 'field',
        valueKind: 'array',
        getFieldPath(schema) {
          return typeof schema.name === 'string' ? schema.name : undefined;
        },
        collectRules() {
          return [];
        }
      }
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([formRenderer, inputRenderer, arrayRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = runtime.compile({
      type: 'form',
      body: [
        {
          type: 'array-editor',
          name: 'reviewers',
          label: 'Reviewers',
          minItems: 1
        }
      ]
    }) as any;

    expect(node.validation.nodes.reviewers.kind).toBe('array');
    expect(node.validation.nodes[''].children).toContain('reviewers');
    expect(node.validation.nodes.reviewers.rules[0].rule).toMatchObject({
      kind: 'minItems',
      value: 1
    });
  });

  it('exposes validation compatibility accessors from canonical model data', () => {
    const validation: CompiledFormValidationModel = {
      behavior: {
        triggers: ['blur'],
        showErrorOn: ['touched', 'submit']
      },
      order: ['reviewers'],
      dependents: {
        role: ['adminCode']
      },
      nodes: {
        '': {
          path: '',
          kind: 'form',
          rules: [],
          children: ['reviewers']
        },
        reviewers: {
          path: 'reviewers',
          kind: 'array',
          controlType: 'array-editor',
          label: 'Reviewers',
          behavior: {
            triggers: ['change'],
            showErrorOn: ['dirty']
          },
          rules: [compiledRule({ kind: 'minItems', value: 1, message: 'Need one reviewer' }, 'reviewers')],
          children: [],
          parent: ''
        },
        adminCode: {
          path: 'adminCode',
          kind: 'field',
          controlType: 'input-text',
          label: 'Admin Code',
          behavior: {
            triggers: ['blur'],
            showErrorOn: ['touched', 'submit']
          },
          rules: [compiledRule({ kind: 'requiredWhen', path: 'role', value: 'admin' }, 'adminCode')],
          children: [],
          parent: ''
        }
      },
      validationOrder: ['reviewers'],
      rootPath: ''
    };

    expect(getCompiledValidationTraversalOrder(validation)).toEqual(['reviewers']);
    expect(getCompiledValidationDependents(validation, 'role')).toEqual(['adminCode']);
    expect(getCompiledValidationDependents(validation, 'missing')).toEqual([]);
    expect(getCompiledValidationNodeMap(validation)).toBe(validation.nodes);
    expect(getCompiledValidationNode(validation, 'reviewers')).toBe(validation.nodes?.reviewers);
    expect(getCompiledValidationNode(validation, 'missing')).toBeUndefined();
    expect(getCompiledValidationRootPath(validation)).toBe('');
    expect(hasCompiledValidationNodes(validation)).toBe(true);
    expect(hasCompiledValidationNodes(undefined)).toBe(false);
    expect(buildCompiledValidationDependentMap(validation.nodes)).toEqual({
      role: ['adminCode']
    });
    expect(buildCompiledValidationOrder(validation.nodes, '')).toEqual(['reviewers', 'adminCode']);
    expect(
      buildCompiledFormValidationModel({
        behavior: validation.behavior,
        nodes: validation.nodes,
        rootPath: ''
      })
    ).toMatchObject({
      order: ['reviewers', 'adminCode'],
      validationOrder: ['reviewers', 'adminCode'],
      dependents: {
        role: ['adminCode']
      }
    });
    expect(getCompiledValidationField(validation, 'reviewers')).toMatchObject({
      path: 'reviewers',
      controlType: 'array-editor',
      label: 'Reviewers',
      behavior: {
        triggers: ['change'],
        showErrorOn: ['dirty']
      }
    });
  });

  it('validates array-level rules through field and subtree validation', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'array-form',
      initialValues: {
        reviewers: []
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['reviewers'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['reviewers']
          },
          reviewers: {
            path: 'reviewers',
            kind: 'array',
            controlType: 'array-editor',
            label: 'Reviewers',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [compiledRule({ kind: 'minItems', value: 1, message: 'Add at least one reviewer' }, 'reviewers')],
            children: [],
            parent: ''
          }
        },
        validationOrder: ['reviewers'],
        rootPath: ''
      }
    });

    const fieldResult = await form.validateField('reviewers');
    expect(fieldResult.ok).toBe(false);
    expect(fieldResult.errors[0].message).toBe('Add at least one reviewer');
    expect(fieldResult.errors[0]).toMatchObject({
      path: 'reviewers',
      rule: 'minItems',
      ruleId: 'reviewers#0:minItems',
      ownerPath: 'reviewers',
      sourceKind: 'array'
    });

    const subtreeResult = await form.validateSubtree('reviewers');
    expect(subtreeResult.ok).toBe(false);
    expect(subtreeResult.fieldErrors.reviewers?.[0]?.message).toBe('Add at least one reviewer');

    form.setValue('reviewers', [{ value: 'alice' }]);

    const nextResult = await form.validateSubtree('reviewers');
    expect(nextResult.ok).toBe(true);
  });

  it('supports maxItems and includes runtime-registered child paths in subtree validation', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'array-subtree-form',
      initialValues: {
        reviewers: [{ value: 'alice' }, { value: '' }]
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['reviewers'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['reviewers']
          },
          reviewers: {
            path: 'reviewers',
            kind: 'array',
            controlType: 'array-editor',
            label: 'Reviewers',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [compiledRule({ kind: 'maxItems', value: 1, message: 'Only one reviewer is allowed' }, 'reviewers')],
            children: ['reviewers.0.value', 'reviewers.1.value'],
            parent: ''
          }
        },
        validationOrder: ['reviewers'],
        rootPath: ''
      }
    });

    form.registerField({
      path: 'reviewers',
      childPaths: ['reviewers.0.value', 'reviewers.1.value'],
      getValue() {
        return form.store.getState().values.reviewers;
      },
      validateChild(path) {
        return path === 'reviewers.1.value'
          ? [{ path, rule: 'required', message: 'Reviewer 2 is required' }]
          : [];
      }
    });

    const subtreeResult = await form.validateSubtree('reviewers');
    expect(subtreeResult.ok).toBe(false);
    expect(subtreeResult.fieldErrors.reviewers?.[0]?.message).toBe('Only one reviewer is allowed');
    expect(subtreeResult.fieldErrors['reviewers.1.value']?.[0]?.message).toBe('Reviewer 2 is required');
    expect(subtreeResult.fieldErrors['reviewers.1.value']?.[0]).toMatchObject({
      path: 'reviewers.1.value',
      rule: 'required',
      ownerPath: 'reviewers',
      sourceKind: 'runtime-registration'
    });

    form.setValue('reviewers', [{ value: 'alice' }]);

    const nextSubtreeResult = await form.validateSubtree('reviewers');
    expect(nextSubtreeResult.fieldErrors.reviewers).toBeUndefined();
  });

  it('supports aggregate atLeastOneFilled validation for array nodes', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'aggregate-array-form',
      initialValues: {
        reviewers: [{ value: '' }, { value: '' }]
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['reviewers'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['reviewers']
          },
          reviewers: {
            path: 'reviewers',
            kind: 'array',
            controlType: 'array-editor',
            label: 'Reviewers',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule(
                { kind: 'atLeastOneFilled', itemPath: 'value', message: 'Add at least one reviewer value' },
                'reviewers'
              )
            ],
            children: ['reviewers.0.value', 'reviewers.1.value'],
            parent: ''
          }
        },
        validationOrder: ['reviewers'],
        rootPath: ''
      }
    });

    const firstResult = await form.validateSubtree('reviewers');
    expect(firstResult.ok).toBe(false);
    expect(firstResult.fieldErrors.reviewers?.[0]?.message).toBe('Add at least one reviewer value');

    form.setValue('reviewers', [{ value: '' }, { value: 'bob' }]);

    const nextResult = await form.validateSubtree('reviewers');
    expect(nextResult.ok).toBe(true);
  });

  it('supports aggregate allOrNone validation for array nodes', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'all-or-none-array-form',
      initialValues: {
        metadata: [
          { key: 'env', value: '' },
          { key: '', value: '' }
        ]
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['metadata'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['metadata']
          },
          metadata: {
            path: 'metadata',
            kind: 'array',
            controlType: 'key-value',
            label: 'Metadata',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule(
                {
                  kind: 'allOrNone',
                  itemPaths: ['key', 'value'],
                  message: 'Metadata entries must fill both key and value or leave both empty'
                },
                'metadata'
              )
            ],
            children: ['metadata.0.key', 'metadata.0.value'],
            parent: ''
          }
        },
        validationOrder: ['metadata'],
        rootPath: ''
      }
    });

    const firstResult = await form.validateSubtree('metadata');
    expect(firstResult.ok).toBe(false);
    expect(firstResult.fieldErrors.metadata?.[0]?.message).toBe(
      'Metadata entries must fill both key and value or leave both empty'
    );

    form.setValue('metadata', [
      { key: 'env', value: 'prod' },
      { key: '', value: '' }
    ]);

    const nextResult = await form.validateSubtree('metadata');
    expect(nextResult.ok).toBe(true);
  });

  it('supports aggregate uniqueBy validation for array nodes', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'unique-array-form',
      initialValues: {
        metadata: [
          { key: 'env', value: 'prod' },
          { key: 'env', value: 'stage' }
        ]
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['metadata'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['metadata']
          },
          metadata: {
            path: 'metadata',
            kind: 'array',
            controlType: 'key-value',
            label: 'Metadata',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule(
                {
                  kind: 'uniqueBy',
                  itemPath: 'key',
                  message: 'Metadata keys must be unique'
                },
                'metadata'
              )
            ],
            children: ['metadata.0.key', 'metadata.1.key'],
            parent: ''
          }
        },
        validationOrder: ['metadata'],
        rootPath: ''
      }
    });

    const firstResult = await form.validateSubtree('metadata');
    expect(firstResult.ok).toBe(false);
    expect(firstResult.fieldErrors.metadata?.[0]?.message).toBe('Metadata keys must be unique');
    expect(firstResult.fieldErrors.metadata?.[0]).toMatchObject({
      path: 'metadata',
      rule: 'uniqueBy',
      ruleId: 'metadata#0:uniqueBy',
      ownerPath: 'metadata',
      sourceKind: 'array',
      relatedPaths: ['key']
    });

    form.setValue('metadata', [
      { key: 'env', value: 'prod' },
      { key: 'tier', value: 'stage' }
    ]);

    const nextResult = await form.validateSubtree('metadata');
    expect(nextResult.ok).toBe(true);
  });

  it('supports object-level atLeastOneOf validation', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'contact-form',
      initialValues: {
        contact: {
          email: '',
          phone: ''
        }
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['contact'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['contact']
          },
          contact: {
            path: 'contact',
            kind: 'object',
            controlType: 'contact-group',
            label: 'Contact',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule(
                {
                  kind: 'atLeastOneOf',
                  paths: ['email', 'phone'],
                  message: 'Provide at least an email or phone number'
                },
                'contact'
              )
            ],
            children: ['contact.email', 'contact.phone'],
            parent: ''
          }
        },
        validationOrder: ['contact'],
        rootPath: ''
      }
    });

    const firstResult = await form.validateSubtree('contact');
    expect(firstResult.ok).toBe(false);
    expect(firstResult.fieldErrors.contact?.[0]?.message).toBe('Provide at least an email or phone number');
    expect(firstResult.fieldErrors.contact?.[0]).toMatchObject({
      path: 'contact',
      rule: 'atLeastOneOf',
      ruleId: 'contact#0:atLeastOneOf',
      ownerPath: 'contact',
      sourceKind: 'object',
      relatedPaths: ['email', 'phone']
    });

    form.setValue('contact', { email: 'a@example.com', phone: '' });

    const nextResult = await form.validateSubtree('contact');
    expect(nextResult.ok).toBe(true);
  });

  it('supports object-level allOrNone validation', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'credentials-form',
      initialValues: {
        credentials: {
          username: 'alice',
          password: ''
        }
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['credentials'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['credentials']
          },
          credentials: {
            path: 'credentials',
            kind: 'object',
            controlType: 'credentials-group',
            label: 'Credentials',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [
              compiledRule(
                {
                  kind: 'allOrNone',
                  itemPaths: ['username', 'password'],
                  message: 'Provide both username and password or leave both empty'
                },
                'credentials'
              )
            ],
            children: ['credentials.username', 'credentials.password'],
            parent: ''
          }
        },
        validationOrder: ['credentials'],
        rootPath: ''
      }
    });

    const firstResult = await form.validateSubtree('credentials');
    expect(firstResult.ok).toBe(false);
    expect(firstResult.fieldErrors.credentials?.[0]?.message).toBe('Provide both username and password or leave both empty');

    form.setValue('credentials', { username: 'alice', password: 'secret' });

    const nextResult = await form.validateSubtree('credentials');
    expect(nextResult.ok).toBe(true);
  });

  it('builds node traversal order from validation node relationships', () => {
    const compiler = createSchemaCompiler({
      registry: createRendererRegistry([formRenderer, inputRenderer]),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const compiled = compiler.compile({
        type: 'form',
        body: [
          {
            type: 'input-text',
            name: 'reviewers',
            label: 'Reviewers'
          },
          {
            type: 'input-text',
            name: 'metadata',
            label: 'Metadata'
          }
        ]
      }) as any;
    const order = compiled.validation?.validationOrder;

    expect(order).toEqual(['reviewers', 'metadata']);
  });

  it('validates subtree targets from node traversal for nested child paths', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'nested-subtree-form',
      initialValues: {
        metadata: [{ key: '', value: '' }]
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['metadata'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['metadata']
          },
          metadata: {
            path: 'metadata',
            kind: 'array',
            controlType: 'key-value',
            label: 'Metadata',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [],
            children: ['metadata.0.key', 'metadata.0.value'],
            parent: ''
          },
          'metadata.0.key': {
            path: 'metadata.0.key',
            kind: 'field',
            rules: [],
            children: [],
            parent: 'metadata'
          },
          'metadata.0.value': {
            path: 'metadata.0.value',
            kind: 'field',
            rules: [],
            children: [],
            parent: 'metadata'
          }
        },
        validationOrder: ['metadata', 'metadata.0.key', 'metadata.0.value'],
        rootPath: ''
      }
    });

    form.registerField({
      path: 'metadata',
      childPaths: ['metadata.0.key', 'metadata.0.value'],
      getValue() {
        return form.store.getState().values.metadata;
      },
      validateChild(path) {
        return [{ path, rule: 'required', message: `${path} is required` }];
      }
    });

    const result = await form.validateSubtree('metadata');

    expect(result.ok).toBe(false);
    expect(result.fieldErrors['metadata.0.key']?.[0]?.message).toBe('metadata.0.key is required');
    expect(result.fieldErrors['metadata.0.value']?.[0]?.message).toBe('metadata.0.value is required');
  });

  it('prefers node-driven subtree execution while preserving runtime-registration children', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'node-walker-form',
      initialValues: {
        reviewers: [{ value: '' }]
      },
      parentScope: page.scope,
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit']
        },
        order: ['reviewers'],
        dependents: {},
        nodes: {
          '': {
            path: '',
            kind: 'form',
            rules: [],
            children: ['reviewers']
          },
          reviewers: {
            path: 'reviewers',
            kind: 'array',
            controlType: 'array-editor',
            label: 'Reviewers',
            behavior: {
              triggers: ['blur'],
              showErrorOn: ['touched', 'submit']
            },
            rules: [compiledRule({ kind: 'minItems', value: 1, message: 'Need at least one reviewer' }, 'reviewers')],
            children: ['reviewers.0.value'],
            parent: ''
          },
          'reviewers.0.value': {
            path: 'reviewers.0.value',
            kind: 'field',
            rules: [],
            children: [],
            parent: 'reviewers'
          }
        },
        validationOrder: ['reviewers', 'reviewers.0.value'],
        rootPath: ''
      }
    });

    const visited: string[] = [];

    form.registerField({
      path: 'reviewers',
      childPaths: ['reviewers.0.value'],
      getValue() {
        return form.store.getState().values.reviewers;
      },
      validate() {
        visited.push('reviewers');
        return [];
      },
      validateChild(path) {
        visited.push(path);
        return [{ path, rule: 'required', message: 'Reviewer value is required' }];
      }
    });

    const result = await form.validateSubtree('reviewers');

    expect(result.ok).toBe(false);
    expect(result.fieldErrors['reviewers.0.value']?.[0]?.message).toBe('Reviewer value is required');
    expect(visited).toEqual(['reviewers', 'reviewers.0.value']);
  });

  it('remaps child errors when removing array items through runtime helpers', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'array-remap-form',
      initialValues: {
        reviewers: [{ value: 'alice' }, { value: '' }]
      },
      parentScope: page.scope
    });

    form.registerField({
      path: 'reviewers',
      childPaths: ['reviewers.0.value', 'reviewers.1.value'],
      getValue() {
        return form.store.getState().values.reviewers;
      },
      validateChild(path) {
        return path === 'reviewers.1.value'
          ? [{ path, rule: 'required', message: 'Reviewer 2 is required' }]
          : [];
      }
    });

    await form.validateField('reviewers.1.value');
    expect(form.getError('reviewers.1.value')?.[0]?.message).toBe('Reviewer 2 is required');

    form.removeValue('reviewers', 0);

    expect(form.getError('reviewers.1.value')).toBeUndefined();
    expect(form.store.getState().values.reviewers).toEqual([{ value: '' }]);
  });

  it('remaps child errors when removing middle array items through runtime helpers', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'array-middle-remap-form',
      initialValues: {
        reviewers: [{ value: 'alice' }, { value: 'bob' }, { value: '' }]
      },
      parentScope: page.scope
    });

    form.registerField({
      path: 'reviewers',
      childPaths: ['reviewers.0.value', 'reviewers.1.value', 'reviewers.2.value'],
      getValue() {
        return form.store.getState().values.reviewers;
      },
      validateChild(path) {
        return path === 'reviewers.2.value'
          ? [{ path, rule: 'required', message: 'Reviewer 3 is required' }]
          : [];
      }
    });

    form.touchField('reviewers.2.value');
    await form.validateField('reviewers.2.value');
    expect(form.getError('reviewers.2.value')?.[0]?.message).toBe('Reviewer 3 is required');

    form.removeValue('reviewers', 1);

    expect(form.store.getState().values.reviewers).toEqual([{ value: 'alice' }, { value: '' }]);
    expect(form.isTouched('reviewers.1.value')).toBe(true);
    expect(form.getError('reviewers.2.value')).toBeUndefined();
    expect(form.getError('reviewers.1.value')?.[0]?.message).toBe('Reviewer 3 is required');
  });

  it('remaps touched and errors when swapping array items through runtime helpers', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'array-swap-form',
      initialValues: {
        reviewers: [{ value: 'alice' }, { value: '' }]
      },
      parentScope: page.scope
    });

    form.registerField({
      path: 'reviewers',
      childPaths: ['reviewers.0.value', 'reviewers.1.value'],
      getValue() {
        return form.store.getState().values.reviewers;
      },
      validateChild(path) {
        return path === 'reviewers.1.value'
          ? [{ path, rule: 'required', message: 'Reviewer 2 is required' }]
          : [];
      }
    });

    form.touchField('reviewers.1.value');
    await form.validateField('reviewers.1.value');

    form.swapValue('reviewers', 0, 1);

    expect(form.store.getState().values.reviewers).toEqual([{ value: '' }, { value: 'alice' }]);
    expect(form.isTouched('reviewers.0.value')).toBe(true);
    expect(form.isTouched('reviewers.1.value')).toBe(false);
    expect(form.getError('reviewers.0.value')?.[0]?.message).toBe('Reviewer 2 is required');
    expect(form.getError('reviewers.1.value')).toBeUndefined();
  });

  it('normalizes root runtime-registration validation error metadata', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'runtime-root-form',
      initialValues: {
        tags: []
      },
      parentScope: page.scope
    });

    form.registerField({
      path: 'tags',
      getValue() {
        return form.store.getState().values.tags;
      },
      validate() {
        return [{ path: 'tags', rule: 'required', message: 'Tag List requires at least one tag' }];
      }
    });

    const result = await form.validateField('tags');

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatchObject({
      path: 'tags',
      rule: 'required',
      message: 'Tag List requires at least one tag',
      ownerPath: 'tags',
      sourceKind: 'runtime-registration'
    });
  });

  it('treats nested scope ownership by lexical level instead of materialized fallback', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ record: { from: 'page' } });
    const rowScope = runtime.createChildScope(page.scope, { record: { name: 'Alice' } });

    expect(rowScope.has('record')).toBe(true);
    expect(rowScope.has('record.name')).toBe(true);
    expect(rowScope.has('record.from')).toBe(false);
    expect(rowScope.get('record.from')).toBe(undefined);
  });

  it('cancels the previous ajax request when a new matching request starts', async () => {
    let callCount = 0;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(_api: ApiObject, ctx: ApiRequestContext) => {
          callCount += 1;

          if (callCount === 1) {
            return await new Promise((resolve, reject) => {
              ctx.signal?.addEventListener('abort', () => {
                reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
              });
            });
          }

          return {
            ok: true,
            status: 200,
            data: { request: callCount } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const firstPromise = runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/search',
          method: 'get'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    const secondResult = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/search',
          method: 'get'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    const firstResult = await firstPromise;

    expect(firstResult).toMatchObject({ ok: false, cancelled: true });
    expect(secondResult).toMatchObject({ ok: true, data: { request: 2 } });
  });

  it('increments page refresh tick through refreshTable actions', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const first = await runtime.dispatch(
      {
        action: 'refreshTable'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    const second = await runtime.dispatch(
      {
        action: 'refreshTable'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(first).toMatchObject({ ok: true, data: 1 });
    expect(second).toMatchObject({ ok: true, data: 2 });
    expect(page.store.getState().refreshTick).toBe(2);
  });

  it('refreshes registered sources through refreshSource actions', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ price: 2, qty: 3 });

    const registration = runtime.registerDataSource({
      id: 'total-source',
      scope: page.scope,
      schema: {
        type: 'data-source',
        dataPath: 'total',
        formula: '${(price || 0) * (qty || 0)}'
      }
    });

    await vi.waitFor(() => {
      expect(page.scope.get('total')).toBe(6);
    });

    page.scope.update('qty', 4);

    const result = await runtime.dispatch(
      {
        action: 'refreshSource',
        componentId: 'total-source'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result).toMatchObject({ ok: true, data: true });
    expect(page.scope.get('total')).toBe(8);

    registration.dispose();
  });

  it('skips actions when the when precondition evaluates false', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ enabled: false, message: 'initial' });

    const result = await runtime.dispatch(
      {
        action: 'setValue',
        when: '${enabled}',
        componentPath: 'message',
        value: 'updated'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result).toMatchObject({ ok: true, skipped: true });
    expect(page.scope.get('message')).toBe('initial');
  });

  it('runs parallel actions and returns aggregated results', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ left: 'a', right: 'b' });

    const result = await runtime.dispatch(
      {
        action: 'noop',
        parallel: [
          {
            action: 'setValue',
            componentPath: 'left',
            value: 'left-updated'
          },
          {
            action: 'setValue',
            componentPath: 'right',
            value: 'right-updated'
          }
        ]
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(page.scope.get('left')).toBe('left-updated');
    expect(page.scope.get('right')).toBe('right-updated');
  });

  it('returns a timedOut result for actions that exceed timeout', async () => {
    vi.useFakeTimers();

    try {
      const fetcherImpl: RendererEnv['fetcher'] = async <T>(_api: ApiObject, ctx: { signal?: AbortSignal }) => {
        return new Promise((resolve, reject) => {
          ctx.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            (error as Error & { name: string }).name = 'AbortError';
            reject(error);
          }, { once: true });
        }) as Promise<{ ok: true; status: number; data: T }>;
      };
      const fetcher = vi.fn(fetcherImpl);
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
        },
        expressionCompiler: createExpressionCompiler(createFormulaCompiler())
      });
      const page = runtime.createPageRuntime({});

      const resultPromise = runtime.dispatch(
        {
          action: 'ajax',
          timeout: 10,
          api: { url: '/api/slow' }
        },
        {
          runtime,
          scope: page.scope,
          page
        }
      );

      await vi.advanceTimersByTimeAsync(10);

      await expect(resultPromise).resolves.toMatchObject({
        ok: false,
        cancelled: true,
        timedOut: true
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('aborts ajax requests when action timeouts fire', async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(_api: ApiObject, ctx: { signal?: AbortSignal }) => {
      capturedSignal = ctx.signal;

      return new Promise((resolve, reject) => {
        ctx.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          (error as Error & { name: string }).name = 'AbortError';
          reject(error);
        }, { once: true });
      }) as Promise<{ ok: true; status: number; data: T }>;
    };
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const resultPromise = runtime.dispatch(
      {
        action: 'ajax',
        timeout: 5,
        api: { url: '/api/slow' }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 20));

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      cancelled: true,
      timedOut: true
    });
    expect(capturedSignal?.aborted).toBe(true);
  });

  it('returns a failure result when refreshSource cannot resolve a source id', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      {
        action: 'refreshSource',
        componentId: 'missing-source'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it('debounces matching actions and cancels superseded executions', async () => {
    vi.useFakeTimers();

    try {
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env,
        expressionCompiler: createExpressionCompiler(createFormulaCompiler())
      });
      const page = runtime.createPageRuntime({ status: 'idle' });

      const firstPromise = runtime.dispatch(
        {
          action: 'setValue',
          componentPath: 'status',
          value: 'first',
          debounce: 50
        },
        {
          runtime,
          scope: page.scope,
          page
        }
      );

      const secondPromise = runtime.dispatch(
        {
          action: 'setValue',
          componentPath: 'status',
          value: 'second',
          debounce: 50
        },
        {
          runtime,
          scope: page.scope,
          page
        }
      );

      await expect(firstPromise).resolves.toMatchObject({ ok: false, cancelled: true });
      expect(page.store.getState().data.status).toBe('idle');

      await vi.advanceTimersByTimeAsync(50);

      await expect(secondPromise).resolves.toMatchObject({ ok: true, data: 'second' });
      expect(page.store.getState().data.status).toBe('second');
    } finally {
      vi.useRealTimers();
    }
  });

  it('emits action and api monitor callbacks during ajax execution', async () => {
    const onActionStart = vi.fn();
    const onActionEnd = vi.fn();
    const onApiRequest = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        monitor: {
          onActionStart,
          onActionEnd,
          onApiRequest
        },
        fetcher: async <T>() => ({
          ok: true,
          status: 200,
          data: { items: [1] } as T
        })
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const node = runtime.compile({ type: 'text', text: 'trigger' }) as any;
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/monitored',
          method: 'get'
        }
      },
      {
        runtime,
        scope: page.scope,
        page,
        node
      }
    );

    expect(result.ok).toBe(true);
    expect(onActionStart).toHaveBeenCalledWith({
      actionType: 'ajax',
      interactionId: expect.any(String),
      nodeId: node.id,
      path: node.path
    });
    expect(onApiRequest).toHaveBeenCalledWith(expect.objectContaining({
      api: expect.objectContaining({ url: '/api/monitored', method: 'get', params: undefined }),
      nodeId: node.id,
      path: node.path,
      interactionId: expect.any(String)
    }));
    expect(onActionEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'ajax',
        dispatchMode: 'built-in',
        nodeId: node.id,
        path: node.path,
        result: expect.objectContaining({ ok: true })
      })
    );
  });

  it('monitors the final executable ajax request after params canonicalization', async () => {
    const onApiRequest = vi.fn();
    const fetcherImpl: RendererEnv['fetcher'] = async <T>(api: ApiObject) => ({
      ok: true,
      status: 200,
      data: { url: api.url } as T
    });
    const fetcher = vi.fn(fetcherImpl);
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        monitor: {
          onApiRequest
        },
        fetcher: ((api, ctx) => fetcher(api, ctx)) as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ token: 'live' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/items',
          method: 'get',
          params: { mode: '${token}' }
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(onApiRequest).toHaveBeenCalledWith(expect.objectContaining({
      api: expect.objectContaining({
        url: '/api/items?mode=live',
        method: 'get',
        params: undefined
      }),
      nodeId: undefined,
      path: undefined,
      interactionId: expect.any(String)
    }));
    expect(fetcher).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/items?mode=live',
        params: undefined
      }),
      expect.any(Object)
    );
  });

  it('reuses compiled action payload/api objects across repeated dispatches', async () => {
    const customCompiler = createExpressionCompiler(createFormulaCompiler());
    const originalCompileValue = customCompiler.compileValue.bind(customCompiler);
    customCompiler.compileValue = ((input: unknown) => {
      return originalCompileValue(input);
    }) as typeof customCompiler.compileValue;
    const compileValueSpy = vi.spyOn(customCompiler, 'compileValue');

    const invoke = vi.fn().mockResolvedValue({ ok: true, data: { ok: true } });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: customCompiler
    });
    const page = runtime.createPageRuntime({ baseX: 10, token: 'cached' });
    const actionScope = createActionScope({ id: 'cached-action-scope' });
    actionScope.registerNamespace('designer', {
      kind: 'host',
      invoke
    });

    const action = {
      action: 'designer:addNode',
      args: {
        nodeType: 'task',
        position: {
          x: '${baseX}',
          y: 20
        }
      }
    } as any;

    const ajaxAction = {
      action: 'ajax',
      api: {
        url: '/api/items/${baseX}',
        params: {
          token: '${token}'
        }
      }
    } as any;

    await runtime.dispatch(action, {
      runtime,
      scope: page.scope,
      page,
      actionScope
    });
    await runtime.dispatch(action, {
      runtime,
      scope: page.scope,
      page,
      actionScope
    });
    await runtime.dispatch(ajaxAction, {
      runtime,
      scope: page.scope,
      page
    });
    await runtime.dispatch(ajaxAction, {
      runtime,
      scope: page.scope,
      page
    });

    const compiledArgsCount = compileValueSpy.mock.calls.filter(([input]) => input === action.args).length;
    const compiledApiCount = compileValueSpy.mock.calls.filter(([input]) => input === ajaxAction.api).length;

    expect(compiledArgsCount).toBe(1);
    expect(compiledApiCount).toBe(1);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('supports top-level action payload compatibility with cached extraction', async () => {
    const customCompiler = createExpressionCompiler(createFormulaCompiler());
    const originalCompileValue = customCompiler.compileValue.bind(customCompiler);
    customCompiler.compileValue = ((input: unknown) => {
      return originalCompileValue(input);
    }) as typeof customCompiler.compileValue;
    const compileValueSpy = vi.spyOn(customCompiler, 'compileValue');

    const invoke = vi.fn().mockResolvedValue({ ok: true, data: { ok: true } });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: customCompiler
    });
    const page = runtime.createPageRuntime({ baseX: 10 });
    const actionScope = createActionScope({ id: 'top-level-action-scope' });
    actionScope.registerNamespace('designer', {
      kind: 'host',
      invoke
    });

    const action = {
      action: 'designer:addNode',
      nodeType: 'task',
      position: {
        x: '${baseX}',
        y: 20
      }
    } as any;

    await runtime.dispatch(action, {
      runtime,
      scope: page.scope,
      page,
      actionScope
    });
    await runtime.dispatch(action, {
      runtime,
      scope: page.scope,
      page,
      actionScope
    });

    const compiledTopLevelPayloadCount = compileValueSpy.mock.calls.filter(
      ([input]) => input !== action && !!input && typeof input === 'object' && (input as any).nodeType === 'task'
    ).length;

    expect(compiledTopLevelPayloadCount).toBe(1);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('emits delegated action monitor metadata for component and namespace dispatch', async () => {
    const onActionEnd = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        monitor: {
          onActionEnd
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const actionScope = createActionScope({ id: 'monitor-scope' });
    const componentRegistry = createComponentHandleRegistry({ id: 'monitor-components' });
    const form = runtime.createFormRuntime({
      id: 'monitored-form',
      name: 'monitoredForm',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });

    componentRegistry.register(createFormComponentHandle(form));
    actionScope.registerNamespace('designer', {
      kind: 'host',
      invoke: async () => ({ ok: true })
    });

    await runtime.dispatch(
      {
        action: 'component:validate',
        componentId: 'monitored-form'
      },
      {
        runtime,
        scope: page.scope,
        page,
        componentRegistry,
        actionScope
      }
    );

    await runtime.dispatch(
      {
        action: 'designer:export'
      },
      {
        runtime,
        scope: page.scope,
        page,
        componentRegistry,
        actionScope
      }
    );

    expect(onActionEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'component:validate',
        dispatchMode: 'component',
        componentId: 'monitored-form',
        componentType: 'form',
        method: 'validate'
      })
    );
    expect(onActionEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'designer:export',
        dispatchMode: 'namespace',
        namespace: 'designer',
        method: 'export',
        sourceScopeId: 'monitor-scope',
        providerKind: 'host'
      })
    );
  });

  it('emits action monitor callbacks for cancelled debounced actions', async () => {
    vi.useFakeTimers();

    try {
      const onActionStart = vi.fn();
      const onActionEnd = vi.fn();
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          monitor: {
            onActionStart,
            onActionEnd
          }
        },
        expressionCompiler: createExpressionCompiler(createFormulaCompiler())
      });
      const page = runtime.createPageRuntime({ status: 'idle' });

      const firstPromise = runtime.dispatch(
        {
          action: 'setValue',
          componentPath: 'status',
          value: 'first',
          debounce: 25
        },
        {
          runtime,
          scope: page.scope,
          page
        }
      );

      const secondPromise = runtime.dispatch(
        {
          action: 'setValue',
          componentPath: 'status',
          value: 'second',
          debounce: 25
        },
        {
          runtime,
          scope: page.scope,
          page
        }
      );

      await expect(firstPromise).resolves.toMatchObject({ cancelled: true });
      await vi.advanceTimersByTimeAsync(25);
      await secondPromise;

      expect(onActionStart).toHaveBeenCalledTimes(1);
      expect(onActionEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'setValue',
          result: expect.objectContaining({ cancelled: true })
        })
      );
      expect(onActionEnd).toHaveBeenLastCalledWith(
        expect.objectContaining({
          actionType: 'setValue',
          result: expect.objectContaining({ ok: true, data: 'second' })
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops chained actions on ajax failure by default', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => ({ ok: false, status: 500, data: { message: 'boom' } as T })
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ status: 'idle' });

    const result = await runtime.dispatch(
      [
        {
          action: 'ajax',
          api: {
            url: '/api/fail',
            method: 'get'
          }
        },
        {
          action: 'setValue',
          componentPath: 'status',
          value: 'done'
        }
      ],
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(false);
    expect(page.store.getState().data.status).toBe('idle');
  });

  it('continues action arrays when continueOnError is enabled', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => ({ ok: false, status: 500, data: { message: 'boom' } as T })
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ status: 'idle' });

    const result = await runtime.dispatch(
      [
        {
          action: 'ajax',
          api: {
            url: '/api/fail',
            method: 'get'
          },
          continueOnError: true
        },
        {
          action: 'setValue',
          componentPath: 'status',
          value: 'done'
        }
      ],
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(page.store.getState().data.status).toBe('done');
  });

  it('runs then actions after a successful action', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ status: 'idle', lastResult: 'none' });

    const result = await runtime.dispatch(
      {
        action: 'setValue',
        componentPath: 'status',
        value: 'loading',
        then: {
          action: 'setValue',
          componentPath: 'lastResult',
          value: 'success'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(true);
    expect(page.store.getState().data).toMatchObject({
      status: 'loading',
      lastResult: 'success'
    });
  });

  it('lets beforeAction plugins rewrite actions before dispatch', async () => {
    const plugin: RendererPlugin = {
      name: 'rewrite-action',
      async beforeAction(action) {
        if (action.action !== 'setValue') {
          return action;
        }

        return {
          ...action,
          value: 'rewritten'
        } as ActionSchema;
      }
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      plugins: [plugin],
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ status: 'idle' });

    const result = await runtime.dispatch(
      {
        action: 'setValue',
        componentPath: 'status',
        value: 'original'
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result).toMatchObject({ ok: true, data: 'rewritten' });
    expect(page.store.getState().data.status).toBe('rewritten');
  });

  it('reports action errors through onActionError and plugin onError hooks', async () => {
    const onActionError = vi.fn();
    const onError = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => {
          throw new Error('network down') as unknown as T;
        }
      },
      plugins: [
        {
          name: 'error-monitor',
          onError
        }
      ],
      onActionError,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/fail',
          method: 'get'
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(result.ok).toBe(false);
    expect(onActionError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[1]).toMatchObject({
      phase: 'action'
    });
  });

  it('submits form values through submitForm actions', async () => {
    const fetchCalls: Array<{ api: unknown; scopeData: Record<string, any> }> = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiObject, ctx: ApiRequestContext) => {
          fetchCalls.push({ api, scopeData: ctx.scope.readOwn() });
          return {
            ok: true,
            status: 200,
            data: { submitted: ctx.scope.readOwn() } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: { username: 'Alice', email: 'alice@example.com' },
      parentScope: page.scope,
      page
    });

    form.setValue('role', 'admin');

    const result = await runtime.dispatch(
      {
        action: 'submitForm',
        api: {
          url: '/api/profile',
          method: 'post'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    expect(result.ok).toBe(true);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].api).toMatchObject({ url: '/api/profile', method: 'post' });
    expect(fetchCalls[0].scopeData).toMatchObject({ username: 'Alice', email: 'alice@example.com', role: 'admin' });
    expect(result.data).toEqual({
      submitted: {
        username: 'Alice',
        email: 'alice@example.com',
        role: 'admin'
      }
    });
  });

  it('updates multiple form values through setValues action with bounded commits', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ pageValue: 'root' });
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: { username: 'Alice', role: 'viewer' },
      parentScope: page.scope,
      page
    });

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    const result = await runtime.dispatch(
      {
        action: 'setValues',
        formId: 'profile-form',
        values: {
          username: 'Bob',
          role: 'admin'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    unsubscribe();

    expect(result).toMatchObject({
      ok: true,
      data: {
        username: 'Bob',
        role: 'admin'
      }
    });
    expect(form.scope.get('username')).toBe('Bob');
    expect(form.scope.get('role')).toBe('admin');
    expect(commits).toBeLessThanOrEqual(1);
  });

  it('can replace chained setValue actions with one setValues action for equivalent form updates', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: { username: 'Alice', role: 'viewer' },
      parentScope: page.scope,
      page
    });

    let chainedCommits = 0;
    const unsubscribeChained = form.store.subscribe(() => {
      chainedCommits += 1;
    });

    await runtime.dispatch(
      [
        {
          action: 'setValue',
          formId: 'profile-form',
          componentPath: 'username',
          value: 'Bob'
        },
        {
          action: 'setValue',
          formId: 'profile-form',
          componentPath: 'role',
          value: 'admin'
        }
      ],
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    unsubscribeChained();

    const chainedSnapshot = form.store.getState();

    form.reset({ username: 'Alice', role: 'viewer' });

    let batchedCommits = 0;
    const unsubscribeBatched = form.store.subscribe(() => {
      batchedCommits += 1;
    });

    await runtime.dispatch(
      {
        action: 'setValues',
        formId: 'profile-form',
        values: {
          username: 'Bob',
          role: 'admin'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    unsubscribeBatched();

    const batchedSnapshot = form.store.getState();

    expect(chainedSnapshot.values).toEqual(batchedSnapshot.values);
    expect(chainedSnapshot.errors).toEqual(batchedSnapshot.errors);
    expect(batchedCommits).toBeLessThan(chainedCommits);
  });

  it('uses the latest env fetcher without recreating runtime state', async () => {
    const firstFetcher = vi.fn(async <T,>(api: ApiObject) => ({
      ok: true,
      status: 200,
      data: { tick: api.headers?.['x-tick'], source: 'first' } as T
    }));
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: firstFetcher as RendererEnv['fetcher']
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});

    const firstResult = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/env',
          method: 'get',
          headers: {
            'x-tick': '0'
          }
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(firstResult).toMatchObject({ ok: true, data: { tick: '0', source: 'first' } });

    const secondFetcher = vi.fn(async <T,>(api: ApiObject) => ({
      ok: true,
      status: 200,
      data: { tick: api.headers?.['x-tick'], source: 'second' } as T
    }));
    Object.assign(runtime.env, {
      ...runtime.env,
      fetcher: secondFetcher as RendererEnv['fetcher']
    });

    const secondResult = await runtime.dispatch(
      {
        action: 'ajax',
        api: {
          url: '/api/env',
          method: 'get',
          headers: {
            'x-tick': '1'
          }
        }
      },
      {
        runtime,
        scope: page.scope,
        page
      }
    );

    expect(secondResult).toMatchObject({ ok: true, data: { tick: '1', source: 'second' } });
    expect(firstFetcher).toHaveBeenCalledTimes(1);
    expect(secondFetcher).toHaveBeenCalledTimes(1);
  });

  it('cancels concurrent submitForm actions instead of reporting a duplicate failure', async () => {
    let apiCallCount = 0;
    let resolveApi: (() => void) | undefined;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => {
          apiCallCount++;
          await new Promise<void>((resolve) => {
            resolveApi = resolve;
          });
          return {
            ok: true,
            status: 200,
            data: { saved: true } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'concurrent-submit-form',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });

    const firstPromise = runtime.dispatch(
      {
        action: 'submitForm',
        api: {
          url: '/api/profile',
          method: 'post'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    const secondResult = await runtime.dispatch(
      {
        action: 'submitForm',
        api: {
          url: '/api/profile',
          method: 'post'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    expect(apiCallCount).toBe(1);
    expect(secondResult).toMatchObject({ ok: false, cancelled: true, error: expect.any(Error) });
    expect(form.store.getState().submitting).toBe(true);

    resolveApi?.();

    await expect(firstPromise).resolves.toMatchObject({ ok: true, data: { saved: true } });
    expect(form.store.getState().submitting).toBe(false);
  });

  it('emits cancelled monitor results for guarded duplicate submitForm actions', async () => {
    const onActionEnd = vi.fn();
    let resolveApi: (() => void) | undefined;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        monitor: {
          onActionEnd
        },
        fetcher: async <T>() => {
          await new Promise<void>((resolve) => {
            resolveApi = resolve;
          });
          return {
            ok: true,
            status: 200,
            data: { saved: true } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({});
    const form = runtime.createFormRuntime({
      id: 'monitored-concurrent-submit-form',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });

    const firstPromise = runtime.dispatch(
      {
        action: 'submitForm',
        api: {
          url: '/api/profile',
          method: 'post'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    const secondResult = await runtime.dispatch(
      {
        action: 'submitForm',
        api: {
          url: '/api/profile',
          method: 'post'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    expect(secondResult).toMatchObject({ cancelled: true });
    expect(onActionEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'submitForm',
        result: expect.objectContaining({ cancelled: true })
      })
    );

    resolveApi?.();
    await firstPromise;
  });

  it('applies adaptors during submitForm api execution', async () => {
    const fetchCalls: ApiObject[] = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiObject) => {
          fetchCalls.push(api);
          return {
            ok: true,
            status: 200,
            data: {
              payload: {
                saved: true,
                username: 'Alice'
              }
            } as T
          };
        }
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ token: 'page-token' });
    const form = runtime.createFormRuntime({
      id: 'profile-form',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page
    });

    const result = await runtime.dispatch(
      {
        action: 'submitForm',
        api: {
          url: '/api/profile',
          method: 'post',
          requestAdaptor: 'return {headers: {Authorization: scope.token}, data: {formUser: scope.username}};',
          responseAdaptor: 'return payload.payload;'
        }
      },
      {
        runtime,
        scope: form.scope,
        page,
        form
      }
    );

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toMatchObject({
      headers: {
        Authorization: 'page-token'
      },
      data: {
        formUser: 'Alice'
      }
    });
    expect(result).toMatchObject({
      ok: true,
      data: {
        saved: true,
        username: 'Alice'
      }
    });
  });

  it('applies compile plugins before and after schema compilation', () => {
    const plugin: RendererPlugin = {
      name: 'compile-hooks',
      beforeCompile(schema) {
        if (Array.isArray(schema) || schema.type !== 'text') {
          return schema;
        }

        return {
          ...schema,
          text: 'Prepared text'
        };
      },
      afterCompile(node) {
        if (Array.isArray(node)) {
          return node;
        }

        return {
          ...node,
          props: createExpressionCompiler(createFormulaCompiler()).compileValue({
            ...node.schema,
            text: 'Prepared text + compiled'
          })
        };
      }
    };
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      plugins: [plugin],
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const node = runtime.compile({
      type: 'text',
      text: 'Original text'
    }) as any;
    const page = runtime.createPageRuntime({});
    const resolved = runtime.resolveNodeProps(node, page.scope, node.createRuntimeState());

    expect(resolved.value.text).toBe('Prepared text + compiled');
  });
});
