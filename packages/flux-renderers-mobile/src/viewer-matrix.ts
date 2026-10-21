/**
 * Image-viewer gesture math (plan 667 Phase 1, M9a). Pure functions only.
 *
 * Pinch model: the image is transformed by `translate(scale-independent
 * pan) + scale`, anchored at the current two-finger midpoint — each move
 * event re-anchors (midpoint-follow semantics), so the point under the
 * fingers stays fixed while the scale ratio applies.
 */

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;

export interface ViewerTransform {
  scale: number;
  /** Pan is scale-independent translation in px. */
  x: number;
  y: number;
}

export function clampScale(scale: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
}

/**
 * Apply a new (pre-clamp) scale with the pinch midpoint as the fixed point.
 * ratio = clamped new scale / previous scale; translate moves so that
 * translate' + s'·anchor = anchor + (translate + s·anchor − anchor) — i.e.
 * the anchor point stays visually fixed.
 */
export function pinchMatrix(input: {
  prev: ViewerTransform;
  scale: number;
  anchorX: number;
  anchorY: number;
}): ViewerTransform {
  const scale = clampScale(input.scale);
  const ratio = scale / (input.prev.scale || MIN_SCALE);
  return {
    scale,
    x: input.anchorX - (input.anchorX - input.prev.x) * ratio,
    y: input.anchorY - (input.anchorY - input.prev.y) * ratio,
  };
}

/**
 * Clamp the pan so a scaled image cannot be dragged fully out of view:
 * allowed |pan| is bounded by (scaled size − container size) / 2 per axis;
 * below that bound (scale ≤ 1) the pan stays where it is (0 on center-fit
 * layouts, small offsets otherwise).
 */
export function panClamp(
  transform: ViewerTransform,
  containerWidth: number,
  containerHeight: number,
): ViewerTransform {
  const scaledW = containerWidth * transform.scale;
  const scaledH = containerHeight * transform.scale;
  const limitX = Math.max(0, (scaledW - containerWidth) / 2);
  const limitY = Math.max(0, (scaledH - containerHeight) / 2);
  return {
    scale: transform.scale,
    x: Math.max(-limitX, Math.min(limitX, transform.x)) + 0,
    y: Math.max(-limitY, Math.min(limitY, transform.y)) + 0,
  };
}

// Internal gesture discriminant (knip: resolveGesture consumers switch on kind).
type ViewerGesture =
  | { kind: 'pinch' }
  | { kind: 'pan' }
  | { kind: 'page' }
  | { kind: 'pull-down' };

/**
 * Arbitration: two pointers → pinch; single pointer while zoomed → pan
 * (horizontal paging frozen at scale > 1); single pointer unzoomed →
 * paging / pull-down (the caller discriminates by direction).
 */
export function resolveGesture(input: {
  pointerCount: number;
  zoomed: boolean;
}): ViewerGesture {
  if (input.pointerCount >= 2) return { kind: 'pinch' };
  if (input.zoomed) return { kind: 'pan' };
  return { kind: 'page' };
}
