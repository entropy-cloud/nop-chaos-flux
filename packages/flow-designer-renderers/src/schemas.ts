import type { BaseSchema } from '@nop-chaos/flux-core';
import type { DesignerCanvasAdapterKind } from './canvas-bridge';

export interface DesignerPageSchema extends BaseSchema {
  type: 'designer-page';
  canvasAdapter?: DesignerCanvasAdapterKind;
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
