import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROW_HEIGHT,
  WHEEL_INERTIA_TRIGGER_MS,
  WHEEL_INERTIA_TRIGGER_PX,
  clampIndex,
  indexForOffset,
  momentumTargetIndex,
  offsetForIndex,
} from './wheel-column-logic.js';

describe('wheel-column-logic (plan 665 Phase 1)', () => {
  it('exposes the documented constants (vant/arco/nutui inertia params)', () => {
    expect(WHEEL_INERTIA_TRIGGER_MS).toBe(300);
    expect(WHEEL_INERTIA_TRIGGER_PX).toBe(15);
    expect(DEFAULT_ROW_HEIGHT).toBe(44);
  });

  describe('offsetForIndex / indexForOffset', () => {
    it('maps index 0 to offset 0 and index n to -n·rowHeight (strip moves up)', () => {
      expect(offsetForIndex(0, 44)).toBe(0);
      expect(offsetForIndex(3, 44)).toBe(-132);
    });

    it('rounds the offset back to the nearest index (snap)', () => {
      expect(indexForOffset(-132, 10, 44)).toBe(3);
      expect(indexForOffset(-120, 10, 44)).toBe(3); // 2.72 rounds to 3
      expect(indexForOffset(-105, 10, 44)).toBe(2); // 2.39 rounds to 2
    });

    it('clamps out-of-range offsets into [0, rowCount-1]', () => {
      expect(indexForOffset(50, 10, 44)).toBe(0);
      expect(indexForOffset(-1000, 10, 44)).toBe(9);
      expect(indexForOffset(-500, 0, 44)).toBe(0);
    });
  });

  describe('clampIndex', () => {
    it('clamps into [0, rowCount-1] and yields 0 for empty columns', () => {
      expect(clampIndex(-1, 5)).toBe(0);
      expect(clampIndex(5, 5)).toBe(4);
      expect(clampIndex(2, 5)).toBe(2);
      expect(clampIndex(3, 0)).toBe(0);
    });
  });

  describe('momentumTargetIndex', () => {
    const ROWS = 20;
    const releaseAt = (index: number) => -index * 44;

    it('keeps the release index for slow long-press drags (below inertia trigger)', () => {
      // 200ms gesture, 10px travel: below 300ms/15px trigger
      const target = momentumTargetIndex({
        releaseOffset: releaseAt(4),
        velocityPxMs: 0.6,
        gestureDurationMs: 200,
        travelPx: 10,
        rowCount: ROWS,
        rowHeight: 44,
      });
      expect(target).toBe(4);
    });

    it('projects the fling distance from the release velocity (v/0.003) and snaps nearest', () => {
      // release at index 4, finger flicking DOWN (velocityY > 0 → strip moves
      // down → index decreases): 0.5 px/ms → 166.7px ≈ 3.79 rows → nearest 4
      const target = momentumTargetIndex({
        releaseOffset: releaseAt(4),
        velocityPxMs: 0.5,
        gestureDurationMs: 120,
        travelPx: 90,
        rowCount: ROWS,
        rowHeight: 44,
      });
      expect(target).toBe(0); // 4 - 3.79 → 0.21 → nearest index 0
    });

    it('flings forward (finger up, negative velocity) toward higher indices', () => {
      const target = momentumTargetIndex({
        releaseOffset: releaseAt(4),
        velocityPxMs: -0.5,
        gestureDurationMs: 120,
        travelPx: -90,
        rowCount: ROWS,
        rowHeight: 44,
      });
      // 4 + 3.79 → 7.79 → nearest 8
      expect(target).toBe(8);
    });

    it('clamps the projected target into the column bounds', () => {
      const target = momentumTargetIndex({
        releaseOffset: releaseAt(18),
        velocityPxMs: -2,
        gestureDurationMs: 100,
        travelPx: -200,
        rowCount: ROWS,
        rowHeight: 44,
      });
      expect(target).toBe(ROWS - 1);
    });
  });
});
