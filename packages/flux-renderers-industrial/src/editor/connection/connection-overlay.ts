import { normalizedToWorld, type ScadaSymbolBounds, type SnapCandidate, type WorldPoint } from './anchor-snap.js';

/**
 * 吸附高亮 + 端点拖动虚线提示（design-connection.md §6）。
 *
 * 经 InteractionOverlay 模式渲染在编辑器 sky 层（screen 坐标系）；**不入组态 JSON**（编辑会话临时态）。
 *
 * 本模块是纯逻辑投影（无 React / leafer 直接依赖）：host 经 deriveOverlayState 拿到 overlay
 * 图元描述（圆点 / 虚线），由 React 视图层或 sky 层 leafer 节点渲染。
 */

/** 吸附候选高亮圆点（screen/world 坐标系，§6 + §4.2 规则 3）。 */
export interface SnapHighlightMark {
  kind: 'snap-dot';
  /** 候选图元边缘锚点世界坐标（圆点中心）。 */
  world: WorldPoint;
  /** 候选 nodeId（高亮参考）。 */
  nodeId: string;
}

/** 端点拖动虚线提示（pointer → 候选，§6 + §4.2 段 b）。 */
export interface DragLineMark {
  kind: 'drag-line';
  /** 起点（pointer 世界坐标）。 */
  from: WorldPoint;
  /** 终点（候选锚点世界坐标，无候选时 = 起点）。 */
  to: WorldPoint;
}

/** overlay 图元集合（sky 层渲染描述）。 */
export interface ConnectionOverlayState {
  highlights: SnapHighlightMark[];
  dragLines: DragLineMark[];
}

/**
 * 派生 overlay 图元状态（编辑会话临时态，§7 + §6）。
 *
 * - 有吸附候选：1 个 snap-dot（候选锚点）+ 1 条 drag-line（pointer → 候选）。
 * - 无候选：1 条 drag-line（pointer → pointer，自由拖动提示，长度 0 可选不渲染）。
 *
 * @param pointerWorld 当前 pointer 世界坐标。
 * @param candidate    当前吸附候选（来自 updateDragCandidate）。
 * @param candidateBounds 候选图元几何（计算锚点世界坐标用）。
 */
export function deriveOverlayState(args: {
  pointerWorld: WorldPoint;
  candidate?: SnapCandidate;
  candidateBounds?: ScadaSymbolBounds;
}): ConnectionOverlayState {
  const highlights: SnapHighlightMark[] = [];
  const dragLines: DragLineMark[] = [];

  if (args.candidate && args.candidateBounds) {
    const anchorWorld = normalizedToWorld(args.candidate.normalizedPoint, args.candidateBounds);
    highlights.push({
      kind: 'snap-dot',
      world: anchorWorld,
      nodeId: args.candidate.nodeId,
    });
    dragLines.push({ kind: 'drag-line', from: args.pointerWorld, to: anchorWorld });
  } else {
    dragLines.push({ kind: 'drag-line', from: args.pointerWorld, to: args.pointerWorld });
  }

  return { highlights, dragLines };
}

/** 空状态（无拖动时清空 overlay）。 */
export const EMPTY_OVERLAY_STATE: ConnectionOverlayState = { highlights: [], dragLines: [] };
