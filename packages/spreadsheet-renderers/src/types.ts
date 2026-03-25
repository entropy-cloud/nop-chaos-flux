import type { BaseSchema } from '@nop-chaos/flux-core';
import type { SpreadsheetConfig, SpreadsheetDocument } from '@nop-chaos/spreadsheet-core';

export interface SpreadsheetPageSchemaInput {
  type: 'spreadsheet-page';
  id?: string;
  name?: string;
  label?: string;
  title?: string;
  className?: string;
  visible?: boolean | string;
  hidden?: boolean | string;
  disabled?: boolean | string;
  document: SpreadsheetDocument;
  config?: SpreadsheetConfig;
  readonly?: boolean;
  toolbar?: BaseSchema | BaseSchema[];
  body?: BaseSchema | BaseSchema[];
  dialogs?: BaseSchema | BaseSchema[];
}

export type SpreadsheetPageSchema = BaseSchema & SpreadsheetPageSchemaInput;

export function defineSpreadsheetPageSchema<T extends SpreadsheetPageSchemaInput>(schema: T): SpreadsheetPageSchema {
  return schema as unknown as SpreadsheetPageSchema;
}
