import type { ScadaConfigDiff, ScadaSymbolNode } from '../../serialization/config-types.js';
import type { EditorOperationKind, UndoStackEntry } from './undo-stack.js';

/**
 * 跨操作合并（M2 基础 + M3 完善，design-undo-redo.md §4.4）。
 *
 * M2 合并规则（§4.4 表）：
 * - 同 nodeId + 同字段 + 时间窗口 ≤500ms 的 `update-symbol`/`property-edit` 合并为 1 个 diff（最终值）。
 * - 连续 transform（同 op，时间窗口内）**不合**——每次 pointerup 是独立事务（spike §2.5 节流起止帧已隐含事务边界）。
 * - 连续 connection 端点拖动（同 connectionId）**不合**——每次 pointerup 是独立事务。
 *
 * M3 完善（E9.1，§4.4 跨操作合并策略扩展）：
 * - 连续同方向对齐/分布合并：entry.coalesceGroup 非空（如 `align:left`/`distribute:horizontal`）+
 *   栈顶同 group + 时间窗口内 → 合并为 1 步（forward 取最终态，inverse 保留栈顶原态）。
 * - 连续层级操作合并：entry.coalesceGroup（如 `zorder:toTop`）同规则。
 * - transform 族 drag 事务不设 coalesceGroup，不参与 group 合并（保持 pointerup 独立事务语义）。
 *
 * 纯逻辑（无 React / leafer 依赖），Vitest 单测先行。
 */

/** M2/M3 默认合并窗口（design-undo-redo.md §4.4 表）。 */
export const DEFAULT_COALESCE_WINDOW_MS = 500;

/**
 * 判定新 entry 是否应与栈顶合并，并返回合并后的 entry（或 undefined 表示不合）。
 *
 * 两条合并路径（先试 M2 属性合并，再试 M3 group 合并）：
 *
 * **M2 属性合并**（`update-symbol`/`property-edit`）：
 * 1. 栈顶 + 新 entry operationKind ∈ {`update-symbol`, `property-edit`}；
 * 2. forward.updated 恰好同 1 个 nodeId + 同字段集合；added/removed 空；
 * 3. 时间差 ≤ windowMs。
 * 合并产出：forward.updated = 最终值（新 patch 覆盖）；inverse.updated = 栈顶原值（撤销回最初）。
 *
 * **M3 group 合并**（对齐/分布/层级连续操作）：
 * 1. 栈顶 + 新 entry 均有非空且相等的 `coalesceGroup`；
 * 2. 时间差 ≤ windowMs。
 * 合并产出：forward = 新 entry forward（最新态）；inverse = 栈顶 inverse（最初态）；
 * operationKind/coalesceGroup 沿用；timestamp = 新 entry。
 */
export function tryCoalesce(
  top: UndoStackEntry | undefined,
  incoming: UndoStackEntry,
  windowMs: number = DEFAULT_COALESCE_WINDOW_MS,
): UndoStackEntry | undefined {
  if (!top) return undefined;

  // M3 group 合并路径（对齐/分布/层级连续操作）。
  if (top.coalesceGroup && top.coalesceGroup === incoming.coalesceGroup) {
    if (incoming.timestamp - top.timestamp > windowMs) return undefined;
    return {
      forward: incoming.forward,
      inverse: top.inverse,
      operationKind: incoming.operationKind,
      timestamp: incoming.timestamp,
      coalesceGroup: incoming.coalesceGroup,
    };
  }

  // M2 属性合并路径（同 nodeId + 同字段）。
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
