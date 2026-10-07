import { Position } from '@xyflow/react';

export interface DesignerFlowNodeData extends Record<string, unknown> {
  label: string;
  typeLabel: string;
  typeId: string;
  __fdTreeMode?: boolean;
  __fdBranchFocused?: boolean;
  /** plan 544 seed 1: outgoing main-axis gap (px) emitted by tree projection. */
  __fdChainGap?: number;
  /** plan 544 Phase 4: node owns a branch group (split source) — the in-node
   * chain plus-button is not rendered (the addCondition overlay owns that band;
   * insertBranchPair would overwrite existing branches). */
  __fdBranchGroupOwner?: boolean;
}

export interface DesignerFlowEdgeData extends Record<string, unknown> {
  label: string;
  typeId: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted' | string;
  __fdHovered?: boolean;
  __fdBranchFocused?: boolean;
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
  left: Position.Left,
};
