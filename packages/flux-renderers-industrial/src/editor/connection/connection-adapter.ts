import type { ScadaPipeConnection } from '../../symbols/pipe/pipe-junction.js';
import type { ScadaSymbolNode } from '../../serialization/config-types.js';
import {
  findSnapCandidate,
  generateConnectionId,
  readConnections,
  type ScadaSymbolBounds,
  type SnapCandidate,
  type WorldPoint,
} from './anchor-snap.js';
import {
  recomputeConnectionAnchor,
  recomputeJunctionConnections,
  type LinkGeometry,
} from './connection-link.js';

/**
 * 端点拾起/拖动/释放三段式交互适配层（design-connection.md §4.2 + §4.3）。
 *
 * **核心纪律（R5 隔离 + spike §2.5）**：
 * 1. **不派发 `symbol:*` action**——连线编辑只更新 working copy custom.connections 声明（§8.1）。
 * 2. **与 Editor transform 模式互斥**——端点拖动模式启用时 Editor 不接管 pointer（§4.2 关键约束 1）。
 * 3. **维护「当前编辑中的 connectionId」**——单一活动端点拖动（C3 防护）。
 * 4. **connection.id 自动生成**（`${junctionId}-conn-${index}`，C4 防护）。
 *
 * 适配层是纯逻辑状态机（无 React / leafer 直接依赖）：UI/overlay 经 ConnectionDragState 派生，
 * 写回 working copy 经 `commitConnectionDrag` 返回结果，由 host 转 updateSymbol 句柄。
 */

/** pipe-junction working copy 节点（custom.connections 宿主）。 */
export type JunctionNode = ScadaSymbolNode;

/** 端点拖动状态（适配层域内部 ref 持有，§7）。 */
export interface ConnectionDragState {
  /** 起始 junctionId（端点宿主）。 */
  junctionId: string;
  /** 编辑中的 connectionId（C3 单一活动端点）。 */
  connectionId: string;
  /** 是否折线重拖（起始 connection 已存在，§4.3）。 */
  isRedrag: boolean;
  /** 起始 connection 快照（折线重拖恢复用，§4.3 M2 默认恢复原 connection）。 */
  originalConnection?: ScadaPipeConnection;
  /** 当前吸附候选（pointermove 时算出，pointerup 时消费，§7）。 */
  currentCandidate?: SnapCandidate;
}

/**
 * 抽取 working copy 中所有图元的世界几何（候选查询 + 联动用）。
 *
 * 含 group 子树（递归 children），扁平化为 bounds 列表。
 */
export function collectSymbolBounds(symbols: ScadaSymbolNode[]): ScadaSymbolBounds[] {
  const out: ScadaSymbolBounds[] = [];
  const walk = (nodes: ScadaSymbolNode[]): void => {
    for (const node of nodes) {
      out.push({
        id: node.id,
        x: node.x ?? 0,
        y: node.y ?? 0,
        width: node.width ?? 0,
        height: node.height ?? 0,
      });
      if (node.children) walk(node.children);
    }
  };
  walk(symbols);
  return out;
}

/**
 * (a) 端点拾起：进入「端点拖动模式」（§4.2 a）。
 *
 * 记录起始 junctionId + connectionId；若是折线重拖（connection 已存在），快照原 connection
 * 以备释放到空白区恢复（§4.3 M2 默认行为）。
 *
 * 返回新建的 ConnectionDragState（host 经此驱动 overlay 高亮 + cursor 切换）。
 */
export function beginConnectionDrag(args: {
  junctionId: string;
  connectionId?: string;
  existingConnection?: ScadaPipeConnection;
}): ConnectionDragState {
  const existing = args.existingConnection;
  const isRedrag = args.connectionId !== undefined && existing !== undefined;
  return {
    junctionId: args.junctionId,
    connectionId: args.connectionId ?? generateConnectionId(args.junctionId, []),
    isRedrag,
    originalConnection: isRedrag && existing ? { ...existing } : undefined,
  };
}

/**
 * (b) 端点拖动 + 吸附候选：计算 pointer 世界坐标 → 查找吸附候选（§4.2 b）。
 *
 * 候选查询经 anchor-snap findSnapCandidate（复用 hit.ts getByPoint 预检后的 candidates，
 * §4.2 关键约束 3 不重复实现命中）。原地更新 state.currentCandidate 并返回 state（便于链式）。
 */
export function updateDragCandidate(
  state: ConnectionDragState,
  args: {
    worldPoint: WorldPoint;
    candidates: ScadaSymbolBounds[];
    threshold?: number;
  },
): ConnectionDragState {
  state.currentCandidate = findSnapCandidate({
    worldPoint: args.worldPoint,
    candidates: args.candidates,
    threshold: args.threshold,
    excludeIds: [state.junctionId],
  });
  return state;
}

/** 连线写入结果（host 经此驱动 updateSymbol 句柄 + undo 栈）。 */
export interface ConnectionWriteResult {
  junctionId: string;
  /** 写入后的完整 connections 数组（替换 custom.connections）。 */
  connections: ScadaPipeConnection[];
  /** 写入的 connection。 */
  written: ScadaPipeConnection;
  /** 操作类型：新建端点 / 折线重拖覆盖。 */
  kind: 'create' | 'redrag';
}

/**
 * (c) 端点释放 + 写入 connections（§4.2 c + §4.3）。
 *
 * - 有吸附候选 → 写入 connection.target/x/y（新端点 create / 折线重拖 redrag 覆盖原）。
 * - 无吸附候选 → noop：新端点不写入；折线重拖恢复原 connection（§4.3 M2 默认，working copy
 *   在拖动期间未变，原 connection 仍在，无需写回）。
 *
 * 返回 ConnectionWriteResult 由 host 转 updateSymbol 句柄（`{custom:{connections}}`）；
 * 返回 undefined 表示无变更（noop）。**不派发 symbol:* action**（R5 隔离）。
 */
export function commitConnectionDrag(
  state: ConnectionDragState,
  junctionNode: JunctionNode | undefined,
): ConnectionWriteResult | undefined {
  const candidate = state.currentCandidate;
  if (!candidate) return undefined;

  const connections = junctionNode ? readConnections(junctionNode.custom) : [];
  const written: ScadaPipeConnection = {
    id: state.connectionId,
    x: candidate.normalizedPoint.x,
    y: candidate.normalizedPoint.y,
    direction: state.originalConnection?.direction ?? 'out',
    target: candidate.nodeId,
  };

  const idx = connections.findIndex((c) => c.id === state.connectionId);
  const next = [...connections];
  if (idx >= 0) {
    next[idx] = written;
  } else {
    next.push(written);
  }

  return {
    junctionId: state.junctionId,
    connections: next,
    written,
    kind: state.isRedrag ? 'redrag' : 'create',
  };
}

/**
 * 图元移动联动（§4.4 + §4.5）：目标设备或 junction 主体移动后重算 connection.x/y。
 *
 * 对 junction 主体上所有 connection，经 connection.target 反查目标设备当前几何 →
 * recomputeConnectionAnchor 重算 → 返回需写回的新归一化点列表。
 *
 * dangling connection（target 不存在）跳过（§4.4）。
 * 返回 undefined 表示无需写回（无 connection 或全部 dangling）。
 */
export function recomputeJunctionAfterMove(args: {
  junctionNode: JunctionNode;
  symbols: ScadaSymbolNode[];
}): Array<{ connectionId: string; point: { x: number; y: number } }> | undefined {
  const connections = readConnections(args.junctionNode.custom);
  if (connections.length === 0) return undefined;
  const bounds = collectSymbolBounds(args.symbols);
  const deviceBoundsById = new Map<string, LinkGeometry>();
  for (const b of bounds) {
    if (b.id !== args.junctionNode.id) deviceBoundsById.set(b.id, b);
  }
  const result = recomputeJunctionConnections({
    junction: {
      x: args.junctionNode.x ?? 0,
      y: args.junctionNode.y ?? 0,
      width: args.junctionNode.width ?? 0,
      height: args.junctionNode.height ?? 0,
    },
    connections,
    deviceBoundsById,
  });
  return result.length > 0 ? result : undefined;
}

/**
 * 程序化连线（测试句柄 connect 消费，§8.3）：写入 connection 到 junction custom.connections。
 *
 * 不经过拖动状态机（e2e 直接构造结果），经联动算法算归一化点让 stub 终点 = 目标设备锚点世界坐标。
 */
export function programmaticConnect(args: {
  junctionNode: JunctionNode | undefined;
  connectionId: string;
  targetNodeId: string;
  targetAnchor: { x: number; y: number };
  direction?: 'in' | 'out' | 'bidirectional';
  /** 目标设备几何（计算归一化点用，§4.1 换算）。 */
  targetDevice: LinkGeometry;
  /** pipe-junction 主体几何。 */
  junction: LinkGeometry;
}): { connections: ScadaPipeConnection[]; written: ScadaPipeConnection } {
  const connections = args.junctionNode ? readConnections(args.junctionNode.custom) : [];
  const point = recomputeConnectionAnchor({
    connection: { id: args.connectionId, target: args.targetNodeId, direction: args.direction ?? 'out' },
    junction: args.junction,
    targetDevice: args.targetDevice,
    targetAnchor: args.targetAnchor,
  });
  const existing = connections.findIndex((c) => c.id === args.connectionId);
  const written: ScadaPipeConnection = {
    id: args.connectionId,
    x: point.x,
    y: point.y,
    direction: args.direction ?? 'out',
    target: args.targetNodeId,
  };
  const next = [...connections];
  if (existing >= 0) next[existing] = written;
  else next.push(written);
  return { connections: next, written };
}

/**
 * 程序化断开（测试句柄 disconnect 消费，§8.3）：从 custom.connections 移除指定 connectionId。
 * 返回 undefined 表示 connectionId 不存在。
 */
export function programmaticDisconnect(args: {
  junctionNode: JunctionNode | undefined;
  connectionId: string;
}): { connections: ScadaPipeConnection[]; removed: ScadaPipeConnection } | undefined {
  const connections = args.junctionNode ? readConnections(args.junctionNode.custom) : [];
  const idx = connections.findIndex((c) => c.id === args.connectionId);
  if (idx < 0) return undefined;
  const removed = connections[idx];
  const next = connections.filter((c) => c.id !== args.connectionId);
  return { connections: next, removed };
}

/**
 * 查询 working copy 全部 connections（测试句柄 listConnections 消费，§8.3）。
 *
 * 含 dangling 标记（target 不存在或 target === undefined 视为 dangling，§4.4）。
 */
export function listAllConnections(args: {
  symbols: ScadaSymbolNode[];
}): Array<{ junctionId: string; connection: ScadaPipeConnection; dangling: boolean }> {
  const ids = new Set(args.symbols.map((s) => s.id));
  const out: Array<{ junctionId: string; connection: ScadaPipeConnection; dangling: boolean }> = [];
  const walk = (nodes: ScadaSymbolNode[]): void => {
    for (const node of nodes) {
      const connections = readConnections(node.custom);
      for (const connection of connections) {
        const dangling = connection.target === undefined || !ids.has(connection.target);
        out.push({ junctionId: node.id, connection, dangling });
      }
      if (node.children) walk(node.children);
    }
  };
  walk(args.symbols);
  return out;
}
