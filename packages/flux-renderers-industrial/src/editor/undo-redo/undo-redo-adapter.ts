import type { ScadaConfig, ScadaConfigDiff, ScadaSymbolNode } from '../../serialization/config-types.js';
import { diffScadaConfig } from '../../serialization/diff.js';
import { computeInverse, applyDiffToConfig } from './compute-inverse.js';
import { UndoStack, type EditorOperationKind, type UndoStackEntry } from './undo-stack.js';
import { tryCoalesce } from './operation-coalesce.js';

/**
 * 事务语义 + 节流起止帧入栈适配层（design-undo-redo.md §4.2 + spike §2.5）。
 *
 * **防逐属性 applyAttrs 泄漏（§4.2）**：
 * - transform 事件族（editor.before_move/scale/rotate/skew 起始 → pointerup 终止）：事务期间只更新
 *   working copy，事务终止时一次性 diffScadaConfig(prevAtOpStart, current) → 入栈 1 个 diff。
 * - 高频每帧 editor.move/scale/rotate/skew **不入栈**（只更新 working copy + Editor 选区视觉）。
 * - add/remove/update-symbol 经句柄触发入栈（update-symbol 经 tryCoalesce 去抖合并）。
 * - connection-update（端点释放）+ connection-link（图元移动联动）入栈。
 *
 * 适配层是纯逻辑协调器（无 React / leafer 直接依赖）：host（use-editor-engine）经 commitTransaction /
 * pushSymbolOp 等 method 驱动入栈，undo/redo 经 host apply 到 working copy + engine.applyDiff。
 */

/**
 * UndoRedoAdapter —— 事务边界 + 入栈协调。
 *
 * 持有事务期间的 prevAtOpStart 快照（事务起始 working copy 快照）；事务终止时计算 diff + computeInverse + 入栈。
 * 栈本身由 UndoStack 管理（editor-session.undoStack），本适配器只管事务边界 + 入栈决策。
 */
export class UndoRedoAdapter {
  private inTransaction = false;
  private transactionKind: EditorOperationKind | undefined;
  private prevAtOpStart: ScadaConfig | undefined;

  constructor(private readonly stack: UndoStack) {}

  /**
   * 事务起始（transform 族 editor.before_<op> 触发）：快照当前 working copy。
   *
   * 若已在事务中，忽略（嵌套事务不合，spike §2.5 每事件族独立）。
   */
  beginTransaction(kind: EditorOperationKind, currentWorkingCopy: ScadaConfig): void {
    if (this.inTransaction) return;
    this.inTransaction = true;
    this.transactionKind = kind;
    this.prevAtOpStart = cloneConfig(currentWorkingCopy);
  }

  /**
   * 事务终止（pointerup 触发）：计算 diff + computeInverse + 入栈。
   *
   * 事务期间 working copy 已被适配层更新（每帧只更新 working copy，不入栈）；终止时一次性 diff 入栈。
   * 返回入栈的 entry（用于 host 同步 engine.applyDiff）；返回 undefined 表示无变更（空 diff）或无事务。
   */
  commitTransaction(currentWorkingCopy: ScadaConfig): UndoStackEntry | undefined {
    if (!this.inTransaction || !this.prevAtOpStart || !this.transactionKind) {
      this.abortTransaction();
      return undefined;
    }
    const kind = this.transactionKind;
    const prev = this.prevAtOpStart;
    this.inTransaction = false;
    this.transactionKind = undefined;
    this.prevAtOpStart = undefined;

    const forward = diffScadaConfig(prev, currentWorkingCopy);
    if (!hasChanges(forward)) return undefined;
    const inverse = computeInverse(forward, prev);
    const entry: UndoStackEntry = { forward, inverse, operationKind: kind, timestamp: now() };
    this.stack.push(entry);
    return entry;
  }

  /** 中止事务（不入栈；用于异常路径或事务期间 mode 切换）。 */
  abortTransaction(): void {
    this.inTransaction = false;
    this.transactionKind = undefined;
    this.prevAtOpStart = undefined;
  }

  /** 是否在事务中（host 判定是否跳过每帧入栈）。 */
  get isInTransaction(): boolean {
    return this.inTransaction;
  }

  /**
   * 单次操作入栈（add/remove/connection-update 等非 transform 操作）。
   *
   * 这些操作不经事务（每操作 = 1 个 diff）：host 在 apply 前/后快照 → 计算 diff + inverse → 入栈。
   * 本方法接收 host 已算好的 prev/current，内部 diff + computeInverse + 入栈（+ coalesce 决策）。
   *
   * @param coalesceGroup M3 跨操作合并分组键（对齐/分布/层级连续操作合并，design-undo-redo.md §4.4）
   *
   * 返回入栈（或合并后替换栈顶）的 entry；返回 undefined 表示空 diff。
   */
  pushOperation(
    kind: EditorOperationKind,
    prev: ScadaConfig,
    current: ScadaConfig,
    coalesceGroup?: string,
  ): UndoStackEntry | undefined {
    const forward = diffScadaConfig(prev, current);
    if (!hasChanges(forward)) return undefined;
    const inverse = computeInverse(forward, prev);
    // coalesce 决策：M2 属性合并（update-symbol/property-edit）+ M3 group 合并（coalesceGroup 非空）。
    const coalesced = tryCoalesce(this.stack.peekUndoTop(), {
      forward,
      inverse,
      operationKind: kind,
      timestamp: now(),
      ...(coalesceGroup !== undefined ? { coalesceGroup } : {}),
    });
    if (coalesced) {
      this.stack.replaceUndoTop(coalesced);
      return coalesced;
    }
    const entry: UndoStackEntry = {
      forward,
      inverse,
      operationKind: kind,
      timestamp: now(),
      ...(coalesceGroup !== undefined ? { coalesceGroup } : {}),
    };
    this.stack.push(entry);
    return entry;
  }

  /**
   * 直接构造 forward diff 入栈（add/remove 结构 diff，host 已知 diff 形状）。
   * 用于 addSymbol/removeSymbol/group/ungroup/clipboard/z-order 经 host 直接构造结构 diff 的路径。
   *
   * @param coalesceGroup M3 跨操作合并分组键（连续 z-order/对齐操作合并）
   * @param coalesce 是否尝试 M2 属性合并（默认 false；结构 diff 不走属性合并，走 group 合并）
   */
  pushForward(
    kind: EditorOperationKind,
    forward: ScadaConfigDiff,
    prevSnapshot: ScadaConfig,
    coalesce: boolean = false,
    coalesceGroup?: string,
  ): UndoStackEntry | undefined {
    if (!hasChanges(forward)) return undefined;
    const inverse = computeInverse(forward, prevSnapshot);
    const entry: UndoStackEntry = {
      forward,
      inverse,
      operationKind: kind,
      timestamp: now(),
      ...(coalesceGroup !== undefined ? { coalesceGroup } : {}),
    };
    if (coalesce || coalesceGroup !== undefined) {
      const merged = tryCoalesce(this.stack.peekUndoTop(), entry);
      if (merged) {
        this.stack.replaceUndoTop(merged);
        return merged;
      }
    }
    this.stack.push(entry);
    return entry;
  }

  /**
   * undo：pop undoStack → 返回 inverse diff（host apply 到 working copy + engine.applyDiff）。
   * 返回 undefined 表示栈空（边界提示：无可撤销操作，§4.5）。
   */
  undo(): ScadaConfigDiff | undefined {
    const entry = this.stack.popForUndo();
    return entry?.inverse;
  }

  /**
   * redo：pop redoStack → 返回 forward diff（host apply）。
   * 返回 undefined 表示栈空（边界提示：无可重做操作，§4.5）。
   */
  redo(): ScadaConfigDiff | undefined {
    const entry = this.stack.popForRedo();
    return entry?.forward;
  }

  /** apply 一条 diff 到 config（host 经此维护 working copy 一致性）。 */
  applyDiff(config: ScadaConfig, diff: ScadaConfigDiff): ScadaConfig {
    return applyDiffToConfig(config, diff);
  }
}

function hasChanges(diff: ScadaConfigDiff): boolean {
  return (
    diff.added.length > 0 ||
    diff.removed.length > 0 ||
    diff.updated.length > 0 ||
    diff.variables !== undefined
  );
}

function now(): number {
  return Date.now();
}

function cloneConfig(config: ScadaConfig): ScadaConfig {
  return structuredCloneSafe(config);
}

/**
 * 深拷贝 config（与 editor-session cloneConfig 同语义；这里独立实现避免循环依赖）。
 * symbols/variables/viewport/background 全深拷贝，使事务快照与 working copy 引用隔离。
 */
function structuredCloneSafe(config: ScadaConfig): ScadaConfig {
  return {
    version: 1,
    ...(config.viewport !== undefined ? { viewport: { ...config.viewport } } : {}),
    ...(config.background !== undefined ? { background: structuredClone(config.background) } : {}),
    ...(config.variables !== undefined ? { variables: config.variables.map((v) => ({ ...v })) } : {}),
    symbols: config.symbols.map(cloneNodeDeep),
  };
}

function cloneNodeDeep(node: ScadaSymbolNode): ScadaSymbolNode {
  const clone: ScadaSymbolNode = { ...node };
  if (node.children) clone.children = node.children.map(cloneNodeDeep);
  return clone;
}
