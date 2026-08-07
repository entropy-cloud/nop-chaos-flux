import type { ScadaConfig, ScadaSymbolNode } from '../serialization/config-types.js';
import type { ScadaEditorSession } from './editor-session.js';
import { recomputeJunctionAfterMove } from './connection/connection-adapter.js';

/**
 * working copy 纯函数助手集（design-connection.md §4.4/§4.5 + design-undo-redo.md §4.1.1）。
 *
 * 从 `use-editor-engine.ts` 抽出以控制文件行数（max-lines）。无 React / leafer 依赖，
 * 经编辑会话闭包与 runtime 命令面共享同一份语义。
 */

/** Shallow snapshot of config for diff comparison (symbols array cloned). */
export function cloneConfigSnapshot(config: ScadaConfig): ScadaConfig {
  return {
    ...config,
    symbols: config.symbols.map((s) => ({ ...s })),
    ...(config.variables ? { variables: [...config.variables] } : {}),
  };
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
 */
export function recomputeLinkagesForMovedNode(session: ScadaEditorSession, movedNodeId: string): void {
  const symbols = session.workingConfig.symbols;
  const movedIsJunction = findNodeInWorking(symbols, movedNodeId)?.type === 'scada-pipe-junction';
  const junctionsToRecompute: string[] = [];
  if (movedIsJunction) {
    junctionsToRecompute.push(movedNodeId);
  }
  // 收集所有 target 指向被移动节点的 pipe-junction。
  for (const node of symbols) {
    if (node.type !== 'scada-pipe-junction') continue;
    const conns = node.custom?.connections;
    if (!Array.isArray(conns)) continue;
    if (movedNodeId !== node.id && conns.some((c) => (c as { target?: string }).target === movedNodeId)) {
      junctionsToRecompute.push(node.id);
    }
  }
  for (const junctionId of junctionsToRecompute) {
    const junctionNode = findNodeInWorking(symbols, junctionId);
    if (!junctionNode || junctionNode.type !== 'scada-pipe-junction') continue;
    const updates = recomputeJunctionAfterMove({ junctionNode, symbols });
    if (!updates || updates.length === 0) continue;
    const existing = Array.isArray(junctionNode.custom?.connections) ? [...(junctionNode.custom!.connections as never[])] : [];
    const byId = new Map(updates.map((u) => [u.connectionId, u.point]));
    const nextConnections = existing.map((c) => {
      const point = byId.get((c as { id: string }).id);
      return point ? { ...(c as object), x: point.x, y: point.y } : c;
    });
    applyPatchToWorkingNode(session, junctionId, {
      custom: { ...junctionNode.custom, connections: nextConnections },
    });
  }
}
