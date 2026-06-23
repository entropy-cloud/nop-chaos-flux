import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { contentRendererDefinitions } from './content-renderer-definitions.js';

export type {
  SeparatorSchema,
  SpinnerSchema,
  SpinnerSize,
  ProgressSchema,
  ProgressVariant,
  EmptySchema,
  CardSchema,
  CardVariant,
} from './schemas.js';

export { SeparatorRenderer } from './separator.js';
export { SpinnerRenderer } from './spinner.js';
export { ProgressRenderer, normalizeProgressValue, type NormalizedProgress } from './progress.js';
export { EmptyRenderer } from './empty.js';
export { CardRenderer } from './card.js';

export { contentRendererDefinitions } from './content-renderer-definitions.js';
export type { ContentRendererSchema } from './content-renderer-definitions.js';

export function registerContentRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, contentRendererDefinitions);
}
