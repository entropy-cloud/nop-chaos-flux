import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { registerBuiltinScadaSymbols } from './symbols/register-builtin.js';
import { industrialRendererDefinitions } from './renderer-definitions.js';

export type { ScadaCanvasSchema, ScadaCanvasEvents } from './schemas.js';
export type { ScadaConfig, ScadaSymbolNode, ScadaPointDeclaration, ScadaConfigDiff } from './serialization/config-types.js';
export type { ScadaSymbolDefinition, ScadaSymbolProps, ScadaSymbolStylePatch } from './symbols/symbol-types.js';

export { ScadaCanvasEngine, type ScadaEngineOptions } from './engine/scada-engine.js';
export { registerScadaSymbol, unregisterScadaSymbol, hasScadaSymbol } from './symbols/symbol-registry.js';
export { resolveSymbolStyle } from './symbols/style-resolver.js';
export {
  worldToViewport,
  viewportToWorld,
  fit,
  center,
  zoomAt,
  setViewport,
  MIN_SCALE,
  MAX_SCALE,
} from './engine/viewport.js';

export type { IndustrialRendererSchema } from './renderer-definitions.js';

registerBuiltinScadaSymbols();

export function registerScadaRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, industrialRendererDefinitions);
}
