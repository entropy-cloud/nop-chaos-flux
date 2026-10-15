import type { HostCapabilityProjectionManifest, RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaCompiler } from './index.js';

export const strictTextRenderer: RegisteredRendererDefinition = {
  type: 'strict-text',
  component: () => null,
  propContracts: {
    text: { shape: { kind: 'unknown' }, displayName: 'text' },
  },
  fields: [{ key: 'text', kind: 'prop' }],
};

export const actionHostRenderer: RegisteredRendererDefinition = {
  type: 'action-host',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }],
};

export const openRenderer: RegisteredRendererDefinition = {
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

export function createCompiler(...definitions: RegisteredRendererDefinition[]) {
  return createSchemaCompiler({
    registry: createRendererRegistry(definitions),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}
