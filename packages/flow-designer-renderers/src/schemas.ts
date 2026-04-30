import type { BaseSchema } from '@nop-chaos/flux-core';
import type { DesignerConfig, GraphDocument, TreeDocument } from '@nop-chaos/flow-designer-core';

export interface DesignerPageSchemaInput {
  type: 'designer-page';
  config?: DesignerConfig;
  document?: GraphDocument;
  treeDocument?: TreeDocument;
  statusPath?: string;
}

export type DesignerPageSchema = BaseSchema & DesignerPageSchemaInput;

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
