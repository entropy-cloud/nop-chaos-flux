import { describe, expect, it } from 'vitest';
import {
  MOMENTUM_DECELERATION,
  MOMENTUM_MAX_DURATION,
  MOMENTUM_MIN_DURATION,
  RUBBERBAND_CONSTANT,
  momentumDistance,
  momentumDuration,
  nearest,
  quartEaseOut,
  rubberband,
} from './gesture-math.js';

describe('rubberband', () => {
  it('computes the use-gesture hyperbolic form (d·dim·c)/(dim+c·d)', () => {
    // (120·800·0.15)/(800+0.15·120) = 14400/818
    expect(rubberband(120, 800, 0.15)).toBeCloseTo(17.6039, 4);
  });

  it('defaults the constant to the shared RUBBERBAND_CONSTANT (0.15)', () => {
    expect(RUBBERBAND_CONSTANT).toBe(0.15);
    expect(rubberband(120, 800)).toBe(rubberband(120, 800, 0.15));
  });

  it('returns 0 for non-positive distance or dimension (defensive)', () => {
    expect(rubberband(0, 100)).toBe(0);
    expect(rubberband(-5, 100)).toBe(0);
    expect(rubberband(10, 0)).toBe(0);
    expect(rubberband(10, -3)).toBe(0);
  });

  it('saturates asymptotically at `dimension` and never exceeds it', () => {
    const saturated = rubberband(1_000_000, 100, 0.15);
    expect(saturated).toBeLessThan(100);
    expect(saturated).toBeCloseTo(99.9334, 3);
  });

  it('is monotonic in distance', () => {
    expect(rubberband(10, 60, 0.15)).toBeLessThan(rubberband(20, 60, 0.15));
    expect(rubberband(20, 60, 0.15)).toBeLessThan(rubberband(140, 60, 0.15));
  });
});

describe('nearest', () => {
  it('returns the closest anchor', () => {
    expect(nearest(5.1, [0, 10, 20])).toBe(10);
    expect(nearest(-5, [0, 10])).toBe(0);
    expect(nearest(100, [0, 10])).toBe(10);
    expect(nearest(3, [0, 10])).toBe(0);
  });

  it('breaks ties by first anchor', () => {
    expect(nearest(5, [0, 10, 20])).toBe(0);
  });

  it('returns the value unchanged for an empty anchor list', () => {
    expect(nearest(7, [])).toBe(7);
  });
});

describe('momentumDistance', () => {
  it('divides velocity by the shared deceleration (vant/arco/nutui 0.003)', () => {
    expect(MOMENTUM_DECELERATION).toBe(0.003);
    expect(momentumDistance(0.5)).toBeCloseTo(166.6667, 3);
  });

  it('preserves the sign of velocity', () => {
    expect(momentumDistance(-0.4)).toBeCloseTo(-133.3333, 3);
  });

  it('accepts an explicit deceleration', () => {
    expect(momentumDistance(0.5, 0.01)).toBeCloseTo(50, 6);
  });

  it('is 0 for zero velocity', () => {
    expect(momentumDistance(0)).toBe(0);
  });
});

describe('momentumDuration', () => {
  it('derives the linear-decel stop time 2/0.003 ≈ 666.67ms inside the clamp band', () => {
    expect(momentumDuration(0.5)).toBeCloseTo(666.6667, 3);
  });

  it('clamps to the minimum duration for fast deceleration', () => {
    expect(MOMENTUM_MIN_DURATION).toBe(300);
    expect(momentumDuration(0.5, 0.5)).toBe(MOMENTUM_MIN_DURATION);
  });

  it('clamps to the maximum duration for very low deceleration', () => {
    expect(MOMENTUM_MAX_DURATION).toBe(1000);
    expect(momentumDuration(0.5, 0.0005)).toBe(MOMENTUM_MAX_DURATION);
  });

  it('falls back to the minimum duration for zero velocity', () => {
    expect(momentumDuration(0)).toBe(MOMENTUM_MIN_DURATION);
  });
});

describe('quartEaseOut', () => {
  it('maps the domain endpoints exactly', () => {
    expect(quartEaseOut(0)).toBe(0);
    expect(quartEaseOut(1)).toBe(1);
  });

  it('computes 1-(1-t)^4 at the midpoint', () => {
    expect(quartEaseOut(0.5)).toBeCloseTo(0.9375, 6);
  });

  it('clamps out-of-range progress', () => {
    expect(quartEaseOut(-1)).toBe(0);
    expect(quartEaseOut(2)).toBe(1);
  });
});
