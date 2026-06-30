import { registerRendererDefinitions, type RendererDefinition, type RendererRegistry } from '@nop-chaos/flux-core';
import { arrayEditorRendererDefinition } from './array-editor.js';
import { arrayFieldRendererDefinition } from './composite-field/array-field.js';
import { comboRendererDefinition } from './combo-renderer.js';
import { conditionBuilderRendererDefinition } from './condition-builder/condition-builder.js';
import { detailFieldRendererDefinition } from './detail-view/detail-field.js';
import { detailViewRendererDefinition } from './detail-view/detail-view.js';
import { editorRendererDefinition } from './editor-renderer.js';
import { inputFileRendererDefinition } from './input-file-renderer.js';
import { inputImageRendererDefinition } from './input-image-renderer.js';
import { inputTableRendererDefinition } from './input-table-renderer.js';
import { keyValueRendererDefinition } from './key-value.js';
import { objectFieldRendererDefinition } from './composite-field/object-field.js';
import { pickerRendererDefinition } from './picker-renderer.js';
import { tagListRendererDefinition } from './tag-list.js';
import { transferRendererDefinition } from './transfer-renderer.js';
import { treeControlRendererDefinitions } from './tree-controls.js';
import { variantFieldRendererDefinition } from './variant-field/variant-field.js';

export { ArrayEditorRenderer, arrayEditorRendererDefinition } from './array-editor.js';
export { ArrayFieldRenderer, arrayFieldRendererDefinition } from './composite-field/array-field.js';
export { ComboRenderer, comboRendererDefinition } from './combo-renderer.js';
export {
  ConditionBuilderRenderer,
  conditionBuilderRendererDefinition,
} from './condition-builder/condition-builder.js';
export { DetailFieldRenderer, detailFieldRendererDefinition } from './detail-view/detail-field.js';
export { DetailViewRenderer, detailViewRendererDefinition } from './detail-view/detail-view.js';
export { EditorRenderer, editorRendererDefinition } from './editor-renderer.js';
export { InputFileRenderer, inputFileRendererDefinition } from './input-file-renderer.js';
export { InputImageRenderer, inputImageRendererDefinition } from './input-image-renderer.js';
export { InputTableRenderer, inputTableRendererDefinition } from './input-table-renderer.js';
export { KeyValueRenderer, keyValueRendererDefinition } from './key-value.js';
export { ObjectFieldRenderer, objectFieldRendererDefinition } from './composite-field/object-field.js';
export { PickerRenderer, pickerRendererDefinition } from './picker-renderer.js';
export { TagListRenderer, tagListRendererDefinition } from './tag-list.js';
export { TransferRenderer, transferRendererDefinition } from './transfer-renderer.js';
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

// The `as RendererDefinition[]` cast is structurally required, not redundant:
// detail-field/detail-view definitions are typed as `RendererDefinition<DetailFieldSchema>`,
// and `ValidationContributor<S>` is invariant, so the specific-schema definitions are
// not assignable to `RendererDefinition<BaseSchema>[]` without it (verified: removing the
// cast fails the build with TS2322). The C-08 substantive change — using the shared
// `registerRendererDefinitions` helper — is in place below.
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
  comboRendererDefinition,
  inputTableRendererDefinition,
  transferRendererDefinition,
  pickerRendererDefinition,
] as RendererDefinition[];

export function registerFormAdvancedRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, formAdvancedRendererDefinitions);
}
