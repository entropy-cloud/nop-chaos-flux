import './form-renderers.css';
import {
  registerRendererDefinitions,
  type RendererDefinition,
  type RendererRegistry,
} from '@nop-chaos/flux-core';
import { formRendererDefinition } from './renderers/form-definition.js';
import { inputRendererDefinitions } from './renderers/input.js';
import { fieldsetRendererDefinition } from './renderers/fieldset.js';

export { FormRenderer } from './renderers/form.js';
export { formRendererDefinition } from './renderers/form-definition.js';
export {
  createFieldValidation,
  createInputRenderer,
  inputRendererDefinitions,
} from './renderers/input.js';
export { fieldsetRendererDefinition } from './renderers/fieldset.js';
export * from './renderers/shared/index.js';
export * from './field-utils.js';
export * from './schemas.js';

export const formRendererDefinitions: RendererDefinition[] = [
  formRendererDefinition,
  fieldsetRendererDefinition,
  ...inputRendererDefinitions,
];

export function registerFormRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, formRendererDefinitions);
}
