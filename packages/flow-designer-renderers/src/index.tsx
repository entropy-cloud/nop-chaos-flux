import './designer-theme.css';
import {
  isPlainObject,
  isSchemaInput,
  registerRendererDefinitions,
  type FieldCompileContext,
  type RendererDefinition,
  type RendererRegistry,
} from '@nop-chaos/flux-core';
import {
  DesignerPageRenderer,
  DesignerCanvasRenderer,
  DesignerPaletteRenderer,
} from './designer-page.js';
import { DesignerFieldRenderer } from './designer-field.js';
import { designerHostContract } from './designer-manifest.js';

function compileDesignerConfig(value: unknown, context: FieldCompileContext): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      compileDesignerConfig(item, { ...context, sourcePath: `${context.sourcePath}.${index}` }),
    );
  }

  if (!isPlainObject(value)) {
    return context.compileValue(value);
  }

  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(record)) {
    const childPath = `${context.sourcePath}.${key}`;

    if (isSchemaInput(child)) {
      result[key] = child;
      continue;
    }

    result[key] = compileDesignerConfig(child, {
      ...context,
      sourcePath: childPath,
    });
  }

  return result;
}

export * from './schemas.js';
export { createDesignerActionProvider } from './designer-action-provider.js';
export {
  FLOW_DESIGNER_MANIFEST_V1,
  resolveDesignerManifest,
  designerHostContract,
  DESIGNER_CAPABILITY_PUBLICATION,
} from './designer-manifest.js';

export const flowDesignerRendererDefinitions: RendererDefinition[] = [
  {
    type: 'designer-page',
    component: DesignerPageRenderer,
    displayName: 'Designer Page',
    sourcePackage: '@nop-chaos/flow-designer-renderers',
    rendererClass: 'domain-host-renderer',
    rendererTraits: ['workbench-shell', 'builder-facing'],
    propContracts: {
      statusPath: {
        shape: { kind: 'string' },
        displayName: 'Status Path',
        description: 'Publishes designer host summary outside the host boundary.',
        editorType: 'path',
      },
      document: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Document',
        description: 'Initial designer graph document.',
        editorType: 'object',
      },
      treeDocument: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Tree Document',
        description: 'Initial designer tree document for tree mode.',
        editorType: 'object',
      },
      config: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Config',
        description: 'Designer host configuration.',
        editorType: 'designer-config',
        required: true,
      },
    },
    scopeExportContracts: {
      $designer: {
        kind: 'object',
        fields: {
          kind: { kind: 'literal', value: 'designer' },
          dirty: { kind: 'boolean' },
          busy: { kind: 'boolean' },
          canUndo: { kind: 'boolean' },
          canRedo: { kind: 'boolean' },
          selectionKind: {
            kind: 'union',
            anyOf: [
              { kind: 'literal', value: 'node' },
              { kind: 'literal', value: 'edge' },
              { kind: 'literal', value: 'none' },
            ],
          },
          selectionCount: { kind: 'number' },
        },
      },
    },
    fields: [
      { key: 'statusPath', kind: 'prop' },
      { key: 'document', kind: 'prop' },
      { key: 'treeDocument', kind: 'prop' },
      { key: 'config', kind: 'prop', compile: compileDesignerConfig },
      { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
      { key: 'inspector', kind: 'region', regionKey: 'inspector' },
      { key: 'dialogs', kind: 'region', regionKey: 'dialogs' },
    ],
    actionScopePolicy: 'new',
    hostContract: designerHostContract,
  },
  {
    type: 'designer-field',
    component: DesignerFieldRenderer,
    fields: [
      { key: 'label', kind: 'value-or-region', regionKey: 'label' },
      { key: 'name', kind: 'prop' },
      { key: 'fieldType', kind: 'prop' },
      { key: 'options', kind: 'prop' },
    ],
  },
  {
    type: 'designer-canvas',
    component: DesignerCanvasRenderer,
    fields: [{ key: 'className', kind: 'prop' }],
  },
  {
    type: 'designer-palette',
    component: DesignerPaletteRenderer,
    fields: [{ key: 'className', kind: 'prop' }],
  },
];

export function registerFlowDesignerRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, flowDesignerRendererDefinitions);
}

export function createFlowDesignerRegistry(baseRegistry: RendererRegistry): RendererRegistry {
  return registerFlowDesignerRenderers(baseRegistry);
}
