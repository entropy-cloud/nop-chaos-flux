import type { BaseSchema } from '@nop-chaos/flux-core';
import type {
  DesignerPageSchemaInputBase,
  SpreadsheetConfig,
  SpreadsheetDocument,
} from '@nop-chaos/spreadsheet-core';

export interface SpreadsheetPageSchemaInput extends DesignerPageSchemaInputBase {
  type: 'spreadsheet-page';
  document: SpreadsheetDocument;
  config?: SpreadsheetConfig;
  readOnly?: boolean;
  statusPath?: string;
  toolbar?: BaseSchema | BaseSchema[];
  body?: BaseSchema | BaseSchema[];
  dialogs?: BaseSchema | BaseSchema[];
}

export type SpreadsheetPageSchema = BaseSchema & SpreadsheetPageSchemaInput;

export function defineSpreadsheetPageSchema<T extends SpreadsheetPageSchemaInput>(
  schema: T,
): SpreadsheetPageSchema {
  return schema as unknown as SpreadsheetPageSchema;
}
