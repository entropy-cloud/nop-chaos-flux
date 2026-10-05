import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Node } from '@xyflow/react';

/** plan 475 Phase 2 + plan 526 Phase 3：拖拽对齐辅助线——单节点拖拽与多选簇拖拽
 * （selection-rect 路径）统一经 RF position change 流做 left/center/right ×
 * top/middle/bottom 候选线阈值吸附；多选簇以首个变化节点为参考轴、整簇平移。 */
export const ALIGNMENT_THRESHOLD = 6;

export interface AlignmentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AlignmentGuidesResult {
  dx: number;
  dy: number;
  vertical: number | null;
  horizontal: number | null;
}

export interface AlignmentGuidesState {
  vertical: number | null;
  horizontal: number | null;
}

function rectOf(node: Node): AlignmentRect {
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? node.width ?? 0,
    height: node.measured?.height ?? node.height ?? 0,
  };
}

export function computeAlignmentGuides(
  dragged: AlignmentRect,
  siblings: AlignmentRect[],
  threshold: number = ALIGNMENT_THRESHOLD,
): AlignmentGuidesResult {
  let bestVertical: { shift: number; line: number } | null = null;
  let bestHorizontal: { shift: number; line: number } | null = null;

  const draggedXs = [dragged.x, dragged.x + dragged.width / 2, dragged.x + dragged.width];
  const draggedYs = [dragged.y, dragged.y + dragged.height / 2, dragged.y + dragged.height];

  // 垂直候选线只取决于 x 轴距离（水平候选同理只看 y 轴）——按轴做精确 band
  // 剪枝，垂直/水平方向上远处的兄弟不进候选循环，避免每帧 O(N) 三轴比较。
  const verticalBandMin = dragged.x - threshold;
  const verticalBandMax = dragged.x + dragged.width + threshold;
  const horizontalBandMin = dragged.y - threshold;
  const horizontalBandMax = dragged.y + dragged.height + threshold;

  for (const sibling of siblings) {
    const inVerticalBand =
      sibling.x + sibling.width >= verticalBandMin && sibling.x <= verticalBandMax;
    const inHorizontalBand =
      sibling.y + sibling.height >= horizontalBandMin && sibling.y <= horizontalBandMax;
    if (!inVerticalBand && !inHorizontalBand) {
      continue;
    }

    for (const target of inVerticalBand
      ? [sibling.x, sibling.x + sibling.width / 2, sibling.x + sibling.width]
      : []) {
      for (const current of draggedXs) {
        const shift = target - current;
        if (
          Math.abs(shift) <= threshold &&
          (!bestVertical || Math.abs(shift) < Math.abs(bestVertical.shift))
        ) {
          bestVertical = { shift, line: target };
        }
      }
    }

    for (const target of inHorizontalBand
      ? [sibling.y, sibling.y + sibling.height / 2, sibling.y + sibling.height]
      : []) {
      for (const current of draggedYs) {
        const shift = target - current;
        if (
          Math.abs(shift) <= threshold &&
          (!bestHorizontal || Math.abs(shift) < Math.abs(bestHorizontal.shift))
        ) {
          bestHorizontal = { shift, line: target };
        }
      }
    }
  }

  return {
    dx: bestVertical?.shift ?? 0,
    dy: bestHorizontal?.shift ?? 0,
    vertical: bestVertical?.line ?? null,
    horizontal: bestHorizontal?.line ?? null,
  };
}

export interface UseAlignmentGuidesParams {
  getNodes(): Node[];
  applyPosition(id: string, position: { x: number; y: number }): void;
}

interface DraggingPositionChange {
  id: string;
  dragging?: boolean;
  position?: { x: number; y: number };
}

export interface UseAlignmentGuidesResult {
  guides: AlignmentGuidesState;
  /** 拖拽位置变化入口——单节点拖拽（XYDrag→onNodesChange）与多选簇拖拽
   *（NodesSelection selection-rect 拖拽）统一走 RF 的 position change 流；
   * selection-rect 路径不触发 onNodeDrag 回调，故对齐吸附必须挂 changes。
   * dragging:false（拖放提交/键盘 nudge）到达时清除参考线。 */
  handlePositionChanges(changes: DraggingPositionChange[]): void;
  clearGuides(): void;
}

export function useAlignmentGuides({
  getNodes,
  applyPosition,
}: UseAlignmentGuidesParams): UseAlignmentGuidesResult {
  const [guides, setGuides] = useState<AlignmentGuidesState>({
    vertical: null,
    horizontal: null,
  });
  const getNodesRef = useRef(getNodes);
  const applyPositionRef = useRef(applyPosition);
  useEffect(() => {
    getNodesRef.current = getNodes;
    applyPositionRef.current = applyPosition;
  });

  const clearGuides = useCallback(() => {
    setGuides((current) =>
      current.vertical === null && current.horizontal === null
        ? current
        : { vertical: null, horizontal: null },
    );
  }, []);

  const handlePositionChanges = useCallback(
    (changes: DraggingPositionChange[]) => {
      const draggingChanges = changes.filter(
        (change) => change.dragging === true && change.position !== undefined,
      );
      if (draggingChanges.length === 0) {
        clearGuides();
        return;
      }

      // 多选簇吸附（plan 526 Phase 3）：以首个变化节点为参考轴计算吸附位移，
      // 整簇平移保持相对位移；兄弟候选排除整个拖拽簇（而非仅参考节点）。
      const clusterIds = new Set(draggingChanges.map((change) => change.id));
      const all = getNodesRef.current();
      const reference = draggingChanges[0];
      const referenceNode = all.find((node) => node.id === reference.id);
      if (!referenceNode || !reference.position) {
        return;
      }
      const dragged: AlignmentRect = {
        x: reference.position.x,
        y: reference.position.y,
        width: referenceNode.measured?.width ?? referenceNode.width ?? 0,
        height: referenceNode.measured?.height ?? referenceNode.height ?? 0,
      };
      const siblings = all
        .filter((candidate) => !clusterIds.has(candidate.id))
        .map((candidate) => rectOf(candidate));

      const result = computeAlignmentGuides(dragged, siblings);

      // 值未变不换引用：guides 每帧新对象会连带重渲染整个画布子树。
      setGuides((current) =>
        current.vertical === result.vertical && current.horizontal === result.horizontal
          ? current
          : { vertical: result.vertical, horizontal: result.horizontal },
      );

      if (result.dx !== 0 || result.dy !== 0) {
        for (const change of draggingChanges) {
          applyPositionRef.current(change.id, {
            x: change.position!.x + result.dx,
            y: change.position!.y + result.dy,
          });
        }
      }
    },
    [clearGuides],
  );

  // 结果对象身份必须稳定：调用方（designer-xyflow-canvas）把它放进 handleNodesChange
  // 的 useCallback 依赖，身份抖动会连锁翻转 RF props（minimap-pan 回归的根因）。
  return useMemo(
    () => ({ guides, handlePositionChanges, clearGuides }),
    [guides, handlePositionChanges, clearGuides],
  );
}
