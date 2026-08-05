import dagre from 'dagre';
import type { GraphEdge, GraphLayout, GraphNode, GraphOrientation } from './schemas.js';

export interface GraphPosition {
  x: number;
  y: number;
}

export interface SanitizedGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  skippedEdges: GraphEdge[];
}

export interface GraphLayoutProjection {
  positions: ReadonlyMap<string, GraphPosition>;
  layoutedEdges: GraphEdge[];
  skippedEdges: GraphEdge[];
}

export const LAYOUT_NODE_DEFAULT_WIDTH = 180;
export const LAYOUT_NODE_DEFAULT_HEIGHT = 56;
export const LAYOUT_NODE_SEPARATION = 48;
export const LAYOUT_RANK_SEPARATION = 64;

/**
 * 畸形数据处理硬契约（design §6，同 chart DD1 原则）：
 * - 边引用不存在的节点 → 跳过该边（返回 skippedEdges，由调用方 dev 告警），不抛错
 * - 缺少 id 的边 → 生成缺省 id `${source}->${target}#${index}`
 * - 节点缺 id → 过滤并计入 skippedEdges 场景（该节点的出入边一并跳过）
 */
export function sanitizeGraphData(nodes: GraphNode[], edges: GraphEdge[]): SanitizedGraphData {
  const validNodes: GraphNode[] = [];
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (node && typeof node.id === 'string' && node.id.length > 0) {
      nodeIds.add(node.id);
      validNodes.push(node);
    }
  }

  const validEdges: GraphEdge[] = [];
  const skippedEdges: GraphEdge[] = [];
  for (const edge of edges) {
    if (!edge || typeof edge.source !== 'string' || typeof edge.target !== 'string') {
      skippedEdges.push(edge);
      continue;
    }
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      skippedEdges.push(edge);
      continue;
    }
    if (edge.id && typeof edge.id === 'string' && edge.id.length > 0) {
      validEdges.push(edge);
    } else {
      validEdges.push({ ...edge, id: `${edge.source}->${edge.target}#${validEdges.length}` });
    }
  }

  return { nodes: validNodes, edges: validEdges, skippedEdges };
}

/**
 * dagre 分层投影（design §2.1-2）：按 orientation（LR/TB，默认 LR）分层布局。
 * 纯函数，不依赖 React；数据变化时由调用方决定是否重跑（增量重布局）。
 */
export function computeHierarchyPositions(
  nodes: GraphNode[],
  edges: GraphEdge[],
  orientation: GraphOrientation,
): ReadonlyMap<string, GraphPosition> {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: orientation,
    nodesep: LAYOUT_NODE_SEPARATION,
    ranksep: LAYOUT_RANK_SEPARATION,
    marginx: 24,
    marginy: 24,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    graph.setNode(node.id, {
      width: LAYOUT_NODE_DEFAULT_WIDTH,
      height: LAYOUT_NODE_DEFAULT_HEIGHT,
    });
  }
  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  const positions = new Map<string, GraphPosition>();
  for (const node of nodes) {
    const placed = graph.node(node.id);
    if (!placed || typeof placed.x !== 'number' || typeof placed.y !== 'number') {
      continue;
    }
    positions.set(node.id, {
      x: placed.x - (placed.width ?? LAYOUT_NODE_DEFAULT_WIDTH) / 2,
      y: placed.y - (placed.height ?? LAYOUT_NODE_DEFAULT_HEIGHT) / 2,
    });
  }
  return positions;
}

/**
 * 布局投影入口（design §4.2）：flow 模式直通 xyflow 内置布局（位置由调用方给定，
 * 本函数仅返回空投影）；hierarchy 模式用 dagre 分层。
 */
export function computeGraphLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  layout: GraphLayout,
  orientation: GraphOrientation,
): GraphLayoutProjection {
  const sanitized = sanitizeGraphData(nodes, edges);
  if (layout === 'hierarchy') {
    return {
      positions: computeHierarchyPositions(sanitized.nodes, sanitized.edges, orientation),
      layoutedEdges: sanitized.edges,
      skippedEdges: sanitized.skippedEdges,
    };
  }
  return {
    positions: new Map<string, GraphPosition>(),
    layoutedEdges: sanitized.edges,
    skippedEdges: sanitized.skippedEdges,
  };
}
