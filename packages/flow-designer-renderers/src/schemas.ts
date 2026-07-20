import type { BaseSchema, SchemaInput } from '@nop-chaos/flux-core';
import type { DesignerConfig, GraphDocument, TreeDocument } from '@nop-chaos/flow-designer-core';

export interface DesignerPageSchemaInput {
  type: 'designer-page';
  id?: string;
  name?: string;
  label?: string;
  title?: string | SchemaInput;
  className?: string;
  visible?: boolean | string;
  hidden?: boolean | string;
  disabled?: boolean | string;
  config: DesignerConfig;
  document?: GraphDocument;
  treeDocument?: TreeDocument;
  statusPath?: string;
  readOnly?: boolean;
  toolbar?: SchemaInput;
  inspector?: SchemaInput;
  dialogs?: SchemaInput;
}

export type DesignerPageSchema = BaseSchema & DesignerPageSchemaInput;

export function defineDesignerPageSchema<T extends DesignerPageSchemaInput>(
  schema: T,
): T {
  return schema;
}

export interface DesignerFieldSchema extends BaseSchema {
  type: 'designer-field';
  fieldType?: 'text' | 'number' | 'select' | 'textarea';
  options?: Array<{ label: string; value: string }>;
}

export interface DesignerCanvasSchema extends BaseSchema {
  type: 'designer-canvas';
}

export interface DesignerPaletteSchema extends BaseSchema {
  type: 'designer-palette';
}

export interface DesignerNodeCardSchema extends BaseSchema {
  type: 'designer-node-card';
  nodeId?: string;
}

export interface DesignerEdgeRowSchema extends BaseSchema {
  type: 'designer-edge-row';
  edgeId?: string;
}
