/**
 * 图元位移吸附纯函数（plan 531 S2 Phase 2，526 computeAlignmentGuides 模式移植到 leafer world 坐标系）。
 *
 * - 对齐吸附：left/center/right × top/middle/bottom 三轴候选，按轴 band 剪枝；阈值吸收既有连线
 *   吸附惯例（connection/anchor-snap.ts DEFAULT_SNAP_THRESHOLD = 8，world 坐标同量纲）。
 * - 网格吸附：对齐候选缺失的轴 round 到网格常数兜底（WinCC/HMI 编辑器 10px 网格惯例）。
 * - 对齐优先于网格：命中对齐的轴不叠加网格修正；网格不产生辅助线。
 * 与 React/leafer 零耦合，供 drop 落点与 transformEnd 修正共用。
 */

export const MOVE_SNAP_GRID_SIZE = 10;
export const MOVE_SNAP_ALIGNMENT_THRESHOLD = 8;

export interface SnapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MoveSnapResult {
  dx: number;
  dy: number;
  /** 对齐辅助线世界坐标（x = 垂直线，y = 水平线）；网格兜底时为 null。 */
  vertical: number | null;
  horizontal: number | null;
}

export function computeMoveSnap(args: {
  dragged: SnapRect;
  siblings: SnapRect[];
  gridSize?: number;
  threshold?: number;
}): MoveSnapResult {
  const gridSize = args.gridSize ?? MOVE_SNAP_GRID_SIZE;
  const threshold = args.threshold ?? MOVE_SNAP_ALIGNMENT_THRESHOLD;
  const { dragged } = args;

  let bestVertical: { shift: number; line: number } | null = null;
  let bestHorizontal: { shift: number; line: number } | null = null;

  const draggedXs = [dragged.x, dragged.x + dragged.width / 2, dragged.x + dragged.width];
  const draggedYs = [dragged.y, dragged.y + dragged.height / 2, dragged.y + dragged.height];

  // 按轴 band 剪枝（526 同款）：远处兄弟不进候选循环，避免每帧 O(N) 三轴比较。
  const verticalBandMin = dragged.x - threshold;
  const verticalBandMax = dragged.x + dragged.width + threshold;
  const horizontalBandMin = dragged.y - threshold;
  const horizontalBandMax = dragged.y + dragged.height + threshold;

  for (const sibling of args.siblings) {
    const inVerticalBand = sibling.x + sibling.width >= verticalBandMin && sibling.x <= verticalBandMax;
    const inHorizontalBand = sibling.y + sibling.height >= horizontalBandMin && sibling.y <= horizontalBandMax;
    if (!inVerticalBand && !inHorizontalBand) {
      continue;
    }

    if (inVerticalBand) {
      for (const target of [sibling.x, sibling.x + sibling.width / 2, sibling.x + sibling.width]) {
        for (const current of draggedXs) {
          const shift = target - current;
          if (Math.abs(shift) <= threshold && (!bestVertical || Math.abs(shift) < Math.abs(bestVertical.shift))) {
            bestVertical = { shift, line: target };
          }
        }
      }
    }
    if (inHorizontalBand) {
      for (const target of [sibling.y, sibling.y + sibling.height / 2, sibling.y + sibling.height]) {
        for (const current of draggedYs) {
          const shift = target - current;
          if (Math.abs(shift) <= threshold && (!bestHorizontal || Math.abs(shift) < Math.abs(bestHorizontal.shift))) {
            bestHorizontal = { shift, line: target };
          }
        }
      }
    }
  }

  const gridShift = (value: number) => Math.round(value / gridSize) * gridSize - value;

  return {
    dx: bestVertical ? bestVertical.shift : gridShift(dragged.x),
    dy: bestHorizontal ? bestHorizontal.shift : gridShift(dragged.y),
    vertical: bestVertical ? bestVertical.line : null,
    horizontal: bestHorizontal ? bestHorizontal.line : null,
  };
}
