/**
 * Swipe-cell release decision (plan 664 Phase 5, M6d K-map).
 *
 * Pure function: given the touch state at release, decide whether the cell
 * opens, closes, does nothing, or triggers the revealed region's first
 * action (overswipe). Full grid documented in
 * `docs/components/swipe-cell/design.md` §6; behavior changes vs the M5
 * static-threshold release are annotated there (变更①②③).
 */

export const FLICK_VELOCITY = 0.1;
export const THROW_FACTOR = 50;
export const MIN_FLICK_DELTA = 10;
export const OVERSWIPE_RATIO = 1.15;

export type SwipeOpenState = 'closed' | 'open-left' | 'open-right';

// Internal result contract (knip: consumers use resolveSwipeRelease directly).
type SwipeReleaseDecision =
  | { kind: 'open'; side: 'open-left' | 'open-right' }
  | { kind: 'close' }
  | { kind: 'none' }
  | { kind: 'action'; side: 'open-left' | 'open-right' };

// Internal-only parameter shape (knip: the exported alias had zero
// consumers outside the module; resolveSwipeRelease carries the contract).
interface SwipeReleaseInput {
  /** Total horizontal drag delta at release (px, signed). */
  deltaX: number;
  /** Signed horizontal velocity at release (px/ms; 0 when unsampled). */
  velocityX: number;
  /** Schema threshold (px). */
  threshold: number;
  /** Measured width of the left action region (px; 0 = unmeasured). */
  leftWidth: number;
  /** Measured width of the right action region (px; 0 = unmeasured). */
  rightWidth: number;
  /** Committed open state BEFORE this gesture (unchanged during a drag). */
  openState: SwipeOpenState;
  /** A leftward swipe may reveal the right region. */
  canSwipeLeft: boolean;
  /** A rightward swipe may reveal the left region. */
  canSwipeRight: boolean;
}

export function resolveSwipeRelease(input: SwipeReleaseInput): SwipeReleaseDecision {
  const {
    deltaX,
    velocityX,
    threshold,
    leftWidth,
    rightWidth,
    openState,
    canSwipeLeft,
    canSwipeRight,
  } = input;

  const absDelta = Math.abs(deltaX);
  const flick =
    Math.sign(velocityX) === Math.sign(deltaX) &&
    Math.abs(velocityX) >= FLICK_VELOCITY;

  if (openState === 'closed') {
    const goingRight = deltaX > 0;
    const width = goingRight ? leftWidth : rightWidth;
    const allowed = goingRight ? canSwipeRight : canSwipeLeft;
    if (deltaX === 0 || !allowed) return { kind: 'none' };
    const side: 'open-left' | 'open-right' = goingRight ? 'open-left' : 'open-right';
    // (a) overswipe: raw travel past 1.15× the revealed region width wins
    if (width > 0 && absDelta >= OVERSWIPE_RATIO * width) {
      return { kind: 'action', side };
    }
    const projected = absDelta + Math.abs(velocityX) * THROW_FACTOR;
    // (b) static threshold / (c) flick / (d) velocity throw projection
    if (
      absDelta >= threshold ||
      (flick && absDelta >= MIN_FLICK_DELTA) ||
      (width > 0 && projected >= width / 2)
    ) {
      return { kind: 'open', side };
    }
    // (e)
    return { kind: 'none' };
  }

  // Open states: closing is always allowed; opening further keeps the side.
  const openingSign = openState === 'open-left' ? 1 : -1;
  const towardOpening = Math.sign(deltaX) === openingSign;
  if (towardOpening) {
    // (f) past threshold stays open / (g) CHANGE ①: flick keeps it open
    if (absDelta >= threshold || flick) {
      return { kind: 'open', side: openState };
    }
    // (h) small rebound closes (M5 behavior, unchanged)
    return { kind: 'close' };
  }
  // (i) CHANGE ②: closing past threshold closes (old: flipped / no-op)
  if (absDelta >= threshold) return { kind: 'close' };
  // (j) CHANGE ③: quick closing flick closes (old: stayed open)
  if (flick) return { kind: 'close' };
  // (k)
  return { kind: 'none' };
}
