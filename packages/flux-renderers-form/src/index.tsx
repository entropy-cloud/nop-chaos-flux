import './form-renderers.css';
import { registerRendererDefinitions, type RendererDefinition, type RendererRegistry } from '@nop-chaos/flux-core';
import { formRendererDefinition } from './renderers/form';
import { inputRendererDefinitions } from './renderers/input';

export { FormRenderer, formRendererDefinition } from './renderers/form';
export { createFieldValidation, createInputRenderer, inputRendererDefinitions } from './renderers/input';
export * from './renderers/shared';
export * from './field-utils';
export * from './schemas';

export const formRendererDefinitions: RendererDefinition[] = [
  formRendererDefinition,
  ...inputRendererDefinitions
];

export function registerFormRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, formRendererDefinitions);
}
