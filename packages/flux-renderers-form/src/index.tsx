import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';
import { arrayEditorRendererDefinition } from './renderers/array-editor';
import { conditionBuilderRendererDefinition } from './renderers/condition-builder/ConditionBuilder';
import { expressionEditorRendererDefinition } from './renderers/expression-editor';
import { formRendererDefinition } from './renderers/form';
import { inputRendererDefinitions } from './renderers/input';
import { keyValueRendererDefinition } from './renderers/key-value';
import { tagListRendererDefinition } from './renderers/tag-list';

export { ArrayEditorRenderer, arrayEditorRendererDefinition } from './renderers/array-editor';
export { ConditionBuilderRenderer, conditionBuilderRendererDefinition } from './renderers/condition-builder/ConditionBuilder';
export { ExpressionEditorRenderer, expressionEditorRendererDefinition } from './renderers/expression-editor';
export { FormRenderer, formRendererDefinition } from './renderers/form';
export { createFieldValidation, createInputRenderer, inputRendererDefinitions } from './renderers/input';
export { KeyValueRenderer, keyValueRendererDefinition } from './renderers/key-value';
export * from './renderers/shared';
export { TagListRenderer, tagListRendererDefinition } from './renderers/tag-list';
export * from './field-utils';
export * from './schemas';

export const formRendererDefinitions: RendererDefinition[] = [
  formRendererDefinition,
  ...inputRendererDefinitions,
  tagListRendererDefinition,
  keyValueRendererDefinition,
  arrayEditorRendererDefinition,
  conditionBuilderRendererDefinition,
  expressionEditorRendererDefinition
];

export function registerFormRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, formRendererDefinitions);
}

