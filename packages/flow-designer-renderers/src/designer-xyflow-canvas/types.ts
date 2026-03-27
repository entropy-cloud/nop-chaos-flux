import { Position } from '@xyflow/react';

export interface DesignerFlowNodeData extends Record<string, unknown> {
  label: string;
  typeLabel: string;
  typeId: string;
}

export interface DesignerFlowEdgeData extends Record<string, unknown> {
  label: string;
  typeId: string;
}

export interface DesignerXyflowControlledViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface XyflowViewportChange {
  x?: number;
  y?: number;
  zoom?: number;
}

export const POSITION_MAP: Record<string, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left
};
