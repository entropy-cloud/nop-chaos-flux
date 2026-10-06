import { describe, expect, it } from 'vitest';
import {
  computeMoveSnap,
  MOVE_SNAP_ALIGNMENT_THRESHOLD,
  MOVE_SNAP_GRID_SIZE,
} from './transform-snap.js';

const SIBLING = { x: 200, y: 300, width: 100, height: 100 };

describe('computeMoveSnap (plan 531 S2 Phase 2, 526 alignment 移植 + 网格兜底)', () => {
  it('snaps left edges within threshold and reports the alignment line', () => {
    const result = computeMoveSnap({
      dragged: { x: 207, y: 500, width: 100, height: 100 },
      siblings: [SIBLING],
    });
    // dragged left 207 → sibling left 200：dx = -7（|shift| ≤ 8）；y 轴无候选 → 网格兜底。
    expect(result.dx).toBe(-7);
    expect(result.vertical).toBe(200);
    expect(result.dy).toBe(500 - Math.round(500 / MOVE_SNAP_GRID_SIZE) * MOVE_SNAP_GRID_SIZE);
    expect(result.horizontal).toBeNull();
  });

  it('prefers the closest axis candidate among left/center/right', () => {
    // dragged left 197 → sibling left 200 (shift 3) vs dragged center 247 → sibling center 250 (shift 3)，
    // 相等时取先遇到者；拖到 198：left shift 2 < center shift 2（相等）→ 稳定取最小 |shift| 首个。
    const result = computeMoveSnap({
      dragged: { x: 198, y: 500, width: 100, height: 100 },
      siblings: [SIBLING],
    });
    expect(Math.abs(result.dx)).toBeLessThanOrEqual(MOVE_SNAP_ALIGNMENT_THRESHOLD);
    expect(result.vertical).toBe(200);
  });

  it('falls back to grid snapping on axes without alignment candidates', () => {
    const result = computeMoveSnap({
      dragged: { x: 503, y: 507, width: 100, height: 100 },
      siblings: [],
    });
    expect(result.dx).toBe(-3); // 503 → 500
    expect(result.dy).toBe(3); // 507 → 510
    expect(result.vertical).toBeNull();
    expect(result.horizontal).toBeNull();
  });

  it('alignment overrides grid when both are applicable', () => {
    // 对齐候选 dx=-7（非网格对齐位置）——命中对齐时不叠加网格修正。
    const result = computeMoveSnap({
      dragged: { x: 207, y: 207, width: 100, height: 100 },
      siblings: [{ x: 200, y: 200, width: 100, height: 100 }],
    });
    expect(result.dx).toBe(-7);
    expect(result.dy).toBe(-7);
  });

  it('band-prunes distant siblings (no candidate outside threshold)', () => {
    const result = computeMoveSnap({
      dragged: { x: 500, y: 500, width: 100, height: 100 },
      siblings: [SIBLING],
    });
    expect(result.dx).toBe(0); // 500 在网格上
    expect(result.dy).toBe(0);
    expect(result.vertical).toBeNull();
    expect(result.horizontal).toBeNull();
  });

  it('respects custom threshold and grid size', () => {
    const result = computeMoveSnap({
      dragged: { x: 195, y: 195, width: 100, height: 100 },
      siblings: [SIBLING],
      threshold: 4,
      gridSize: 5,
    });
    // 阈值 4：|200 - 195| = 5 > 4 → 对齐不命中 → 网格 5：195 → 195（已是 5 的倍数）。
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
    expect(result.vertical).toBeNull();
  });
});
