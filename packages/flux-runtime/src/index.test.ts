import { describe, expect, it, vi } from 'vitest';
import {
  type RendererDefinition,
  type RendererEnv
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createRendererRegistry,
  createRendererRuntime,
  createSchemaCompiler
} from './index';

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
  it('fails fast on duplicate initial renderer definitions', () => {
    expect(() => createRendererRegistry([textRenderer, textRenderer])).toThrow(
      'Duplicate renderer definition for type "text"'
    );
  });

  it('rejects duplicate renderer registrations without explicit override', () => {
    const registry = createRendererRegistry([textRenderer]);

    expect(() => registry.register({ ...textRenderer, component: () => 'override' } as RendererDefinition)).toThrow(
      'Duplicate renderer definition for type "text"'
    );
  });

  it('allows explicit renderer overrides and warns when replacing definitions', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const registry = createRendererRegistry([textRenderer]);
      const override = { ...textRenderer, component: () => 'override' } as RendererDefinition;

      registry.register(override, { override: true });

      expect(registry.get('text')).toBe(override);
      expect(warnSpy).toHaveBeenCalledWith(
        '[RendererRegistry] Overriding renderer definition for type "text"'
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('preserves renderer metadata through the registry contract', () => {
    const metadataRenderer: RendererDefinition = {
      type: 'metadata-text',
      component: () => null,
      displayName: 'Metadata Text',
      category: 'content',
      icon: 'type',
      sourcePackage: '@nop-chaos/test-renderers',
      defaultSchema: {
        type: 'metadata-text',
        text: 'Hello'
      },
      propSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' }
        }
      }
    };
    const registry = createRendererRegistry([metadataRenderer]);

    expect(registry.get('metadata-text')).toMatchObject({
      displayName: 'Metadata Text',
      category: 'content',
      icon: 'type',
      sourcePackage: '@nop-chaos/test-renderers',
      defaultSchema: {
        type: 'metadata-text',
        text: 'Hello'
      },
      propSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' }
        }
      }
    });
  });

  it('compiles regions and dynamic props', () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'page',
      body: [{ type: 'text', text: '${message}' }]
    });

    expect(Array.isArray(compiled)).toBe(false);
    const root = compiled.root as any;
    expect(root.regions.body.node).toBeTruthy();
  });

  it('treats value-or-region fields as plain props when given plain values', () => {
    const registry = createRendererRegistry([cardRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'card',
      title: 'Profile',
      body: [{ type: 'text', text: 'body' }]
    });
    const node = compiled.root as any;

    expect(node.regions.title).toBeUndefined();
    expect(node.propsProgram.kind).toBe('static');
    expect(node.propsProgram.value.title).toBe('Profile');
  });

  it('treats value-or-region fields as compiled regions when given schema input', () => {
    const registry = createRendererRegistry([cardRenderer, textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile(
      {
        type: 'card',
        title: { type: 'text', text: 'Profile' },
        body: [{ type: 'text', text: 'body' }]
      } as any
    );
    const node = compiled.root as any;

    expect(node.regions.title.node).toBeTruthy();
    expect(node.propsProgram.kind).toBe('static');
    expect(node.propsProgram.value.title).toBeUndefined();
  });

  it('lets field metadata override default meta handling for title', () => {
    const registry = createRendererRegistry([cardRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = runtime.compile({
      type: 'card',
      title: 'Profile'
    });
    const node = compiled.root as any;
    const page = runtime.createPageRuntime({});
    const state = runtime.schemaCompiler.compileNode({ type: 'card', title: 'Profile' }, {
      path: '$',
      renderer: registry.get('card')!
    }).createRuntimeState();
    const meta = runtime.resolveNodeMeta(node, page.scope, state);

    expect((meta as unknown as Record<string, unknown>).title).toBeUndefined();
    expect(node.propsProgram.value.title).toBe('Profile');
  });

  it('delivers name through normalized props channel, not meta', () => {
    const registry = createRendererRegistry([inputRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'input-text',
      name: 'user.email'
    });
    const node = compiled.root as any;

    expect(node.propsProgram.value.name).toBe('user.email');
    expect((node.metaProgram as Record<string, unknown>).name).toBeUndefined();
  });

  it('tracks event fields separately from normal props and regions', () => {
    const registry = createRendererRegistry([actionButtonRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'action-button',
      onClick: {
        action: 'setValue',
        componentPath: 'message',
        value: 'clicked'
      }
    });
    const node = compiled.root as any;

    expect(node.regions.onClick).toBeUndefined();
    expect(node.propsProgram.value.onClick).toBeUndefined();
    expect(node.eventPlans.onClick).toMatchObject({ action: 'setValue' });
  });

  it('compiles lifecycle actions outside eventActions', () => {
    const registry = createRendererRegistry([textRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'text',
      text: 'Lifecycle text',
      onMount: { action: 'probe:mount' },
      onUnmount: { action: 'probe:unmount' }
    } as any);
    const node = compiled.root as any;

    expect(node.lifecycleActions).toEqual({
      onMount: { action: 'probe:mount' },
      onUnmount: { action: 'probe:unmount' }
    });
    expect(node.eventPlans.onMount).toBeUndefined();
    expect(node.eventPlans.onUnmount).toBeUndefined();
  });

  it('keeps componentId targets selector-based during compile even when the id is unique', () => {
    const registry = createRendererRegistry([pageRenderer, formRenderer, actionButtonRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'page',
      body: [
        { type: 'form', id: 'user-form', name: 'userForm' },
        {
          type: 'action-button',
          onClick: {
            action: 'component:validate',
            componentId: 'user-form'
          }
        }
      ]
    });
    const root = compiled.root as any;

    const bodyNodes = Array.isArray(root.regions.body.node) ? root.regions.body.node : [root.regions.body.node];
    const formNode = bodyNodes[0];
    const buttonNode = bodyNodes[1];
    expect(typeof formNode.templateNodeId).toBe('number');
    expect(buttonNode.eventPlans.onClick.componentId).toBe('user-form');
    expect(buttonNode.eventPlans.onClick._targetCid).toBeUndefined();
  });

  it('assigns template node identity to compiled nodes', () => {
    const registry = createRendererRegistry([pageRenderer, formRenderer, actionButtonRenderer]);
    const compiler = createSchemaCompiler({ registry });
    const compiled = compiler.compile({
      type: 'page',
      body: {
        type: 'form',
        id: 'user-form',
        actions: [
          {
            type: 'action-button',
            onClick: { action: 'component:validate', componentId: 'user-form' }
          }
        ]
      }
    });

    const root = compiled.root as any;
    const formNode = root.regions.body.node as any;
    const buttonNode = (formNode.regions.actions.node as any[])[0];

    expect(typeof root.templateNodeId).toBe('number');
    expect(typeof formNode.templateNodeId).toBe('number');
    expect(typeof buttonNode.templateNodeId).toBe('number');
  });

  it('does not pre-resolve componentName targets during compile', () => {
    const registry = createRendererRegistry([pageRenderer, formRenderer, actionButtonRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
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
    });
    const root = compiled.root as any;

    const bodyNodes = Array.isArray(root.regions.body.node) ? root.regions.body.node : [root.regions.body.node];
    const buttonNode = bodyNodes[1];
    expect(buttonNode.eventPlans.onClick._targetCid).toBeUndefined();
  });

  it('does not rewrite componentId targets during compile when duplicate ids exist', () => {
    const registry = createRendererRegistry([pageRenderer, formRenderer, actionButtonRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'page',
      body: [
        { type: 'form', id: 'dup-form' },
        { type: 'form', id: 'dup-form' },
        {
          type: 'action-button',
          onClick: {
            action: 'component:validate',
            componentId: 'dup-form'
          }
        }
      ]
    });
    const root = compiled.root as any;

    const bodyNodes = Array.isArray(root.regions.body.node) ? root.regions.body.node : [root.regions.body.node];
    const buttonNode = bodyNodes[2];

    expect(buttonNode.eventPlans.onClick.componentId).toBe('dup-form');
    expect(buttonNode.eventPlans.onClick._targetCid).toBeUndefined();
  });

  it('preserves xui:imports on compiled schema for runtime registration', () => {
    const registry = createRendererRegistry([importHostRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'import-host',
      'xui:imports': [
        {
          from: 'demo-lib',
          as: 'demo'
        }
      ]
    });
    const node = compiled.root as any;

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

    const compiled = compiler.compile({
      type: 'table',
      columns: [
        {
          type: 'operation',
          label: 'Actions',
          buttons: [{ type: 'button', label: 'Inspect' }]
        }
      ]
    });
    const node = compiled.root as any;

    expect(node.regions['columns.0.buttons']?.node).toBeTruthy();
    expect(node.propsProgram.value.columns[0].buttons).toBeUndefined();
    expect(node.propsProgram.value.columns[0].buttonsRegionKey).toBe('columns.0.buttons');
  });

});
