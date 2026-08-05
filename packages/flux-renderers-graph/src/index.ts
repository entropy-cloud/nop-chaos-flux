import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { graphRendererDefinitions } from './graph-definitions.js';

export type {
  GraphSchema,
  GraphNode,
  GraphEdge,
  GraphLayout,
  GraphOrientation,
  GraphLevel,
} from './schemas.js';

export { graphRendererDefinitions } from './graph-definitions.js';

export function registerGraphRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, graphRendererDefinitions);
}
