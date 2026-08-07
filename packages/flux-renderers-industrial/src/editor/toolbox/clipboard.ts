import type { ScadaConfigDiff, ScadaSymbolNode } from '../../serialization/config-types.js';

/**
 * 复制粘贴（编辑器内 clipboard，design-toolbox.md §4.3）。
 *
 * clipboard 域内部持有（编辑会话 ref 持有，不进 scope，不接 OS clipboard T2）。
 * 粘贴分配新 id（`${原id}-copy-${counter}`，编辑会话维护 counter 防 T4 冲突）+ 位移偏移。
 *
 * 纯逻辑核心（无 React / leafer 依赖 / 无 IO），Vitest 单测先行。host（use-editor-engine）
 * 持有 clipboard ref + pasteCounter，经本模块函数构造 diff，再走 addSymbol/removeSymbol 路径入栈。
 */

export interface EditorClipboard {
  /** 深拷贝的图元节点副本（含 children 递归副本）。 */
  symbols: ScadaSymbolNode[];
  /** 操作类型（粘贴位移语义用）。 */
  operation: 'copy' | 'cut';
  /** 复制/剪切时间戳。 */
  timestamp: number;
}

/** 粘贴位移偏移（避免与原图元重叠，design-toolbox.md §4.3 建议 +20px/+20px）。 */
export const PASTE_OFFSET = { x: 20, y: 20 } as const;

/**
 * 复制：深拷贝 selection → clipboard（不修改 working copy）。
 */
export function buildClipboardCopy(nodes: ScadaSymbolNode[]): EditorClipboard {
  return {
    symbols: nodes.map(cloneNodeDeep),
    operation: 'copy',
    timestamp: Date.now(),
  };
}

/**
 * 剪切：深拷贝 selection → clipboard + 产出 forward diff = `{removed: [...ids]}`（结构 diff）。
 */
export function buildClipboardCut(nodes: ScadaSymbolNode[]): {
  clipboard: EditorClipboard;
  forward: ScadaConfigDiff;
} {
  const clipboard: EditorClipboard = {
    symbols: nodes.map(cloneNodeDeep),
    operation: 'cut',
    timestamp: Date.now(),
  };
  const forward: ScadaConfigDiff = {
    added: [],
    removed: nodes.map((n) => n.id),
    updated: [],
  };
  return { clipboard, forward };
}

/**
 * 粘贴：读 clipboard → 为每个图元分配新 id（防 T4 冲突）+ 位移偏移 → forward diff = `{added: [...新节点]}`。
 *
 * @param clipboard 编辑器 clipboard（copy/cut 产物）
 * @param pasteCounter 编辑会话维护的粘贴计数器（保证 id 唯一；调用方每次粘贴后递增）
 * @param offset 位移偏移（缺省 PASTE_OFFSET）
 * @returns forward diff + 新 id 列表（用于新 selection）+ 本次粘贴消耗的 counter 增量
 */
export function buildClipboardPaste(
  clipboard: EditorClipboard,
  pasteCounter: number,
  offset: { x: number; y: number } = PASTE_OFFSET,
): {
  forward: ScadaConfigDiff;
  newIds: string[];
  counterConsumed: number;
} {
  const newNodes: ScadaSymbolNode[] = [];
  const newIds: string[] = [];
  let counter = pasteCounter;
  for (const node of clipboard.symbols) {
    counter += 1;
    const clone = cloneNodeDeep(node);
    const newId = `${node.id}-copy-${counter}`;
    reassignIdsRecursive(clone, newId);
    clone.x = (clone.x ?? 0) + offset.x;
    clone.y = (clone.y ?? 0) + offset.y;
    newNodes.push(clone);
    newIds.push(newId);
  }
  return {
    forward: { added: newNodes, removed: [], updated: [] },
    newIds,
    counterConsumed: counter - pasteCounter,
  };
}

/**
 * 递归重分配 id（顶层用新 id；group 子节点用 `${newId}-${原childId}` 保持唯一）。
 */
function reassignIdsRecursive(node: ScadaSymbolNode, newId: string): void {
  node.id = newId;
  if (node.children) {
    for (const child of node.children) {
      reassignIdsRecursive(child, `${newId}-${child.id}`);
    }
  }
}

function cloneNodeDeep(node: ScadaSymbolNode): ScadaSymbolNode {
  const clone: ScadaSymbolNode = { ...node };
  if (node.children) clone.children = node.children.map(cloneNodeDeep);
  // plan 2026-08-08-0900-1 Phase 1 / P2 #4：深克隆 custom（含 connections 等嵌套数组）——
  // 先前 `{...node.custom}` 浅克隆使 clipboard 与源节点共享 connections 数组引用，粘贴/undo 后串改。
  if (node.custom) clone.custom = structuredClone(node.custom);
  return clone;
}
