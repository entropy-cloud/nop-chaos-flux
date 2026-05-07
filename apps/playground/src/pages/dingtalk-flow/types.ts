import type { Node, Edge } from '@xyflow/react';

export const CONNECTOR_COLOR = '#cacaca';
export const W = 220;
export const CARD_H = 72;
export const TITLE_H = 24;
export const BTN_DIAMETER = 28;
export const BTN_DIST = 36;
export const ROW_STEP = 156;
export const BRANCH_EXTRA = 47;
export const MERGE_EXTRA = 86;
export const BRANCH_W = 260;
export const END_W = 80;
export const BRANCH_SHORT_LEG = 32;
export const MERGE_SHORT_LEG = 84;

export const COLORS = {
  promoter: '#576a95',
  approval: '#ff943e',
  cc: '#3296fa',
  condition: '#15bc83',
} as const;

export type EdgeLeg = 'near-target' | 'near-source';

export interface ApprovalData {
  label: string;
  desc: string;
  color: string;
  icon: 'user' | 'user-check' | 'send';
  showAddBtn: boolean;
}

export interface CondData {
  title: string;
  desc: string;
  priority: number;
  showAddBtn: boolean;
}

export interface EndData {
  [k: string]: unknown;
}

export interface PopoverState {
  sourceId: string;
  screenX: number;
  screenY: number;
}

export type AddType = 'approver' | 'cc' | 'condition';

export interface BranchOverlay {
  x: number;
  y: number;
  type: 'addCondition' | 'mergeAdd';
  sourceId: string;
}

export interface FlowData {
  nodes: Node[];
  edges: Edge[];
  overlays: BranchOverlay[];
}
