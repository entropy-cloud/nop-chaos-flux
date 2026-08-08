import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';
import type { ScadaEditorSession } from './editor-session.js';
import { recomputeJunctionAfterMove, collectSymbolBounds } from './connection/connection-adapter.js';

/**
 * working copy 纯函数助手集（design-connection.md §4.4/§4.5 + design-undo-redo.md §4.1.1）。
 *
 * 从 `use-editor-engine.ts` 抽出以控制文件行数（max-lines）。无 React / leafer 依赖，
 * 经编辑会话闭包与 runtime 命令面共享同一份语义。
 */

/**
 * 递归发现全部节点（含 group 嵌套子树）。
 *
 * plan 2026-08-07-1835-1 Phase 2 共享 walker：P1-C1（junction 发现递归）/ P1-C2（selection 解析递归）/
 * P1-C4（listAllConnections dangling 检测，同根因 P2 顺手覆盖）共同消费。区别于「flat `for of symbols` 顶层」，
 * 递归保证嵌套子树可达。
 */
export function collectAllSymbols(symbols: ScadaSymbolNode[]): ScadaSymbolNode[] {
  const out: ScadaSymbolNode[] = [];
  const walk = (nodes: ScadaSymbolNode[]): void => {
    for (const node of nodes) {
      out.push(node);
      if (node.children) walk(node.children);
    }
  };
  walk(symbols);
  return out;
}

/**
 * 计算全部节点（含 group 嵌套）的世界 bounds，**累加 parent offset**（plan 2026-08-07-1835-1 Phase 2 / P1-02）。
 *
 * group 子节点的 `(x,y)` 是 parent-relative（leafer scene-graph 父子变换合成），消费端（吸附 / 命中 / 联动）
 * 比较的是世界坐标——若直接读 `node.x` 当世界，group world (300,200) 时偏差 300px。
 *
 * @param ox parent 累计 x offset（递归调用传 child.x + parent.x）
 * @param oy parent 累计 y offset
 * @returns 节点世界 bounds 列表（已含 parent offset 累加）
 */
export function collectWorldBounds(
  symbols: ScadaSymbolNode[],
  ox = 0,
  oy = 0,
): Array<{ id: string; x: number; y: number; width: number; height: number }> {
  const out: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
  for (const node of symbols) {
    const nx = (node.x ?? 0) + ox;
    const ny = (node.y ?? 0) + oy;
    const nw = node.width ?? 0;
    const nh = node.height ?? 0;
    out.push({ id: node.id, x: nx, y: ny, width: nw, height: nh });
    if (node.children) {
      // 递归 children 时累加当前节点 offset，使 group 嵌套子节点的世界坐标正确。
      const childBounds = collectWorldBounds(node.children, nx, ny);
      for (const cb of childBounds) out.push(cb);
    }
  }
  return out;
}

/**
 * Deep snapshot of config for diff comparison (symbols + nested children deep-cloned).
 *
 * plan 2026-08-07-1835-1 Phase 3 / multi P1-01：先前浅克隆（顶层 spread + children 数组共享）使
 * group-child 在 prevSnapshot 与 working copy 间共享同一子节点 ref → applyPatchToWorkingNode 就地 mutate
 * 命中两份 snapshot → diffScadaConfig 经 equality.ts `a === b` 返 true → diff 为空 → grouped-child 编辑
 * 不入栈（数据丢失）。深克隆（复用 undo-redo-adapter.cloneNodeDeep 递归）使子树 identity 变化，diff 非空。
 */
export function cloneConfigSnapshot(config: ScadaConfig): ScadaConfig {
  return {
    ...config,
    symbols: config.symbols.map(cloneNodeDeep),
    ...(config.variables ? { variables: [...config.variables] } : {}),
  };
}

/** 递归深克隆图元（含 group children 子树；与 undo-redo-adapter.cloneNodeDeep 同语义）。 */
function cloneNodeDeep(node: ScadaSymbolNode): ScadaSymbolNode {
  const clone: ScadaSymbolNode = { ...node };
  // plan HCA11 P2-1（扩展 P2 #4）：深克隆 custom——与 editor-session.cloneNode 同纪律，使 prevSnapshot /
  // synced.config / committedBaseline 与 working copy 间 custom 子对象引用隔离，任一 in-place 改
  // custom.connections 不串改多份。对齐本函数 doc「deep-cloned」声明。
  if (node.custom) clone.custom = structuredClone(node.custom);
  if (node.children) clone.children = node.children.map(cloneNodeDeep);
  return clone;
}

/** 在 working copy 中按 id 递归查找节点（含 group 子树）。 */
export function findNodeInWorking(symbols: ScadaSymbolNode[], id: string): ScadaSymbolNode | undefined {
  for (const node of symbols) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeInWorking(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** 在 working copy 中按 id 递归查找节点并应用 patch（含 group 子树）。 */
export function applyPatchToWorkingNode(
  session: ScadaEditorSession,
  nodeId: string,
  patch: Partial<ScadaSymbolNode>,
): void {
  const node = findNodeInWorking(session.workingConfig.symbols, nodeId);
  if (node) {
    Object.assign(node, patch);
  }
}

/**
 * 图元移动联动（design-connection.md §4.4 + §4.5）：被移动的节点若是某个 pipe-junction connection 的目标设备，
 * 则重算该 connection 的 x/y；若被移动的节点本身是 pipe-junction 主体，重算其全部 connection。
 *
 * 遍历 working copy 中所有 pipe-junction 节点的 connections，凡 target === nodeId 或 节点本身是 junction 的，
 * 经 recomputeJunctionAfterMove 重算 → applyPatchToWorkingNode 写回（不派发 symbol:* action，R5 隔离）。
 *
 * plan 2026-08-07-1835-1 Phase 2 / open P1-C1：junction 发现循环改递归 `collectAllSymbols`，
 * 嵌套在 group 子树内的 pipe-junction 现在可达（此前 `for of symbols` 顶层只漏掉嵌套 junction，
 * target 移动后 connection x/y 永不重算）。
 *
 * plan 2026-08-07-1835-2 Phase 4 / multi P1-13：消除 per-frame O(n²)。此前 k-loop 内逐 junction 调 O(n)
 * `findNodeInWorking`（k junctions × O(n) = O(k·n)），且 recomputeJunctionAfterMove 内部每次重算
 * `collectSymbolBounds`（再 O(n)）。现顶部一次 `collectAllSymbols` 建 `Map<id,node>` O(1) lookup +
 * 一次 collectSymbolBounds 复用跨 junction（传 precomputedBounds），单帧收敛为 O(n + k)。
 */
export function recomputeLinkagesForMovedNode(session: ScadaEditorSession, movedNodeId: string): void {
  const symbols = session.workingConfig.symbols;
  const allSymbols = collectAllSymbols(symbols);
  const nodeById = new Map<string, ScadaSymbolNode>(allSymbols.map((n) => [n.id, n]));
  const movedIsJunction = nodeById.get(movedNodeId)?.type === 'scada-pipe-junction';
  const junctionsToRecompute: string[] = [];
  if (movedIsJunction) {
    junctionsToRecompute.push(movedNodeId);
  }
  // 收集所有 target 指向被移动节点的 pipe-junction（递归含 group 嵌套）。
  for (const node of allSymbols) {
    if (node.type !== 'scada-pipe-junction') continue;
    const conns = node.custom?.connections;
    if (!Array.isArray(conns)) continue;
    if (movedNodeId !== node.id && conns.some((c) => (c as { target?: string }).target === movedNodeId)) {
      junctionsToRecompute.push(node.id);
    }
  }
  if (junctionsToRecompute.length === 0) return;
  // plan 2026-08-07-1835-2 Phase 4 / P1-13：bounds 复用——一次 collectSymbolBounds 跨全部 junction
  // （recomputeJunctionAfterMove 接 precomputedBounds 跳过内部重算，去掉 k × O(n) bounds 重建）。
  const sharedBounds = collectSymbolBounds(symbols);
  for (const junctionId of junctionsToRecompute) {
    const junctionNode = nodeById.get(junctionId);
    if (!junctionNode || junctionNode.type !== 'scada-pipe-junction') continue;
    const updates = recomputeJunctionAfterMove({ junctionNode, symbols, precomputedBounds: sharedBounds });
    if (!updates || updates.length === 0) continue;
    const existing = Array.isArray(junctionNode.custom?.connections) ? [...(junctionNode.custom!.connections as never[])] : [];
    const byId = new Map(updates.map((u) => [u.connectionId, u.point]));
    const nextConnections = existing.map((c) => {
      const point = byId.get((c as { id: string }).id);
      return point ? { ...(c as object), x: point.x, y: point.y } : c;
    });
    // plan 2026-08-07-1835-2 Phase 4 / P1-13：applyPatch 直接写预解析 node ref（nodeById.get），
    // 不再经 applyPatchToWorkingNode 的 O(n) findNodeInWorking 重查。
    Object.assign(junctionNode, { custom: { ...junctionNode.custom, connections: nextConnections } });
  }
}
