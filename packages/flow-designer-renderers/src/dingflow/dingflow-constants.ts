export const CARD_W = 220;
export const CARD_H = 72;
export const TITLE_H = 24;
export const BTN_DIAMETER = 28;
export const BTN_DIST = 36;
export const ROW_STEP = 156;
export const BRANCH_EXTRA = 47;
export const MERGE_EXTRA = 86;
export const BRANCH_W = 260;
export const BRANCH_SHORT_LEG = 32;
export const MERGE_SHORT_LEG = 84;
export const CONNECTOR_COLOR = 'var(--fd-edge-stroke, #cacaca)';

export type EdgeLeg = 'near-target' | 'near-source';

export interface DingFlowOverlay {
  id: string;
  x: number;
  y: number;
  kind: 'addCondition' | 'mergeAdd';
  sourceId: string;
}
