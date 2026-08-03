import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { industrialRendererDefinitions } from './renderer-definitions.js';

export type { ScadaCanvasSchema, ScadaCanvasEvents } from './schemas.js';

export type { IndustrialRendererSchema } from './renderer-definitions.js';

export function registerScadaRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, industrialRendererDefinitions);
}
