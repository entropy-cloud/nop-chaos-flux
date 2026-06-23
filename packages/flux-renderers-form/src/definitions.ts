import {
  registerRendererDefinitions,
  type RendererDefinition,
  type RendererRegistry,
} from '@nop-chaos/flux-core';
import { fieldsetRendererDefinition } from './renderers/fieldset.js';
import { formRendererDefinition } from './renderers/form-definition.js';
import { inputRendererDefinitions } from './renderers/input.js';
import { dateRendererDefinitions } from './renderers/date-renderer-definitions.js';

export { formRendererDefinition } from './renderers/form-definition.js';
export { fieldsetRendererDefinition } from './renderers/fieldset.js';
export { inputRendererDefinitions } from './renderers/input.js';
export { dateRendererDefinitions } from './renderers/date-renderer-definitions.js';

export const formRendererDefinitions: RendererDefinition[] = [
  formRendererDefinition,
  fieldsetRendererDefinition,
  ...inputRendererDefinitions,
  ...dateRendererDefinitions,
];

export function registerFormRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, formRendererDefinitions);
}
