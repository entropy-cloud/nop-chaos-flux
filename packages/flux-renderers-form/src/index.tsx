import './form-renderers.css';
import { registerRendererDefinitions, type RendererDefinition, type RendererRegistry } from '@nop-chaos/flux-core';
import { formRendererDefinition } from './renderers/form-definition';
import { inputRendererDefinitions } from './renderers/input';
import { fieldsetRendererDefinition } from './renderers/fieldset';

export { FormRenderer } from './renderers/form';
export { formRendererDefinition } from './renderers/form-definition';
export { createFieldValidation, createInputRenderer, inputRendererDefinitions } from './renderers/input';
export { fieldsetRendererDefinition } from './renderers/fieldset';
export * from './renderers/shared';
export * from './field-utils';
export * from './schemas';

export const formRendererDefinitions: RendererDefinition[] = [
  formRendererDefinition,
  fieldsetRendererDefinition,
  ...inputRendererDefinitions
];

export function registerFormRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, formRendererDefinitions);
}
