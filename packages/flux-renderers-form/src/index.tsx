import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';
import { arrayEditorRendererDefinition } from './renderers/array-editor';
import { arrayFieldRendererDefinition } from './renderers/array-field';
import { conditionBuilderRendererDefinition } from './renderers/condition-builder/ConditionBuilder';
import { detailFieldRendererDefinition } from './renderers/detail-field';
import { detailViewRendererDefinition } from './renderers/detail-view';
import { formRendererDefinition } from './renderers/form';
import { inputRendererDefinitions } from './renderers/input';
import { keyValueRendererDefinition } from './renderers/key-value';
import { objectFieldRendererDefinition } from './renderers/object-field';
import { tagListRendererDefinition } from './renderers/tag-list';
import { treeControlRendererDefinitions } from './renderers/tree-controls';
import { variantFieldRendererDefinition } from './renderers/variant-field';

export { ArrayEditorRenderer, arrayEditorRendererDefinition } from './renderers/array-editor';
export { ArrayFieldRenderer, arrayFieldRendererDefinition } from './renderers/array-field';
export { ConditionBuilderRenderer, conditionBuilderRendererDefinition } from './renderers/condition-builder/ConditionBuilder';
export { DetailFieldRenderer, detailFieldRendererDefinition } from './renderers/detail-field';
export { DetailViewRenderer, detailViewRendererDefinition } from './renderers/detail-view';
export { FormRenderer, formRendererDefinition } from './renderers/form';
export { createFieldValidation, createInputRenderer, inputRendererDefinitions } from './renderers/input';
export { KeyValueRenderer, keyValueRendererDefinition } from './renderers/key-value';
export { ObjectFieldRenderer, objectFieldRendererDefinition } from './renderers/object-field';
export * from './renderers/shared';
export { TagListRenderer, tagListRendererDefinition } from './renderers/tag-list';
export { treeControlRendererDefinitions } from './renderers/tree-controls';
export { VariantFieldRenderer, variantFieldRendererDefinition } from './renderers/variant-field';
export * from './field-utils';
export * from './schemas';
export * from './renderers/composite-schemas';

export const formRendererDefinitions: RendererDefinition[] = [
  formRendererDefinition,
  ...inputRendererDefinitions,
  ...treeControlRendererDefinitions,
  tagListRendererDefinition,
  keyValueRendererDefinition,
  arrayEditorRendererDefinition,
  conditionBuilderRendererDefinition,
  objectFieldRendererDefinition,
  arrayFieldRendererDefinition,
  variantFieldRendererDefinition,
  detailFieldRendererDefinition,
  detailViewRendererDefinition
];

export function registerFormRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, formRendererDefinitions);
}
