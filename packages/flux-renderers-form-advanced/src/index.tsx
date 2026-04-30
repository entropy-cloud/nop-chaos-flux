import {
  registerRendererDefinitions,
  type RendererDefinition,
  type RendererRegistry,
} from '@nop-chaos/flux-core';
import { arrayEditorRendererDefinition } from './array-editor';
import { arrayFieldRendererDefinition } from './composite-field/array-field';
import { conditionBuilderRendererDefinition } from './condition-builder/condition-builder';
import { detailFieldRendererDefinition } from './detail-view/detail-field';
import { detailViewRendererDefinition } from './detail-view/detail-view';
import { keyValueRendererDefinition } from './key-value';
import { objectFieldRendererDefinition } from './composite-field/object-field';
import { tagListRendererDefinition } from './tag-list';
import { treeControlRendererDefinitions } from './tree-controls';
import { variantFieldRendererDefinition } from './variant-field/variant-field';

export { ArrayEditorRenderer, arrayEditorRendererDefinition } from './array-editor';
export { ArrayFieldRenderer, arrayFieldRendererDefinition } from './composite-field/array-field';
export {
  ConditionBuilderRenderer,
  conditionBuilderRendererDefinition,
} from './condition-builder/condition-builder';
export { DetailFieldRenderer, detailFieldRendererDefinition } from './detail-view/detail-field';
export { DetailViewRenderer, detailViewRendererDefinition } from './detail-view/detail-view';
export { KeyValueRenderer, keyValueRendererDefinition } from './key-value';
export { ObjectFieldRenderer, objectFieldRendererDefinition } from './composite-field/object-field';
export { TagListRenderer, tagListRendererDefinition } from './tag-list';
export { treeControlRendererDefinitions } from './tree-controls';
export {
  VariantFieldRenderer,
  variantFieldRendererDefinition,
} from './variant-field/variant-field';
export * from './composite-field/composite-schemas';
export * from './composite-field/composite-item-id';
export * from './tree-options';

export const formAdvancedRendererDefinitions: RendererDefinition[] = [
  ...treeControlRendererDefinitions,
  tagListRendererDefinition,
  keyValueRendererDefinition,
  arrayEditorRendererDefinition,
  conditionBuilderRendererDefinition,
  objectFieldRendererDefinition,
  arrayFieldRendererDefinition,
  variantFieldRendererDefinition,
  detailFieldRendererDefinition,
  detailViewRendererDefinition,
];

export function registerFormAdvancedRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, formAdvancedRendererDefinitions);
}
