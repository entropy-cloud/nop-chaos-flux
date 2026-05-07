import type { GraphDocument } from '../types.js';

export function normalizeViewport(viewport: GraphDocument['viewport']) {
  return viewport ? { ...viewport } : { x: 0, y: 0, zoom: 1 };
}

export function clampZoom(zoom: number) {
  return Math.max(0.1, Math.min(4, Number(zoom.toFixed(3))));
}

export function normalizeViewportInput(viewport: { x: number; y: number; zoom: number }) {
  return {
    x: Number(viewport.x.toFixed(2)),
    y: Number(viewport.y.toFixed(2)),
    zoom: clampZoom(viewport.zoom),
  };
}

export function viewportsEqual(
  left: { x: number; y: number; zoom: number },
  right: { x: number; y: number; zoom: number },
) {
  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}
