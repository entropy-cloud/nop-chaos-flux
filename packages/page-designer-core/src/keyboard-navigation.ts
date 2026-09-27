/**
 * 键盘漫游导航索引（S4-1，roadmap S4「键盘漫游」）。
 *
 * 导航顺序 = 结构树前序遍历（与 StructureTree 行序一致：容器展开、
 * opaque-leaf 不展开）。方向键语义：
 * - `ArrowUp` / `ArrowDown`：前/后一行；
 * - `ArrowLeft`：跳到最近祖先（`depth-1`）；根层返回 `null`；
 * - `ArrowRight`：跳到第一个子节点（下一行 `depth+1`）；叶子返回 `null`。
 *
 * 纯函数面：命令通道归宿主（选中 → `core.setSelection`，删除 → `dispatch removeNode`）。
 */

import type { RendererRegistry, SchemaInput } from '@nop-chaos/flux-core';
import type { SessionNodeId } from './types.js';
import { classifyNode } from './classify.js';
import { getSessionId } from './round-trip.js';
import { getChildContainerKeys, getRegionChildren } from './tree-navigation.js';

export interface KeyboardNavRow {
  sid: SessionNodeId;
  type: string;
  depth: number;
}

export type KeyboardNavKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

/** 文档 → 前序遍历导航行（与 StructureTree 行序/深度一致）。 */
export function buildKeyboardNavRows(doc: SchemaInput, registry: RendererRegistry): KeyboardNavRow[] {
  const out: KeyboardNavRow[] = [];
  const visit = (value: unknown, depth: number): void => {
    const node = value as SchemaInput;
    if (Array.isArray(node)) {
      (node as unknown[]).forEach((item) => visit(item, depth));
      return;
    }
    const sid = getSessionId(node);
    if (!sid) return;
    const record = node as unknown as Record<string, unknown>;
    out.push({ sid, type: record.type as string, depth });
    const definition = registry.get(record.type as string);
    if (definition && classifyNode(definition) === 'opaque-leaf') return;
    const { keys } = getChildContainerKeys(node, registry);
    for (const key of keys) {
      getRegionChildren(node, key).forEach((child) => visit(child, depth + 1));
    }
  };
  visit(doc, 0);
  return out;
}

/**
 * 方向键 → 目标节点 sid。无移动（越界/无子/无父/未知当前节点）返回 `null`。
 * 未选中（`currentSid = null`）时 `ArrowDown` 选中首行。
 */
export function resolveKeyboardMove(
  rows: readonly KeyboardNavRow[],
  currentSid: SessionNodeId | null,
  key: KeyboardNavKey,
): SessionNodeId | null {
  if (rows.length === 0) return null;
  if (currentSid === null) {
    return key === 'ArrowDown' ? rows[0].sid : null;
  }
  const index = rows.findIndex((row) => row.sid === currentSid);
  if (index < 0) return null;
  const current = rows[index];
  switch (key) {
    case 'ArrowUp':
      return index > 0 ? rows[index - 1].sid : null;
    case 'ArrowDown':
      return index < rows.length - 1 ? rows[index + 1].sid : null;
    case 'ArrowLeft': {
      for (let i = index - 1; i >= 0; i -= 1) {
        if (rows[i].depth < current.depth) return rows[i].sid;
      }
      return null;
    }
    case 'ArrowRight': {
      const next = rows[index + 1];
      return next && next.depth === current.depth + 1 ? next.sid : null;
    }
    default:
      return null;
  }
}
