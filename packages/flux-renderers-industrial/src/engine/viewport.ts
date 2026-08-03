export interface Point {
  x: number;
  y: number;
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 20;

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function clampViewport(state: ViewportState): ViewportState {
  return { x: state.x, y: state.y, scale: clampScale(state.scale) };
}

export function worldToViewport(state: ViewportState, world: Point): Point {
  return {
    x: (world.x - state.x) * state.scale,
    y: (world.y - state.y) * state.scale,
  };
}

export function viewportToWorld(state: ViewportState, viewport: Point): Point {
  return {
    x: viewport.x / state.scale + state.x,
    y: viewport.y / state.scale + state.y,
  };
}

export function setViewport(_prev: ViewportState, next: ViewportState): ViewportState {
  return clampViewport(next);
}

export function fit(bounds: Bounds, viewport: Size, padding = 0): ViewportState {
  const pad = Math.max(0, padding);
  const availWidth = Math.max(1, viewport.width - pad * 2);
  const availHeight = Math.max(1, viewport.height - pad * 2);
  const bw = Math.max(1e-6, bounds.width);
  const bh = Math.max(1e-6, bounds.height);
  const scale = clampScale(Math.min(availWidth / bw, availHeight / bh));
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  return {
    x: cx - viewport.width / (2 * scale),
    y: cy - viewport.height / (2 * scale),
    scale,
  };
}

export function center(state: ViewportState, bounds: Bounds, viewport: Size): ViewportState {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  return {
    x: cx - viewport.width / (2 * state.scale),
    y: cy - viewport.height / (2 * state.scale),
    scale: state.scale,
  };
}

export function zoomAt(state: ViewportState, worldPoint: Point, factor: number): ViewportState {
  const nextScale = clampScale(state.scale * factor);
  if (nextScale === state.scale) return { ...state };
  const anchorVp = worldToViewport(state, worldPoint);
  return {
    x: worldPoint.x - anchorVp.x / nextScale,
    y: worldPoint.y - anchorVp.y / nextScale,
    scale: nextScale,
  };
}
