import { useCallback, useEffect, useRef, useState } from 'react';
import type { Node } from '@xyflow/react';

/** plan 475 Phase 2：拖拽对齐辅助线（最小实现）——单节点拖拽时对兄弟节点的
 * left/center/right × top/middle/bottom 候选线做阈值吸附；多选拖拽不吸附。 */
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

  for (const sibling of siblings) {
    for (const target of [
      sibling.x,
      sibling.x + sibling.width / 2,
      sibling.x + sibling.width,
    ]) {
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

    for (const target of [
      sibling.y,
      sibling.y + sibling.height / 2,
      sibling.y + sibling.height,
    ]) {
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

export interface UseAlignmentGuidesResult {
  guides: AlignmentGuidesState;
  onNodeDrag(event: unknown, node: Node, draggedNodes?: Node[]): void;
  onNodeDragStop(): void;
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

  const onNodeDragStop = useCallback(() => {
    setGuides({ vertical: null, horizontal: null });
  }, []);

  const onNodeDrag = useCallback((_event: unknown, node: Node, draggedNodes?: Node[]) => {
    // 最小实现：仅单节点拖拽吸附；多选簇吸附需要平移整簇，超出本计划面。
    if (draggedNodes && draggedNodes.length > 1) {
      setGuides({ vertical: null, horizontal: null });
      return;
    }

    const all = getNodesRef.current();
    const siblings = all
      .filter((candidate) => candidate.id !== node.id)
      .map((candidate) => rectOf(candidate));

    const dragged = rectOf(node);
    const result = computeAlignmentGuides(dragged, siblings);

    setGuides({ vertical: result.vertical, horizontal: result.horizontal });

    if (result.dx !== 0 || result.dy !== 0) {
      applyPositionRef.current(node.id, {
        x: node.position.x + result.dx,
        y: node.position.y + result.dy,
      });
    }
  }, []);

  return { guides, onNodeDrag, onNodeDragStop };
}
