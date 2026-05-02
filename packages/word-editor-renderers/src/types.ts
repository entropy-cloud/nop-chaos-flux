import type { ActionSchema, BaseSchema } from '@nop-chaos/flux-core';
import type { Dataset, DocChart, DocCode, WordDocument } from '@nop-chaos/word-editor-core';

export interface WordEditorPageSchemaInput {
  type: 'word-editor-page';
  id?: string;
  name?: string;
  label?: string;
  title?: string;
  className?: string;
  visible?: boolean | string;
  hidden?: boolean | string;
  disabled?: boolean | string;
  statusPath?: string;
  onBack?: ActionSchema;
  onSave?: ActionSchema;
  initialDocument?: WordDocument;
  datasets?: Dataset[];
  initialCharts?: DocChart[];
  initialCodes?: DocCode[];
  toolbar?: BaseSchema | BaseSchema[];
  leftPanel?: BaseSchema | BaseSchema[];
  rightPanel?: BaseSchema | BaseSchema[];
}

export type WordEditorPageSchema = BaseSchema & WordEditorPageSchemaInput;

export function defineWordEditorPageSchema<T extends WordEditorPageSchemaInput>(
  schema: T,
): WordEditorPageSchema {
  return schema as unknown as WordEditorPageSchema;
}
