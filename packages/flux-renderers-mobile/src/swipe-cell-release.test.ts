import { describe, expect, it } from 'vitest';
import {
  FLICK_VELOCITY,
  MIN_FLICK_DELTA,
  OVERSWIPE_RATIO,
  THROW_FACTOR,
  resolveSwipeRelease,
} from './swipe-cell-release.js';

const BASE = {
  deltaX: 0,
  velocityX: 0,
  threshold: 30,
  leftWidth: 120,
  rightWidth: 90,
  openState: 'closed' as const,
  canSwipeLeft: true,
  canSwipeRight: true,
};

describe('swipe-cell release K-map (plan 664 Phase 5)', () => {
  it('exports the documented gesture constants', () => {
    expect(FLICK_VELOCITY).toBe(0.1);
    expect(THROW_FACTOR).toBe(50);
    expect(MIN_FLICK_DELTA).toBe(10);
    expect(OVERSWIPE_RATIO).toBe(1.15);
  });

  describe('closed start, allowed direction', () => {
    it('(a) overswipe wins the priority: |δ| >= 1.15×width -> action', () => {
      // rightward swipe reveals the LEFT region (width 120): 1.15×120 = 138
      const decision = resolveSwipeRelease({ ...BASE, deltaX: 138 });
      expect(decision).toEqual({ kind: 'action', side: 'open-left' });

      // leftward swipe reveals the RIGHT region (width 90): 1.15×90 = 103.5
      const leftDecision = resolveSwipeRelease({ ...BASE, deltaX: -103.5 });
      expect(leftDecision).toEqual({ kind: 'action', side: 'open-right' });
    });

    it('(b) |δ| >= threshold -> open', () => {
      expect(resolveSwipeRelease({ ...BASE, deltaX: 30 })).toEqual({
        kind: 'open',
        side: 'open-left',
      });
      expect(resolveSwipeRelease({ ...BASE, deltaX: -30 })).toEqual({
        kind: 'open',
        side: 'open-right',
      });
    });

    it('(c) flick toward the swipe with |δ| >= 10 opens even below threshold', () => {
      // 15px travel at 0.5 px/ms: old static-threshold implementation keeps
      // the cell closed (discriminative case for the M6 velocity upgrade)
      const decision = resolveSwipeRelease({ ...BASE, deltaX: 15, velocityX: 0.5 });
      expect(decision).toEqual({ kind: 'open', side: 'open-left' });

      const leftDecision = resolveSwipeRelease({ ...BASE, deltaX: -15, velocityX: -0.5 });
      expect(leftDecision).toEqual({ kind: 'open', side: 'open-right' });
    });

    it('(d) throw projection |δ| + |v|·50 >= width/2 opens without crossing threshold', () => {
      // 40px + 0.5·50 = 65 >= 120/2
      const decision = resolveSwipeRelease({ ...BASE, deltaX: 40, velocityX: 0.5 });
      expect(decision).toEqual({ kind: 'open', side: 'open-left' });
      expect(THROW_FACTOR).toBe(50);
    });

    it('(e) short slow travel decides nothing', () => {
      expect(resolveSwipeRelease({ ...BASE, deltaX: 20, velocityX: 0.05 })).toEqual({
        kind: 'none',
      });
      expect(resolveSwipeRelease({ ...BASE, deltaX: -20, velocityX: -0.05 })).toEqual({
        kind: 'none',
      });
    });

    it('velocity opposing the swipe never helps the throw/flick branches', () => {
      // 20px of travel (below threshold) with the finger decelerating backwards:
      // no flick, projection 20 + 0.5·50 = 45 < 120/2 -> nothing
      expect(resolveSwipeRelease({ ...BASE, deltaX: 20, velocityX: -0.5 })).toEqual({
        kind: 'none',
      });
    });

    it('overswipe measured on the travel direction only', () => {
      // big travel but backwards velocity: overswipe still triggers (raw travel rule)
      const decision = resolveSwipeRelease({ ...BASE, deltaX: 150, velocityX: -0.4 });
      expect(decision).toEqual({ kind: 'action', side: 'open-left' });
    });
  });

  describe('closed start, disallowed direction', () => {
    it('(disallowed) -> none regardless of travel or velocity', () => {
      expect(
        resolveSwipeRelease({
          ...BASE,
          deltaX: 200,
          velocityX: 0.5,
          canSwipeRight: false,
        }),
      ).toEqual({ kind: 'none' });
      expect(
        resolveSwipeRelease({
          ...BASE,
          deltaX: -200,
          velocityX: -0.5,
          canSwipeLeft: false,
        }),
      ).toEqual({ kind: 'none' });
    });
  });

  describe('open-left start (opening sign +1)', () => {
    it('(f) further opening past threshold stays open (old idempotent open)', () => {
      expect(
        resolveSwipeRelease({ ...BASE, deltaX: 40, openState: 'open-left' }),
      ).toEqual({ kind: 'open', side: 'open-left' });
    });

    it('(g) CHANGE ①: flick toward opening below threshold stays open (old rebounded closed)', () => {
      const decision = resolveSwipeRelease({
        ...BASE,
        deltaX: 20,
        velocityX: 0.5,
        openState: 'open-left',
      });
      expect(decision).toEqual({ kind: 'open', side: 'open-left' });
    });

    it('(h) small non-flick opening travel rebounds closed (unchanged)', () => {
      expect(
        resolveSwipeRelease({ ...BASE, deltaX: 20, velocityX: 0.05, openState: 'open-left' }),
      ).toEqual({ kind: 'close' });
    });

    it('(i) CHANGE ②: closing travel past threshold closes (old flipped to open-right)', () => {
      const decision = resolveSwipeRelease({
        ...BASE,
        deltaX: -40,
        openState: 'open-left',
      });
      expect(decision).toEqual({ kind: 'close' });
    });

    it('(i-disallowed) closing travel past threshold closes even without the opposite region', () => {
      const decision = resolveSwipeRelease({
        ...BASE,
        deltaX: -40,
        openState: 'open-left',
        canSwipeLeft: false,
      });
      expect(decision).toEqual({ kind: 'close' });
    });

    it('(j) CHANGE ③: quick closing flick below threshold closes (old stayed open)', () => {
      const decision = resolveSwipeRelease({
        ...BASE,
        deltaX: -20,
        velocityX: -0.5,
        openState: 'open-left',
      });
      expect(decision).toEqual({ kind: 'close' });
    });

    it('(k) slow sub-threshold closing travel keeps the cell open (unchanged)', () => {
      expect(
        resolveSwipeRelease({
          ...BASE,
          deltaX: -20,
          velocityX: -0.05,
          openState: 'open-left',
        }),
      ).toEqual({ kind: 'none' });
    });

    it('open start never triggers the overswipe action', () => {
      expect(
        resolveSwipeRelease({ ...BASE, deltaX: 200, openState: 'open-left' }),
      ).toEqual({ kind: 'open', side: 'open-left' });
    });
  });

  describe('open-right start (opening sign -1)', () => {
    it('mirrors the open-left grid', () => {
      expect(
        resolveSwipeRelease({ ...BASE, deltaX: -40, openState: 'open-right' }),
      ).toEqual({ kind: 'open', side: 'open-right' });
      expect(
        resolveSwipeRelease({ ...BASE, deltaX: 40, openState: 'open-right' }),
      ).toEqual({ kind: 'close' });
      expect(
        resolveSwipeRelease({ ...BASE, deltaX: 20, velocityX: 0.5, openState: 'open-right' }),
      ).toEqual({ kind: 'close' });
      expect(
        resolveSwipeRelease({ ...BASE, deltaX: -20, velocityX: -0.05, openState: 'open-right' }),
      ).toEqual({ kind: 'close' });
      expect(
        resolveSwipeRelease({ ...BASE, deltaX: -20, velocityX: -0.5, openState: 'open-right' }),
      ).toEqual({ kind: 'open', side: 'open-right' });
      expect(
        resolveSwipeRelease({ ...BASE, deltaX: 20, velocityX: 0.05, openState: 'open-right' }),
      ).toEqual({ kind: 'none' });
    });
  });

  it('zero-delta release while open keeps the current state', () => {
    expect(resolveSwipeRelease({ ...BASE, deltaX: 0, openState: 'open-left' })).toEqual({
      kind: 'none',
    });
    expect(resolveSwipeRelease({ ...BASE, deltaX: 0 })).toEqual({ kind: 'none' });
  });

  it('zero-width region never divides the overswipe/projected branches (falls back to threshold/flick)', () => {
    expect(
      resolveSwipeRelease({ ...BASE, deltaX: 30, leftWidth: 0 }),
    ).toEqual({ kind: 'open', side: 'open-left' });
    expect(
      resolveSwipeRelease({ ...BASE, deltaX: 15, velocityX: 0.5, leftWidth: 0 }),
    ).toEqual({ kind: 'open', side: 'open-left' });
  });
});
