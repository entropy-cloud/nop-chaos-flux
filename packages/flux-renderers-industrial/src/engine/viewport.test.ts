import { describe, it, expect } from 'vitest';
import {
  center,
  clampScale,
  clampViewport,
  fit,
  MAX_SCALE,
  MIN_SCALE,
  setViewport,
  viewportToWorld,
  worldToViewport,
  zoomAt,
} from './viewport.js';

describe('viewport pure logic', () => {
  describe('worldToViewport / viewportToWorld', () => {
    it('should be inverses of each other', () => {
      const state = { x: 120, y: -40, scale: 2.5 };
      const world = { x: 330, y: 15 };
      const vp = worldToViewport(state, world);
      expect(vp.x).toBeCloseTo((330 - 120) * 2.5, 10);
      expect(vp.y).toBeCloseTo((15 - -40) * 2.5, 10);
      const back = viewportToWorld(state, vp);
      expect(back.x).toBeCloseTo(world.x, 10);
      expect(back.y).toBeCloseTo(world.y, 10);
    });

    it('should map viewport origin to state origin', () => {
      const state = { x: 50, y: 60, scale: 4 };
      const world = viewportToWorld(state, { x: 0, y: 0 });
      expect(world).toEqual({ x: 50, y: 60 });
    });
  });

  describe('fit', () => {
    it('should compute max proportional scale within viewport bounds', () => {
      const bounds = { x: 0, y: 0, width: 200, height: 100 };
      const result = fit(bounds, { width: 800, height: 600 }, 0);
      expect(result.scale).toBeCloseTo(4, 10);
      expect(result.x).toBeCloseTo(100 - 800 / (2 * 4), 10);
      expect(result.y).toBeCloseTo(50 - 600 / (2 * 4), 10);
    });

    it('should respect padding on both axes', () => {
      const bounds = { x: 0, y: 0, width: 200, height: 100 };
      const result = fit(bounds, { width: 800, height: 600 }, 50);
      expect(result.scale).toBeCloseTo(3.5, 10);
    });

    it('should clamp scale to min/max bounds', () => {
      const tiny = fit({ x: 0, y: 0, width: 1, height: 1 }, { width: 800, height: 600 }, 0);
      expect(tiny.scale).toBe(MAX_SCALE);
      const huge = fit({ x: 0, y: 0, width: 1e6, height: 1e6 }, { width: 800, height: 600 }, 0);
      expect(huge.scale).toBe(MIN_SCALE);
    });

    it('should center bounds in the viewport', () => {
      const bounds = { x: 100, y: 100, width: 200, height: 100 };
      const vp = { width: 400, height: 200 };
      const result = fit(bounds, vp, 0);
      const centerVp = worldToViewport(result, { x: 200, y: 150 });
      expect(centerVp.x).toBeCloseTo(200, 10);
      expect(centerVp.y).toBeCloseTo(100, 10);
    });
  });

  describe('center', () => {
    it('should keep scale and center bounds', () => {
      const state = { x: 0, y: 0, scale: 2 };
      const bounds = { x: 10, y: 20, width: 100, height: 50 };
      const result = center(state, bounds, { width: 400, height: 200 });
      expect(result.scale).toBe(2);
      expect(result.x).toBeCloseTo(60 - 100, 10);
      expect(result.y).toBeCloseTo(45 - 50, 10);
    });
  });

  describe('zoomAt', () => {
    it('should keep the anchor world point at the same viewport position', () => {
      const state = { x: 10, y: 10, scale: 1 };
      const worldPoint = { x: 50, y: 30 };
      const before = worldToViewport(state, worldPoint);
      const result = zoomAt(state, worldPoint, 2);
      expect(result.scale).toBe(2);
      const after = worldToViewport(result, worldPoint);
      expect(after.x).toBeCloseTo(before.x, 10);
      expect(after.y).toBeCloseTo(before.y, 10);
    });

    it('should clamp the resulting scale', () => {
      const state = { x: 0, y: 0, scale: 1 };
      expect(zoomAt(state, { x: 0, y: 0 }, 100).scale).toBe(MAX_SCALE);
      expect(zoomAt(state, { x: 0, y: 0 }, 0.001).scale).toBe(MIN_SCALE);
    });

    it('should return the same state when scale is already at a clamp bound', () => {
      const atMax = { x: 5, y: 6, scale: MAX_SCALE };
      expect(zoomAt(atMax, { x: 0, y: 0 }, 2)).toEqual({ x: 5, y: 6, scale: MAX_SCALE });
      const atMin = { x: 1, y: 2, scale: MIN_SCALE };
      expect(zoomAt(atMin, { x: 0, y: 0 }, 0.5)).toEqual({ x: 1, y: 2, scale: MIN_SCALE });
    });
  });

  describe('setViewport / clampViewport / clampScale', () => {
    it('should clamp an out-of-range scale and preserve scale anchor semantics', () => {
      const prev = { x: 0, y: 0, scale: 1 };
      const next = { x: 10, y: 20, scale: 500 };
      const result = setViewport(prev, next);
      expect(result.scale).toBe(MAX_SCALE);
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
    });

    it('should keep translation when scale unchanged', () => {
      const prev = { x: 1, y: 2, scale: 3 };
      const next = setViewport(prev, { x: 9, y: 8, scale: 3 });
      expect(next).toEqual({ x: 9, y: 8, scale: 3 });
    });

    it('should preserve the previous viewport origin world point when only scale changes', () => {
      const prev = { x: 100, y: 50, scale: 1 };
      const originWorld = viewportToWorld(prev, { x: 0, y: 0 });
      const next = setViewport(prev, { x: 100, y: 50, scale: 4 });
      const nextOrigin = viewportToWorld(next, { x: 0, y: 0 });
      expect(nextOrigin.x).toBeCloseTo(originWorld.x, 10);
      expect(nextOrigin.y).toBeCloseTo(originWorld.y, 10);
    });

    it('clampScale should clamp and sanitize non-finite input', () => {
      expect(clampScale(0.05)).toBe(MIN_SCALE);
      expect(clampScale(25)).toBe(MAX_SCALE);
      expect(clampScale(Number.NaN)).toBe(MIN_SCALE);
      expect(clampScale(Infinity)).toBe(MIN_SCALE);
    });

    it('clampViewport should clamp scale only', () => {
      expect(clampViewport({ x: 5, y: 6, scale: 0.01 })).toEqual({ x: 5, y: 6, scale: MIN_SCALE });
    });
  });
});
