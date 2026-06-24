import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { arrayEditorRendererDefinition } from './array-editor.js';
import { arrayFieldRendererDefinition } from './composite-field/array-field.js';
import { conditionBuilderRendererDefinition } from './condition-builder/condition-builder.js';
import { detailFieldRendererDefinition } from './detail-view/detail-field.js';
import { detailViewRendererDefinition } from './detail-view/detail-view.js';
import { editorRendererDefinition } from './editor-renderer.js';
import { inputFileRendererDefinition } from './input-file-renderer.js';
import { inputImageRendererDefinition } from './input-image-renderer.js';
import { keyValueRendererDefinition } from './key-value.js';
import { objectFieldRendererDefinition } from './composite-field/object-field.js';
import { tagListRendererDefinition } from './tag-list.js';
import { treeControlRendererDefinitions } from './tree-controls.js';
import { variantFieldRendererDefinition } from './variant-field/variant-field.js';

export { ArrayEditorRenderer, arrayEditorRendererDefinition } from './array-editor.js';
export { ArrayFieldRenderer, arrayFieldRendererDefinition } from './composite-field/array-field.js';
export {
  ConditionBuilderRenderer,
  conditionBuilderRendererDefinition,
} from './condition-builder/condition-builder.js';
export { DetailFieldRenderer, detailFieldRendererDefinition } from './detail-view/detail-field.js';
export { DetailViewRenderer, detailViewRendererDefinition } from './detail-view/detail-view.js';
export { EditorRenderer, editorRendererDefinition } from './editor-renderer.js';
export { sanitizeEditorHtml } from './editor-renderer.js';
export { InputFileRenderer, inputFileRendererDefinition } from './input-file-renderer.js';
export { InputImageRenderer, inputImageRendererDefinition } from './input-image-renderer.js';
export { KeyValueRenderer, keyValueRendererDefinition } from './key-value.js';
export { ObjectFieldRenderer, objectFieldRendererDefinition } from './composite-field/object-field.js';
export { TagListRenderer, tagListRendererDefinition } from './tag-list.js';
export { treeControlRendererDefinitions } from './tree-controls.js';
export {
  VariantFieldRenderer,
  variantFieldRendererDefinition,
} from './variant-field/variant-field.js';
export type * from './condition-builder/types.js';
export type {
  InputFileSchema,
  InputImageSchema,
  UploadResultItem,
  UploadValueMode,
  UploadItemState,
} from './upload-schemas.js';
export type { EditorSchema, EditorToolbarButton } from './editor-schemas.js';
export {
  DEFAULT_EDITOR_TOOLBAR,
  resolveToolbarButtons,
} from './editor-schemas.js';
export {
  normalizeUploadValue,
  readUploadValue,
} from './upload-schemas.js';
export * from './composite-field/composite-schemas.js';
export * from './composite-field/composite-item-id.js';
export * from './tree-options.js';

export const formAdvancedRendererDefinitions = [
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
  editorRendererDefinition,
  inputFileRendererDefinition,
  inputImageRendererDefinition,
] as RendererDefinition[];

export function registerFormAdvancedRenderers(registry: RendererRegistry) {
  for (const definition of formAdvancedRendererDefinitions) {
    registry.register(definition as RendererDefinition);
  }
  return registry;
}
