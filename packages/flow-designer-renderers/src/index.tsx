import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';
import { DesignerPageRenderer, DesignerCanvasRenderer, DesignerPaletteRenderer } from './designer-page';
import { DesignerFieldRenderer } from './designer-field';

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

export const flowDesignerRendererDefinitions: RendererDefinition[] = [
  {
    type: 'designer-page',
    component: DesignerPageRenderer,
    regions: ['toolbar', 'inspector', 'dialogs'],
    actionScopePolicy: 'new'
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
