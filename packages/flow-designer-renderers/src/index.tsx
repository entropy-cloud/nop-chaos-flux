import './designer-theme.css';
import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';
import { DesignerPageRenderer, DesignerCanvasRenderer, DesignerPaletteRenderer } from './designer-page';
import { DesignerFieldRenderer } from './designer-field';
import { designerHostContract } from './designer-manifest';

export * from './schemas';
export * from './designer-context';
export { createDesignerActionProvider } from './designer-action-provider';
export { DesignerPageRenderer, DesignerCanvasRenderer, DesignerPaletteRenderer } from './designer-page';
export { DesignerPaletteContent } from './designer-palette';
export { DesignerCanvasContent } from './designer-canvas';
export { DefaultInspector } from './designer-inspector';
export { DesignerFieldRenderer } from './designer-field';
export {
  DesignerXyflowCanvasBridge,
  renderDesignerCanvasBridge,
  type DesignerCanvasBridgeProps
} from './canvas-bridge';
export {
  DesignerXyflowCanvas,
  DesignerXyflowNode,
  DesignerXyflowEdge,
  renderPorts,
  useNodeTypeConfig,
  useEdgeTypeConfig,
  useNormalizedConfig,
  type DesignerXyflowCanvasProps,
  DESIGNER_PALETTE_NODE_MIME
} from './designer-xyflow-canvas';
export {
  FLOW_DESIGNER_MANIFEST_V1,
  resolveDesignerManifest,
  designerHostContract,
  DESIGNER_CAPABILITY_PUBLICATION
} from './designer-manifest';

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
        editorType: 'path'
      },
      document: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Document',
        description: 'Initial designer graph document.',
        editorType: 'object'
      },
      config: {
        shape: { kind: 'object', fields: {} },
        displayName: 'Config',
        description: 'Designer host configuration.',
        editorType: 'designer-config',
        required: true
      }
    },
    scopeExportContracts: {
      '$designer': {
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
              { kind: 'literal', value: 'none' }
            ]
          },
          selectionCount: { kind: 'number' }
        }
      }
    },
    regions: ['toolbar', 'inspector', 'dialogs'],
    actionScopePolicy: 'new',
    hostContract: designerHostContract
  },
  {
    type: 'designer-field',
    component: DesignerFieldRenderer
  },
  {
    type: 'designer-canvas',
    component: DesignerCanvasRenderer
  },
  {
    type: 'designer-palette',
    component: DesignerPaletteRenderer
  }
];

export function registerFlowDesignerRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, flowDesignerRendererDefinitions);
}

export function createFlowDesignerRegistry(baseRegistry: RendererRegistry): RendererRegistry {
  return registerFlowDesignerRenderers(baseRegistry);
}
