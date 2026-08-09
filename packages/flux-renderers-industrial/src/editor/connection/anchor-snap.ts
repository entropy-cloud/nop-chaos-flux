import type { ScadaPipeConnection } from '../../symbols/pipe/pipe-junction.js';

/**
 * 端点吸附算法（design-connection.md §4.1 + §4.2 b）。
 *
 * 纯逻辑模块（无 React / leafer 依赖），Vitest 单测先行（roadmap 测试纪律）。
 *
 * 坐标模型（§4.1）：
 * - 归一化 0..1 相对图元尺寸（与 pipe-junction.ts:8-14 ScadaPipeConnection x/y 同口径）。
 * - 边缘吸附档位 0/0.5/1 三档（顶/底/左/右四边，每边 3 个归一化锚点）。
 * - 吸附阈值 ±N px（screen space，DEFAULT_SNAP_THRESHOLD=8，design-connection.md §4.2 规则 2）。
 *
 * 坐标换算（§4.1）：
 * - 归一化 → 世界：`world.x = bounds.x + normalized.x * bounds.width`（对齐 pipe-junction.ts:83）。
 * - 世界 → 归一化：`normalized.x = (world.x - bounds.x) / bounds.width`。
 */

/** 图元世界几何（编辑会话 working copy 节点 x/y/width/height 投影）。 */
export interface ScadaSymbolBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 归一化点（0..1 相对图元尺寸）。 */
export interface NormalizedPoint {
  x: number;
  y: number;
}

/** 世界坐标点。 */
export interface WorldPoint {
  x: number;
  y: number;
}

/** 边缘吸附方向。 */
export type SnapEdge = 'top' | 'bottom' | 'left' | 'right';

/** 吸附候选（经命中 + 边缘归一化点）。 */
export interface SnapCandidate {
  /** 候选图元 nodeId（写入 connection.target，§4.2 c）。 */
  nodeId: string;
  /** 候选图元边缘归一化锚点（写入 connection.x/y）。 */
  normalizedPoint: NormalizedPoint;
  /** 命中的边缘（多端点场景 / overlay 高亮参考）。 */
  edge: SnapEdge;
}

/** 吸附档位（0/0.5/1，design-connection.md §4.1 规则 1）。 */
export const EDGE_SNAP_POSITIONS = [0, 0.5, 1] as const;

/** 默认吸附阈值（screen/world space px，§4.2 规则 2 建议 N=8）。 */
export const DEFAULT_SNAP_THRESHOLD = 8;

/** 顶/底/左/右四边，每边三档位（共 12 锚点，角点重复经去重保留首命中边）。 */
const EDGE_ANCHORS: Array<{ edge: SnapEdge; point: NormalizedPoint }> = [
  { edge: 'top', point: { x: 0, y: 0 } },
  { edge: 'top', point: { x: 0.5, y: 0 } },
  { edge: 'top', point: { x: 1, y: 0 } },
  { edge: 'bottom', point: { x: 0, y: 1 } },
  { edge: 'bottom', point: { x: 0.5, y: 1 } },
  { edge: 'bottom', point: { x: 1, y: 1 } },
  { edge: 'left', point: { x: 0, y: 0.5 } },
  { edge: 'right', point: { x: 1, y: 0.5 } },
];

/**
 * 归一化点 → 世界坐标（§4.1 换算，对齐 pipe-junction.ts:83 stub 端点算术）。
 *
 * `world.x = bounds.x + normalized.x * bounds.width`。
 */
export function normalizedToWorld(normalized: NormalizedPoint, bounds: ScadaSymbolBounds): WorldPoint {
  return {
    x: bounds.x + normalized.x * bounds.width,
    y: bounds.y + normalized.y * bounds.height,
  };
}

/**
 * 世界坐标 → 归一化点（§4.1 换算逆运算）。
 *
 * `normalized.x = (world.x - bounds.x) / bounds.width`。
 * 注意（C1）：输出不钳制到 [0,1]（目标设备远离时归一化点可超出，pipe-junction create 已支持任意值）。
 */
export function worldToNormalized(world: WorldPoint, bounds: ScadaSymbolBounds): NormalizedPoint {
  return {
    x: (world.x - bounds.x) / bounds.width,
    y: (world.y - bounds.y) / bounds.height,
  };
}

function distanceSquared(a: WorldPoint, b: WorldPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * 查找最近吸附候选（§4.2 b + §4.6 多端点）。
 *
 * 对每个候选图元，枚举 12 个边缘锚点（顶/底/左/右 × 0/0.5/1），转换到世界坐标，
 * 若与 worldPoint 的距离 ≤ threshold（平方比较避免开方），记为命中；返回最近的命中。
 *
 * 候选查询经上游 bounding box 预检（design-connection.md §4.2 关键约束 3：复用 hit.ts getByPoint
 * 命中，不重复实现命中——本函数接收已预检的 candidates 列表）。
 *
 * `excludeIds` 排除起始 junctionId 自身（端点不应吸附到自身 pipe-junction，C3 防护）。
 */
export function findSnapCandidate(args: {
  worldPoint: WorldPoint;
  candidates: ScadaSymbolBounds[];
  threshold?: number;
  excludeIds?: string[];
}): SnapCandidate | undefined {
  const threshold = args.threshold ?? DEFAULT_SNAP_THRESHOLD;
  const thresholdSq = threshold * threshold;
  const exclude = new Set(args.excludeIds ?? []);

  let best: { candidate: SnapCandidate; distSq: number } | undefined;

  for (const bounds of args.candidates) {
    if (exclude.has(bounds.id)) continue;
    if (bounds.width <= 0 || bounds.height <= 0) continue;
    for (const anchor of EDGE_ANCHORS) {
      const anchorWorld = normalizedToWorld(anchor.point, bounds);
      const distSq = distanceSquared(anchorWorld, args.worldPoint);
      if (distSq <= thresholdSq && (best === undefined || distSq < best.distSq)) {
        best = { candidate: { nodeId: bounds.id, normalizedPoint: anchor.point, edge: anchor.edge }, distSq };
      }
    }
  }

  return best?.candidate;
}

/**
 * 生成 connection.id（C4 唯一性防护，design-connection.md §5）。
 *
 * 规则：`${junctionId}-conn-${index}`；index 经既有 connections 长度推导 + 冲突避让。
 */
export function generateConnectionId(junctionId: string, existing: ScadaPipeConnection[]): string {
  const usedIds = new Set(existing.map((c) => c.id));
  let index = existing.length;
  let id = `${junctionId}-conn-${index}`;
  while (usedIds.has(id)) {
    index += 1;
    id = `${junctionId}-conn-${index}`;
  }
  return id;
}

/**
 * 抽取 pipe-junction working copy 节点的 connections 数组（类型安全读 custom.connections）。
 */
export function readConnections(custom: Record<string, unknown> | undefined): ScadaPipeConnection[] {
  if (!custom) return [];
  const raw = custom.connections;
  return Array.isArray(raw) ? (raw as ScadaPipeConnection[]) : [];
}
