import { momentumDistance } from './hooks/gesture-math.js';

/**
 * Wheel-column snap/inertia math for the picker family (plan 665 Phase 1).
 *
 * Sign convention: the options strip is translated by `offset` px
 * (translateY). Index 0 rests at offset 0; index n at `-n·rowHeight`. The
 * strip follows the finger, so a downward drag (positive deltaY / velocityY)
 * increases the offset and DECREASES the selected index.
 *
 * Inertia parameters are the vant/arco/nutui consensus set
 * (docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md §5):
 * a fling starts only for gestures shorter than 300ms that traveled more
 * than 15px; the projected travel is the shared `momentumDistance`
 * (v / 0.003), snapped to the nearest row.
 */

export const WHEEL_INERTIA_TRIGGER_MS = 300;
export const WHEEL_INERTIA_TRIGGER_PX = 15;
export const DEFAULT_ROW_HEIGHT = 44;

export function clampIndex(index: number, rowCount: number): number {
  if (rowCount <= 0) return 0;
  return Math.max(0, Math.min(rowCount - 1, index));
}

export function offsetForIndex(index: number, rowHeight: number): number {
  return 0 - index * rowHeight;
}

export function indexForOffset(offset: number, rowCount: number, rowHeight: number): number {
  return clampIndex(Math.round(-offset / rowHeight), rowCount);
}

interface MomentumTargetInput {
  /** Strip offset at release (px). */
  releaseOffset: number;
  /** Finger velocity at release (px/ms, signed; strip follows the finger). */
  velocityPxMs: number;
  /** Gesture duration (touchstart → touchend). */
  gestureDurationMs: number;
  /** Absolute finger travel of the gesture (px). */
  travelPx: number;
  rowCount: number;
  rowHeight: number;
}

export function momentumTargetIndex(input: MomentumTargetInput): number {
  const startIndex = indexForOffset(input.releaseOffset, input.rowCount, input.rowHeight);
  const isInertia =
    input.gestureDurationMs < WHEEL_INERTIA_TRIGGER_MS &&
    Math.abs(input.travelPx) > WHEEL_INERTIA_TRIGGER_PX;
  if (!isInertia || input.rowCount <= 0) {
    return startIndex;
  }
  const projectedOffset = input.releaseOffset + momentumDistance(input.velocityPxMs);
  return clampIndex(Math.round(-projectedOffset / input.rowHeight), input.rowCount);
}
