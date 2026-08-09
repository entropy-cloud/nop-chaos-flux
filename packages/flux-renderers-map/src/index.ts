import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { mapRendererDefinitions } from './map-renderer-definitions.js';

export type {
  MapSchema,
  MapBasemapSchema,
  MapVisualMapSchema,
  MapRegionDatum,
  MapPinDatum,
  MapBuiltinGeojsonName,
  MapClickPayload,
  MapType,
} from './schemas.js';

export { mapRendererDefinitions } from './map-renderer-definitions.js';

export function registerMapRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, mapRendererDefinitions);
}
