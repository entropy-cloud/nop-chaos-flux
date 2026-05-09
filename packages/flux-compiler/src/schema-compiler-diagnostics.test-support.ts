import type { HostCapabilityProjectionManifest, RendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from './index.js';

export const strictTextRenderer: RendererDefinition = {
  type: 'strict-text',
  component: () => null,
  propSchema: {
    text: { type: 'string' },
  },
  fields: [{ key: 'text', kind: 'prop' }],
};

export const actionHostRenderer: RendererDefinition = {
  type: 'action-host',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }],
};

export const openRenderer: RendererDefinition = {
  type: 'open-renderer',
  component: () => null,
  fields: [{ key: 'label', kind: 'prop' }],
};

export const designerManifest: HostCapabilityProjectionManifest = {
  family: 'designer',
  version: '1.0.0',
  projection: {
    fields: {
      doc: { schema: { kind: 'object', fields: {} } },
      activeNode: {
        schema: { kind: 'union', anyOf: [{ kind: 'null' }, { kind: 'object', fields: {} }] },
      },
    },
  },
  capabilities: {
    namespace: 'designer',
    methods: {
      addNode: {
        args: {
          kind: 'object',
          fields: {
            nodeType: { kind: 'string' },
          },
        },
      },
    },
  },
};

export function createCompiler(...definitions: RendererDefinition[]) {
  return createSchemaCompiler({
    registry: createRendererRegistry(definitions),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}
