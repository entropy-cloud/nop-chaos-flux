import React from 'react';
import {
  DesignerXyflowCanvas,
  type DesignerXyflowCanvasProps,
  DESIGNER_PALETTE_NODE_MIME,
} from './designer-xyflow-canvas/index.js';

export interface DesignerCanvasBridgeProps extends DesignerXyflowCanvasProps {}

export const DesignerXyflowCanvasBridge = DesignerXyflowCanvas;

export { DESIGNER_PALETTE_NODE_MIME };

export function renderDesignerCanvasBridge(props: DesignerCanvasBridgeProps) {
  return <DesignerXyflowCanvasBridge {...props} />;
}
