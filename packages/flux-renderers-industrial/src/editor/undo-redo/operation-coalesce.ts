import type { ScadaConfigDiff, ScadaSymbolNode } from '../../serialization/config-types.js';
import type { EditorOperationKind, UndoStackEntry } from './undo-stack.js';

/**
 * 跨操作合并（M2 基础，design-undo-redo.md §4.4）。
 *
 * M2 合并规则（§4.4 表）：
 * - 同 nodeId + 同字段 + 时间窗口 ≤500ms 的 `update-symbol`/`property-edit` 合并为 1 个 diff（最终值）。
 * - 连续 transform（同 op，时间窗口内）**不合**——每次 pointerup 是独立事务（spike §2.5 节流起止帧已隐含事务边界）。
 * - 连续 connection 端点拖动（同 connectionId）**不合**——每次 pointerup 是独立事务。
 *
 * M3 完善（E9.1）：更复杂合并策略 + 用户可配置合并窗口 + 撤销粒度感知优化。
 *
 * 纯逻辑（无 React / leafer 依赖），Vitest 单测先行。
 */

/** M2 默认合并窗口（design-undo-redo.md §4.4 表）。 */
export const DEFAULT_COALESCE_WINDOW_MS = 500;

/**
 * 判定新 entry 是否应与栈顶合并，并返回合并后的 entry（或 undefined 表示不合）。
 *
 * 合中条件（全部满足）：
 * 1. 栈顶存在 + 栈顶 operationKind ∈ {`update-symbol`, `property-edit`}；
 * 2. 新 entry operationKind ∈ {`update-symbol`, `property-edit`}；
 * 3. 新 entry 与栈顶 forward.updated **恰好同 1 个 nodeId + 同字段集合**；
 * 4. 时间差 ≤ windowMs；
 * 5. forward.added/removed 均为空（纯属性更新，非结构 diff）。
 *
 * 合并产出：
 * - forward.updated = [{ id, patch: { ...栈顶原 patch, ...新 patch } }]（新值覆盖，最终值）；
 * - inverse.updated = [{ id, patch: 栈顶 inverse 的原值 patch }]（保留入栈前的原始值，撤销回到最初）；
 * - operationKind = `property-edit`；timestamp = 新 entry timestamp。
 */
export function tryCoalesce(
  top: UndoStackEntry | undefined,
  incoming: UndoStackEntry,
  windowMs: number = DEFAULT_COALESCE_WINDOW_MS,
): UndoStackEntry | undefined {
  if (!top) return undefined;
  if (!isCoalescable(top.operationKind) || !isCoalescable(incoming.operationKind)) return undefined;
  if (incoming.timestamp - top.timestamp > windowMs) return undefined;

  const topUpdate = singleNodeUpdate(top.forward);
  const incomingUpdate = singleNodeUpdate(incoming.forward);
  if (!topUpdate || !incomingUpdate) return undefined;
  if (topUpdate.id !== incomingUpdate.id) return undefined;
  if (!sameFieldSet(topUpdate.patch, incomingUpdate.patch)) return undefined;

  // 合并：forward 取最终值（incoming patch 覆盖 top patch）；inverse 保留栈顶的原值（撤销回到合并前最初）。
  const mergedForward: ScadaConfigDiff = {
    added: [],
    removed: [],
    updated: [
      {
        id: topUpdate.id,
        patch: { ...topUpdate.patch, ...incomingUpdate.patch } as Partial<ScadaSymbolNode>,
      },
    ],
  };
  const topInverseUpdate = singleNodeUpdate(top.inverse);
  const mergedInverse: ScadaConfigDiff = {
    added: [],
    removed: [],
    updated: topInverseUpdate
      ? [{ id: topInverseUpdate.id, patch: { ...topInverseUpdate.patch } }]
      : [],
  };

  return {
    forward: mergedForward,
    inverse: mergedInverse,
    operationKind: 'property-edit',
    timestamp: incoming.timestamp,
  };
}

function isCoalescable(kind: EditorOperationKind): boolean {
  return kind === 'update-symbol' || kind === 'property-edit';
}

/** 若 diff 是「单 nodeId + 纯属性更新（added/removed 空）」则返回该 update，否则 undefined。 */
function singleNodeUpdate(diff: ScadaConfigDiff): { id: string; patch: Partial<ScadaSymbolNode> } | undefined {
  if (diff.added.length > 0 || diff.removed.length > 0) return undefined;
  if (diff.updated.length !== 1) return undefined;
  return diff.updated[0];
}

function sameFieldSet(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k, i) => k === bKeys[i]);
}
