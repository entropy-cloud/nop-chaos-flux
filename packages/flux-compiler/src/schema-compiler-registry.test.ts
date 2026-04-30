import { describe, expect, it, vi } from 'vitest';
import {
  createRendererRegistry,
  type RendererDefinition
} from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from './index';

const crudAuthoringTransform = (context: import('@nop-chaos/flux-core').RendererAuthoringTransformContext<import('@nop-chaos/flux-core').BaseSchema>) => {
  if (context.schema.type !== 'crud') {
    return context.schema;
  }

  const schema = context.schema as Record<string, unknown>;
  const nextSchema: Record<string, unknown> = { ...schema };

  if (nextSchema.filter !== undefined && nextSchema.queryForm === undefined) {
    nextSchema.queryForm = nextSchema.filter;
  }

  if (nextSchema.primaryField !== undefined && nextSchema.rowKey === undefined) {
    nextSchema.rowKey = nextSchema.primaryField;
  }

  if (nextSchema.perPageField !== undefined && nextSchema.pageSizeField === undefined) {
    nextSchema.pageSizeField = nextSchema.perPageField;
  }

  delete nextSchema.filter;
  delete nextSchema.primaryField;
  delete nextSchema.perPageField;

  if (nextSchema.bulkActions === undefined) {
    return nextSchema as import('@nop-chaos/flux-core').BaseSchema;
  }

  if (nextSchema.listActions !== undefined) {
    const { bulkActions, ...rest } = nextSchema;
    void bulkActions;
    return rest as import('@nop-chaos/flux-core').BaseSchema;
  }

  const { bulkActions, ...rest } = nextSchema;
  return { ...rest, listActions: bulkActions } as unknown as import('@nop-chaos/flux-core').BaseSchema;
};

const tableRenderer: RendererDefinition = {
  type: 'table',
  component: () => null,
  fields: [
    { key: 'onRowClick', kind: 'event' },
    { key: 'onSortChange', kind: 'event' },
    { key: 'onFilterChange', kind: 'event' },
    { key: 'onPageChange', kind: 'event' },
    { key: 'onSelectionChange', kind: 'event' },
    { key: 'onRefresh', kind: 'event' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'loadingSlot', kind: 'value-or-region', regionKey: 'loadingSlot' }
  ]
};

const crudRenderer: RendererDefinition = {
  type: 'crud',
  component: () => null,
  rendererClass: 'flux-owner-renderer',
  rendererTraits: ['semantic-owner', 'composite'],
  authoringTransform: crudAuthoringTransform,
  fields: [
    { key: 'queryForm', kind: 'prop' },
    { key: 'toolbar', kind: 'region' },
    { key: 'listActions', kind: 'region' },
    { key: 'footerToolbar', kind: 'region' },
    { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
    { key: 'onRowClick', kind: 'event' },
    { key: 'onSelectionChange', kind: 'event' },
    { key: 'onRefresh', kind: 'event' }
  ]
};

const dataSourceRenderer: RendererDefinition = {
  type: 'data-source',
  component: () => null
};

const localDataRendererDefinitions: RendererDefinition[] = [
  tableRenderer,
  crudRenderer,
  dataSourceRenderer
];

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
        args: {
          path: 'message',
          value: 'clicked'
        }
      }
    });
    const node = compiled.root as any;

    expect(node.regions.onClick).toBeUndefined();
    expect(node.propsProgram.value.onClick).toBeUndefined();
    expect(node.eventPlans.onClick).toMatchObject({
      isFullyStatic: true,
      nodes: [
        expect.objectContaining({
          action: 'setValue',
          payload: expect.objectContaining({
            args: expect.objectContaining({
              isStatic: true,
              value: expect.objectContaining({
                path: 'message',
                value: 'clicked'
              })
            })
          })
        })
      ]
    });
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
      onMount: {
        isFullyStatic: true,
        nodes: [expect.objectContaining({ action: 'probe:mount' })]
      },
      onUnmount: {
        isFullyStatic: true,
        nodes: [expect.objectContaining({ action: 'probe:unmount' })]
      }
    });
    expect(node.eventPlans.onMount).toBeUndefined();
    expect(node.eventPlans.onUnmount).toBeUndefined();
  });

  it('applies renderer authoringTransform before compilation', () => {
    const transformedRenderer: RendererDefinition = {
      type: 'transform-probe',
      component: () => null,
      authoringTransform: ({ schema }) => {
        const next = { ...schema } as Record<string, unknown>;
        if (next.legacyLabel !== undefined && next.label === undefined) {
          next.label = next.legacyLabel;
          delete next.legacyLabel;
        }
        return next as any;
      },
      propContracts: {
        label: {
          shape: { kind: 'string' },
          displayName: 'Label'
        }
      }
    };

    const registry = createRendererRegistry([transformedRenderer]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'transform-probe',
      legacyLabel: 'hello'
    } as any);
    const node = compiled.root as any;

    expect(node.schema.label).toBe('hello');
    expect(node.schema.legacyLabel).toBeUndefined();
    expect(node.propsProgram.value.label).toBe('hello');
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
    const clickNode = buttonNode.eventPlans.onClick.nodes[0];
    expect(typeof formNode.templateNodeId).toBe('number');
    expect(clickNode.targeting.componentId).toBe('user-form');
    expect(clickNode.targeting._targetCid).toBeUndefined();
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
    expect(buttonNode.eventPlans.onClick.nodes[0].targeting._targetCid).toBeUndefined();
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

    expect(buttonNode.eventPlans.onClick.nodes[0].targeting.componentId).toBe('dup-form');
    expect(buttonNode.eventPlans.onClick.nodes[0].targeting._targetCid).toBeUndefined();
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

  it('extracts table column label fragments into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null
    };
    const textRendererLocal: RendererDefinition = {
      type: 'text',
      component: () => null
    };
    const registry = createRendererRegistry([tableRenderer, textRendererLocal]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'table',
      columns: [
        {
          label: { type: 'text', text: 'Member header' },
          name: 'name'
        }
      ]
    });
    const node = compiled.root as any;

    expect(node.regions['columns.0.label']?.node).toBeTruthy();
    expect(node.propsProgram.value.columns[0].label).toBeUndefined();
    expect(node.propsProgram.value.columns[0].labelRegionKey).toBe('columns.0.label');
  });

  it('extracts table column cell fragments into compiled regions', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null
    };
    const textRendererLocal: RendererDefinition = {
      type: 'text',
      component: () => null
    };
    const registry = createRendererRegistry([tableRenderer, textRendererLocal]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'table',
      columns: [
        {
          label: 'Member',
          name: 'name',
          cell: { type: 'text', text: 'User ${record.name}' }
        }
      ]
    });
    const node = compiled.root as any;

    expect(node.regions['columns.0.cell']?.node).toBeTruthy();
    expect(node.propsProgram.value.columns[0].cell).toBeUndefined();
    expect(node.propsProgram.value.columns[0].cellRegionKey).toBe('columns.0.cell');
  });

  it('canonicalizes crud migration aliases before compilation', () => {
    const registry = createRendererRegistry([...localDataRendererDefinitions]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'crud',
      filter: {
        body: [{ type: 'text', text: 'Query region' }]
      },
      primaryField: 'id',
      perPageField: 'pageSize',
      columns: [{ name: 'name', label: 'Name' }]
    } as any);
    const node = compiled.root as any;

    expect(node.schema.queryForm).toBeTruthy();
    expect(node.schema.rowKey).toBe('id');
    expect(node.schema.pageSizeField).toBe('pageSize');
    expect(node.schema.filter).toBeUndefined();
    expect(node.schema.primaryField).toBeUndefined();
    expect(node.schema.perPageField).toBeUndefined();
  });

  it('canonicalizes crud bulkActions to listActions before compilation', () => {
    const registry = createRendererRegistry([textRenderer, ...localDataRendererDefinitions]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'crud',
      bulkActions: [{ type: 'text', text: 'Delete selected' }],
      columns: [{ name: 'name', label: 'Name' }]
    } as any);
    const node = compiled.root as any;

    expect(node.schema.listActions).toEqual([{ type: 'text', text: 'Delete selected' }]);
    expect(node.schema.bulkActions).toBeUndefined();
  });

  it('keeps canonical crud fields when legacy aliases are also present', () => {
    const registry = createRendererRegistry([...localDataRendererDefinitions]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = compiler.compile({
      type: 'crud',
      filter: {
        body: [{ type: 'text', text: 'Legacy query region' }]
      },
      queryForm: {
        body: [{ type: 'text', text: 'Canonical query region' }]
      },
      primaryField: 'legacy-id',
      rowKey: 'canonical-id',
      perPageField: 'legacyPageSize',
      pageSizeField: 'canonicalPageSize',
      columns: [{ name: 'name', label: 'Name' }]
    } as any);
    const node = compiled.root as any;

    expect(node.schema.queryForm).toEqual({
      body: [{ type: 'text', text: 'Canonical query region' }]
    });
    expect(node.schema.rowKey).toBe('canonical-id');
    expect(node.schema.pageSizeField).toBe('canonicalPageSize');
    expect(node.schema.filter).toBeUndefined();
    expect(node.schema.primaryField).toBeUndefined();
    expect(node.schema.perPageField).toBeUndefined();
  });

  it('treats table empty as a plain prop or compiled region based on field metadata', () => {
    const tableRenderer: RendererDefinition = {
      type: 'table',
      component: () => null,
      fields: [{ key: 'empty', kind: 'value-or-region', regionKey: 'empty' }]
    };
    const textRendererLocal: RendererDefinition = {
      type: 'text',
      component: () => null
    };
    const registry = createRendererRegistry([tableRenderer, textRendererLocal]);
    const compiler = createSchemaCompiler({
      registry,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const plainCompiled = compiler.compile({
      type: 'table',
      empty: 'Nothing here'
    });
    const regionCompiled = compiler.compile({
      type: 'text',
      empty: { type: 'text', text: 'No rows' }
    } as any);
    const plainNode = plainCompiled.root as any;
    const regionNode = regionCompiled.root as any;

    expect(plainNode.propsProgram.value.empty).toBe('Nothing here');
    expect(plainNode.regions.empty).toBeUndefined();
    expect(regionNode.propsProgram?.value?.empty).toEqual({ type: 'text', text: 'No rows' });
    expect(regionNode.regions?.empty).toBeUndefined();
  });
});
