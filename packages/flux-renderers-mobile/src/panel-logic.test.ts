import { describe, expect, it } from 'vitest';
import {
  bubbleSnapX,
  shouldScrollContent,
  snapToAnchor,
} from './panel-logic.js';

describe('panel-logic (plan 666 Phase 1)', () => {
  describe('snapToAnchor', () => {
    it('snaps to the nearest anchor', () => {
      expect(snapToAnchor(190, [120, 240, 380])).toBe(240);
      expect(snapToAnchor(90, [120, 240, 380])).toBe(120);
    });

    it('breaks ties toward the earlier (lower) anchor', () => {
      expect(snapToAnchor(180, [120, 240])).toBe(120);
    });

    it('returns the offset for an empty anchor list', () => {
      expect(snapToAnchor(150, [])).toBe(150);
    });
  });

  describe('shouldScrollContent (8-cell arbitration table, deltaY>0 = pull down)', () => {
    it('panel NOT at top: never scrolls content regardless of direction/scrollTop (4 cells)', () => {
      expect(shouldScrollContent({ panelAtTop: false, contentScrollTop: 0, deltaY: 10 })).toBe(false);
      expect(shouldScrollContent({ panelAtTop: false, contentScrollTop: 0, deltaY: -10 })).toBe(false);
      expect(shouldScrollContent({ panelAtTop: false, contentScrollTop: 40, deltaY: 10 })).toBe(false);
      expect(shouldScrollContent({ panelAtTop: false, contentScrollTop: 40, deltaY: -10 })).toBe(false);
    });

    it('panel at top + pulling up: scrolls content whether or not it is scrolled (2 cells)', () => {
      expect(shouldScrollContent({ panelAtTop: true, contentScrollTop: 0, deltaY: -10 })).toBe(true);
      expect(shouldScrollContent({ panelAtTop: true, contentScrollTop: 40, deltaY: -10 })).toBe(true);
    });

    it('panel at top + pull down + content scrolled: scrolls content up', () => {
      expect(shouldScrollContent({ panelAtTop: true, contentScrollTop: 40, deltaY: 10 })).toBe(true);
    });

    it('panel at top + pull down + content at top: drags the panel down (collapse)', () => {
      expect(shouldScrollContent({ panelAtTop: true, contentScrollTop: 0, deltaY: 10 })).toBe(false);
    });

    it('mid-gesture handoff: scrollTop reaching 0 flips the same continuing pull to panel drag', () => {
      // same gesture, two consecutive touchmoves
      const first = shouldScrollContent({ panelAtTop: true, contentScrollTop: 30, deltaY: 10 });
      const second = shouldScrollContent({ panelAtTop: true, contentScrollTop: 0, deltaY: 10 });
      expect(first).toBe(true);
      expect(second).toBe(false);
    });
  });

  describe('bubbleSnapX', () => {
    it('magnetizes to the nearest horizontal edge', () => {
      expect(bubbleSnapX(10, 48, 390)).toBe(0);
      expect(bubbleSnapX(300, 48, 390)).toBe(342); // 390 - 48
      // midpoint ties toward the left edge
      expect(bubbleSnapX(171, 48, 390)).toBe(0);
    });
  });
});
