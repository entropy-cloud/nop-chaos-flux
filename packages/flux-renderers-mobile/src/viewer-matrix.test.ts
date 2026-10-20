import { describe, expect, it } from 'vitest';
import {
  clampScale,
  MAX_SCALE,
  MIN_SCALE,
  panClamp,
  pinchMatrix,
  resolveGesture,
} from './viewer-matrix.js';

const IDENTITY = { scale: 1, x: 0, y: 0 };

describe('viewer-matrix (plan 667 Phase 1)', () => {
  it('exposes the documented scale bounds', () => {
    expect(MIN_SCALE).toBe(1);
    expect(MAX_SCALE).toBe(4);
  });

  describe('clampScale', () => {
    it('clamps into [1, 4]', () => {
      expect(clampScale(0.5)).toBe(1);
      expect(clampScale(1)).toBe(1);
      expect(clampScale(2.5)).toBe(2.5);
      expect(clampScale(4)).toBe(4);
      expect(clampScale(9)).toBe(4);
    });
  });

  describe('pinchMatrix (anchor as fixed point)', () => {
    it('keeps the anchor visually fixed when scaling about a corner point', () => {
      // image pan 0, anchor at (100, 100): scaling 1→2 doubles the offset of
      // the anchor relative to the image origin; the anchor pixel stays put
      const next = pinchMatrix({ prev: IDENTITY, scale: 2, anchorX: 100, anchorY: 100 });
      expect(next).toEqual({ scale: 2, x: -100, y: -100 });
      // verify fixed point: translate' + s'·anchor = translate + s·anchor (anchor relative form)
      // visually: anchor (100,100) in the container maps to image point
      // ((100 - x')/s') = ((100+100)/2) = 100 == ((100-0)/1) ✓
    });

    it('re-anchors per move event (midpoint-follow): ratio applies from prev', () => {
      const first = pinchMatrix({ prev: IDENTITY, scale: 2, anchorX: 100, anchorY: 0 });
      const second = pinchMatrix({ prev: first, scale: 4, anchorX: 110, anchorY: 10 });
      expect(second.scale).toBe(4);
      // ratio 2: translate doubles the (anchor − translate) distance
      expect(second.x).toBeCloseTo(110 - (110 - first.x) * 2, 6);
      expect(second.y).toBeCloseTo(10 - (10 - first.y) * 2, 6);
    });

    it('clamps the requested scale before applying the ratio', () => {
      const next = pinchMatrix({ prev: IDENTITY, scale: 99, anchorX: 50, anchorY: 50 });
      expect(next.scale).toBe(4);
    });

    it('pinch back to scale 1 restores the identity pan', () => {
      const zoomed = pinchMatrix({ prev: IDENTITY, scale: 2, anchorX: 80, anchorY: 60 });
      const back = pinchMatrix({ prev: zoomed, scale: 1, anchorX: 80, anchorY: 60 });
      expect(back).toEqual({ scale: 1, x: 0, y: 0 });
    });
  });

  describe('panClamp', () => {
    it('at scale 1 the pan is clamped to 0 on a center-fit layout', () => {
      expect(panClamp({ scale: 1, x: 30, y: -40 }, 390, 500)).toEqual({ scale: 1, x: 0, y: 0 });
    });

    it('at scale 2 allows ±container/2 pan per axis', () => {
      const clamped = panClamp({ scale: 2, x: 999, y: -999 }, 390, 500);
      expect(clamped.x).toBe(195);
      expect(clamped.y).toBe(-250);
    });
  });

  describe('resolveGesture', () => {
    it('two pointers always pinch', () => {
      expect(resolveGesture({ pointerCount: 2, zoomed: false })).toEqual({ kind: 'pinch' });
      expect(resolveGesture({ pointerCount: 3, zoomed: true })).toEqual({ kind: 'pinch' });
    });

    it('single pointer while zoomed pans (paging frozen)', () => {
      expect(resolveGesture({ pointerCount: 1, zoomed: true })).toEqual({ kind: 'pan' });
    });

    it('single pointer unzoomed pages / pulls down', () => {
      expect(resolveGesture({ pointerCount: 1, zoomed: false })).toEqual({ kind: 'page' });
    });
  });
});
