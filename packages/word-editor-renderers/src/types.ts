import type { ActionSchema, BaseSchema, SchemaInput } from '@nop-chaos/flux-core';
import type { Dataset, DocChart, DocCode, WordDocument } from '@nop-chaos/word-editor-core';

export interface WordEditorPanelConfig {
  generator?: 'default';
}

export interface WordEditorConfig {
  leftPanel?: WordEditorPanelConfig;
  rightPanel?: WordEditorPanelConfig;
}

export interface WordEditorPageSchemaInput {
  type: 'word-editor-page';
  id?: string;
  name?: string;
  label?: string;
  title?: string | SchemaInput;
  className?: string;
  visible?: boolean | string;
  hidden?: boolean | string;
  disabled?: boolean | string;
  statusPath?: string;
  config?: WordEditorConfig;
  readOnly?: boolean;
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
