import { describe, expect, it } from 'vitest';
import {
  BTN_CENTER_DIST as CORE_BTN_CENTER_DIST,
  BTN_DIAMETER as CORE_BTN_DIAMETER,
  CONNECTOR_CLEARANCE as CORE_CONNECTOR_CLEARANCE,
  CONTROL_CLEARANCE as CORE_CONTROL_CLEARANCE,
  HANDLE_SIZE as CORE_HANDLE_SIZE,
  OVERLAY_MAIN_LR as CORE_OVERLAY_MAIN_LR,
  OVERLAY_MAIN_TB as CORE_OVERLAY_MAIN_TB,
  MIN_SPLIT_GAP_LR,
  MIN_SPLIT_GAP_TB,
} from '@nop-chaos/flow-designer-core';
import {
  BTN_CENTER_DIST,
  BTN_DIAMETER,
  CONNECTOR_CLEARANCE,
  CONTROL_CLEARANCE,
  HANDLE_SIZE,
  OVERLAY_MAIN_LR,
  OVERLAY_MAIN_TB,
} from './dingflow-constants.js';

// plan 475 Phase 3：树常量单源同源性——renderers 的 dingflow-constants 必须 re-export
// core 的 tree-projection 几何常量（此前两包各持一份手工同步副本，存在漂移风险）。
describe('dingflow tree geometry constants single source', () => {
  it('re-exports the exact core tree-projection constants', () => {
    expect(BTN_CENTER_DIST).toBe(CORE_BTN_CENTER_DIST);
    expect(BTN_DIAMETER).toBe(CORE_BTN_DIAMETER);
    expect(HANDLE_SIZE).toBe(CORE_HANDLE_SIZE);
    expect(CONTROL_CLEARANCE).toBe(CORE_CONTROL_CLEARANCE);
    expect(CONNECTOR_CLEARANCE).toBe(CORE_CONNECTOR_CLEARANCE);
    expect(OVERLAY_MAIN_TB).toBe(CORE_OVERLAY_MAIN_TB);
    expect(OVERLAY_MAIN_LR).toBe(CORE_OVERLAY_MAIN_LR);
  });

  it('keeps the split-gap formulas derived from the same constants', () => {
    expect(MIN_SPLIT_GAP_TB).toBe(2 * (CORE_BTN_CENTER_DIST + CORE_BTN_DIAMETER / 2 + CORE_OVERLAY_MAIN_TB / 2 + CORE_CONTROL_CLEARANCE));
    expect(MIN_SPLIT_GAP_LR).toBe(2 * (CORE_BTN_CENTER_DIST + CORE_BTN_DIAMETER / 2 + CORE_OVERLAY_MAIN_LR / 2 + CORE_CONTROL_CLEARANCE));
  });
});
