// plan 475 Phase 3：几何常量单源——以下常量自 flow-designer-core 的 tree-projection
// re-export（原双份手工同步副本收敛于此；CARD_W/CARD_H/TITLE_H 零消费方已删除）。
export {
  BTN_CENTER_DIST,
  BTN_DIAMETER,
  HANDLE_SIZE,
  CONTROL_CLEARANCE,
  CONNECTOR_CLEARANCE,
  OVERLAY_MAIN_TB,
  OVERLAY_MAIN_LR,
} from '@nop-chaos/flow-designer-core';

export const BTN_DIST = 36;
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
