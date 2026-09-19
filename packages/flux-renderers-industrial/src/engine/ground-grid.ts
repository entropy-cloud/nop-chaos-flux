import { Group, Line } from 'leafer-ui';
import type { ILeafer } from 'leafer-ui';

/**
 * Ground-layer grid rendering (plan 474, visual-quality V4-F1/A1).
 *
 * The schema `background.grid` channel was validated but never consumed —
 * the ground Leafer layer only ever received `fill` (design-renderer.md §4.2
 * watch-only note, now superseded). This module draws a static grid on the
 * ground layer (viewport-transform-free background, design-engine.md §6/§225):
 * vertical + horizontal hair lines at `size` intervals in `color`.
 *
 * Contract:
 * - no grid config → zero drawing (backwards compatible);
 * - redraw is clear-then-draw (repeated resets must not stack line nodes);
 * - the grid Group is `hittable: false` (interaction-overlay.ts precedent)
 *   and lives on `ground`, so pan/zoom of `tree.zoomLayer` never moves it;
 * - O(cols + rows) constant line count, no per-symbol cost.
 */

export interface GroundGridConfig {
  size: number;
  color: string;
}

const GRID_NAME = 'scada-ground-grid';

export function clearGroundGrid(ground: ILeafer): void {
  const children = (ground as unknown as { children?: Array<{ name?: string; remove?: () => void }> }).children ?? [];
  for (const child of [...children]) {
    if (child?.name === GRID_NAME) {
      (ground as unknown as { remove: (child: unknown) => void }).remove(child);
    }
  }
}

export function drawGroundGrid(
  ground: ILeafer,
  width: number,
  height: number,
  grid: GroundGridConfig,
): void {
  clearGroundGrid(ground);
  if (!grid || grid.size <= 0 || width <= 0 || height <= 0) return;

  const group = new Group({ name: GRID_NAME, hittable: false });
  for (let x = grid.size; x < width; x += grid.size) {
    group.add(new Line({ points: [x, 0, x, height], stroke: grid.color, strokeWidth: 1 }));
  }
  for (let y = grid.size; y < height; y += grid.size) {
    group.add(new Line({ points: [0, y, width, y], stroke: grid.color, strokeWidth: 1 }));
  }
  ground.add(group as unknown as ILeafer);
}
