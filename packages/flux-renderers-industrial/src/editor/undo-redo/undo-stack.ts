import type { EditorDiffEntry } from '@nop-chaos/editor-core';
import { UndoCommandStack, MAX_UNDO_STACK_DEPTH } from '@nop-chaos/editor-core';
import type { ScadaConfigDiff } from '../../serialization/config-types.js';
/**
 * 编辑操作类型（design-undo-redo.md §4.1.2）。
 *
 * transform 族（move/scale/rotate/skew）+ 结构（add/remove/group/ungroup）+
 * 属性（update/property-edit）+ 连线（connection-update/connection-link）。
 */
export type EditorOperationKind =
  | 'transform-move'
  | 'transform-scale'
  | 'transform-rotate'
  | 'transform-skew'
  | 'add-symbol'
  | 'remove-symbol'
  | 'update-symbol'
  | 'group'
  | 'ungroup'
  | 'connection-update'
  | 'connection-link'
  | 'property-edit'
  | 'z-order';

/**
 * undo 栈元素结构（design-undo-redo.md §4.1.2）。
 *
 * **P1.1 迁移**：存储契约收敛到 editor-core `EditorDiffEntry`（forward/inverse 双增量 +
 * operationKind/timestamp/coalesceGroup 元数据，不含全量 prevSnapshot——R4 内存约束），
 * `operationKind` 收窄为 SCADA 域操作类型联合。
 */
export interface UndoStackEntry extends EditorDiffEntry<ScadaConfigDiff> {
  /** 操作类型标签（跨操作合并 §4.4 + 边界提示 §4.5 用）。 */
  operationKind: EditorOperationKind;
}

/**
 * 历史面板只读投影条目（design-undo-redo.md §13，plan 521 / U2）。
 *
 * 只暴露可观察元数据（operationKind/timestamp/coalesceGroup + 1-based 栈位序号），
 * **不泄漏** forward/inverse diff 载荷与内部可变数组 ref（R4 增量载荷对 UI 无意义，且防外部绕过
 * 栈语义改写 entry）。
 */
export interface UndoStackEntryInfo {
  /** 栈位序号（1-based，栈底=1，栈顶=depth）。 */
  index: number;
  /** 操作类型标签（§4.1.2）。 */
  operationKind: EditorOperationKind;
  /** 操作时间戳（§4.1.2）。 */
  timestamp: number;
  /** 跨操作合并分组键（§4.4，缺省 undefined）。 */
  coalesceGroup?: string;
}

/**
 * UndoStack —— undo/redo 栈管理（design-undo-redo.md §4.1 + §4.1.2）。
 *
 * **P1.1 迁移裁定**（roadmap P1.1，plan 546）：本类不再持有自有双栈存储，改为 editor-core
 * `UndoCommandStack<ScadaConfigDiff>` 的存储 facade——仓库内 undo 栈实现单源到 `@nop-chaos/editor-core`
 * （消灭 roadmap §3 登记的独立实现并存）。公开 API 与语义逐项保持不变：
 *
 * **栈元素不调换字段**（design-undo-redo.md §4.1 Round 2 NEW-1 修正）：
 * - undo：从 undoStack pop entry →（host apply inverse）→ **同一个 entry 原样**推入 redoStack。
 * - redo：从 redoStack pop entry →（host apply forward）→ **同一个 entry 原样**推回 undoStack。
 * - undo-of-redo / redo-of-undo 自动正确：entry 永远持原始 forward + inverse。
 *
 * 本类只管栈结构（push/pop/peek/深度/canUndo/canRedo）；apply 由 host 经 runtime applyDiff 执行
 * （editor 域持有栈，undo/redo 经 runtime applyDiff 应用，design-undo-redo.md §4.6 方案 A conformant realization）。
 *
 * 纯逻辑（无 React / leafer 依赖），Vitest 单测先行。
 */
export class UndoStack {
  private readonly core: UndoCommandStack<ScadaConfigDiff>;

  constructor(maxDepth: number = MAX_UNDO_STACK_DEPTH) {
    this.core = new UndoCommandStack<ScadaConfigDiff>(maxDepth);
  }

  /** 入栈（编辑器适配层在 computeInverse 预计算后调用）。满栈丢弃最旧（U7）。 */
  push(entry: UndoStackEntry): void {
    this.core.push(entry);
  }

  /** 可撤销（undoStack 非空）。 */
  get canUndo(): boolean {
    return this.core.canUndo;
  }

  /** 可重做（redoStack 非空）。 */
  get canRedo(): boolean {
    return this.core.canRedo;
  }

  get undoStackDepth(): number {
    return this.core.undoDepth;
  }

  get redoStackDepth(): number {
    return this.core.redoDepth;
  }

  /** 栈顶 operationKind（合并/边界测试用）。 */
  get topOperationKind(): EditorOperationKind | undefined {
    return this.core.peekUndo()?.operationKind as EditorOperationKind | undefined;
  }

  /**
   * 撤销：pop undoStack 栈顶 entry（host apply entry.inverse）→ entry 原样推入 redoStack。
   * 返回 undefined 表示栈空（边界提示：无可撤销操作，§4.5）。
   */
  popForUndo(): UndoStackEntry | undefined {
    const entry = this.core.popUndo();
    if (entry) this.core.pushRedo(entry);
    return entry as UndoStackEntry;
  }

  /**
   * 重做：pop redoStack 栈顶 entry（host apply entry.forward）→ entry 原样推回 undoStack。
   * 返回 undefined 表示栈空（边界提示：无可重做操作，§4.5）。
   */
  popForRedo(): UndoStackEntry | undefined {
    const entry = this.core.popRedo();
    if (entry) this.core.pushUndo(entry);
    return entry as UndoStackEntry;
  }

  /** 查看栈顶（不 pop；合并决策用）。 */
  peekUndoTop(): UndoStackEntry | undefined {
    return this.core.peekUndo() as UndoStackEntry | undefined;
  }

  /** 查看 redoStack 栈顶（不 pop；plan 2026-08-08-0900-1 Phase 2 / P2 #17 失败可回滚的 redo 用）。 */
  peekRedoTop(): UndoStackEntry | undefined {
    return this.core.peekRedo() as UndoStackEntry | undefined;
  }

  /**
   * 历史面板只读投影（design-undo-redo.md §13，plan 521 / U2）：undo 栈条目元数据列表。
   * 返回**栈底→栈顶**顺序（index 1-based）；只含可观察元数据，无 diff 载荷（见 UndoStackEntryInfo）。
   */
  listUndoEntries(): UndoStackEntryInfo[] {
    return this.core.listUndo().map((entry, i) => toEntryInfo(entry as UndoStackEntry, i));
  }

  /** 历史面板只读投影（design-undo-redo.md §13，plan 521 / U2）：redo 栈条目元数据列表（栈底→栈顶）。 */
  listRedoEntries(): UndoStackEntryInfo[] {
    return this.core.listRedo().map((entry, i) => toEntryInfo(entry as UndoStackEntry, i));
  }

  /**
   * 弹出 undoStack 栈顶 entry（不入 redoStack）。
   *
   * plan 2026-08-08-0900-1 Phase 2 / P2 #17：applyDiff 失败回滚专用——mutator 先 pushOperation 再
   * syncWorkingCopy，applyDiff 抛错时弹出刚入栈条目，使栈状态与 working copy 保持一致。
   */
  dropUndoTop(): UndoStackEntry | undefined {
    return this.core.popUndo() as UndoStackEntry | undefined;
  }

  /** 替换栈顶 entry（合并用：把栈顶替换为合并后的新 entry）。 */
  replaceUndoTop(entry: UndoStackEntry): void {
    this.core.replaceUndoTop(entry);
  }

  /** 清空两栈（load 句柄消费，design-undo-redo.md §8.2 编辑历史不保留）。 */
  clear(): void {
    this.core.clear();
  }
}

/** entry → 只读投影（plan 521 / U2；coalesceGroup 仅在非空时携带）。 */
function toEntryInfo(entry: UndoStackEntry, i: number): UndoStackEntryInfo {
  return {
    index: i + 1,
    operationKind: entry.operationKind,
    timestamp: entry.timestamp,
    ...(entry.coalesceGroup !== undefined ? { coalesceGroup: entry.coalesceGroup } : {}),
  };
}

/** 栈深度上限（历史导出名，P1.1 起单源 editor-core `MAX_UNDO_STACK_DEPTH` 同值 100；向后兼容保留）。 */
export { MAX_UNDO_STACK_DEPTH } from '@nop-chaos/editor-core';
