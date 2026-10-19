/**
 * Shared gesture-math primitives for the mobile package (M6).
 *
 * Pure functions only — no DOM, no React, no time source. Consumers:
 * pull-refresh (over-pull damping), swipe-cell (over-drag damping +
 * throw projection), and the M7+ picker/panel families (momentum +
 * anchor snap).
 *
 * Algorithm sources: `docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md`
 * §5 (rubberband from use-gesture `maths.ts` / antd-mobile; momentum
 * deceleration 0.003 shared by vant/arco/nutui; quartEaseOut per TDesign
 * picker).
 */

export const RUBBERBAND_CONSTANT = 0.15;
export const MOMENTUM_DECELERATION = 0.003;
export const MOMENTUM_MIN_DURATION = 300;
export const MOMENTUM_MAX_DURATION = 1000;

/**
 * Hyperbolic rubber-band: visual displacement for `distance` of physical
 * travel beyond a boundary of size `dimension`. Saturates asymptotically at
 * `dimension` and never exceeds it. Non-positive inputs yield 0.
 */
export function rubberband(
  distance: number,
  dimension: number,
  constant: number = RUBBERBAND_CONSTANT,
): number {
  if (!(distance > 0) || !(dimension > 0)) return 0;
  const c = constant > 0 ? constant : RUBBERBAND_CONSTANT;
  return (distance * dimension * c) / (dimension + c * distance);
}

/** Closest anchor to `value`; ties break toward the earliest anchor. */
export function nearest(value: number, anchors: number[]): number {
  if (anchors.length === 0) return value;
  let best = anchors[0];
  for (let i = 1; i < anchors.length; i += 1) {
    if (Math.abs(anchors[i] - value) < Math.abs(best - value)) {
      best = anchors[i];
    }
  }
  return best;
}

/** Linear-deceleration travel distance (px) for a px/ms velocity. */
export function momentumDistance(
  velocity: number,
  deceleration: number = MOMENTUM_DECELERATION,
): number {
  if (!(deceleration > 0)) return 0;
  return velocity / deceleration;
}

/**
 * Interpolation duration (ms) matching the linear-deceleration model:
 * `2·|distance|/|velocity|` (= 2/deceleration for any v≠0), clamped to
 * [MOMENTUM_MIN_DURATION, MOMENTUM_MAX_DURATION].
 */
export function momentumDuration(
  velocity: number,
  deceleration: number = MOMENTUM_DECELERATION,
): number {
  const absVelocity = Math.abs(velocity);
  if (absVelocity === 0) return MOMENTUM_MIN_DURATION;
  const duration = (2 * Math.abs(momentumDistance(velocity, deceleration))) / absVelocity;
  return Math.min(MOMENTUM_MAX_DURATION, Math.max(MOMENTUM_MIN_DURATION, duration));
}

/** TDesign-style quartic ease-out used by the rAF momentum interpolator. */
export function quartEaseOut(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 4;
}
