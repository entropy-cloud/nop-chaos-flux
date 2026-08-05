export const CARD_W = 220;
export const CARD_H = 72;
export const TITLE_H = 24;
export const BTN_DIAMETER = 28;
export const BTN_DIST = 36;
export const BTN_CENTER_DIST = 36;
export const HANDLE_SIZE = 12;
export const CONNECTOR_CLEARANCE = 8;
export const CONTROL_CLEARANCE = 4;
export const OVERLAY_MAIN_TB = 26;
export const OVERLAY_MAIN_LR = 96;
export const OVERLAY_CROSS_SIZE = 96;
export const CONNECTOR_COLOR = 'var(--fd-edge-stroke, #cacaca)';
export const MIN_RENDERED_STROKE = 1;
export const MAX_RENDERED_STROKE = 4;

export type EdgeLeg = 'near-target' | 'near-source';

export interface DingFlowOverlay {
  id: string;
  x: number;
  y: number;
  kind: 'addCondition' | 'mergeAdd';
  sourceId: string;
}
