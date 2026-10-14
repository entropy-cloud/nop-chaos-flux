import type { EditorDiffEntry } from './types.js';

/** 栈深度上限（对齐 `MAX_UNDO_STACK_DEPTH`）。 */
export const MAX_UNDO_STACK_DEPTH = 100;

/** M3 group 合并默认时间窗（design-undo-redo.md §4.4；对齐 industrial `operation-coalesce.ts`）。 */
export const DEFAULT_COALESCE_WINDOW_MS = 500;

/**
 * UndoCommandStack —— undo/redo 栈管理（对齐 `UndoStack`，design-undo-redo.md §4.1 + §4.1.2）。
 *
 * **栈元素 entry-agnostic**（plan 598 G3 doc 修复，ex「同 entry 原样移入」文档）：
 * 本类只管栈结构（push/pop/peek/深度/canUndo/canRedo）；entry 如何在 undo/redo 两侧
 * 流转由 host 约定。现行 host 约定（两 dispatcher——spreadsheet-core history-handlers、
 * report-designer-core core-dispatch——均经共享 helper `popAndRebuildOppositeEntry`
 * 实施，doc/impl split 顺带修复）：
 * - undo：从 undo 栈 peek/pop entry → host apply `entry.inverse` → **对侧 redo entry 以
 *   操作时点 `current.document` 重建** {forward: current, inverse: restored, timestamp}。
 * - redo：从 redo 栈 peek/pop entry → host apply `entry.forward` → 对侧 undo entry 以
 *   操作时点 `current.document` 重建 {forward: restored, inverse: current, timestamp}。
 * - **Drift 论证**：刻意不把原 entry 原样移入对侧——事务开启期间文档可漂移（事务内
 *   mutation / recalc 不入栈），若原样移入，漂移后 undo→redo 会恢复漂移前的旧 forward；
 *   操作时点重建使 redo 恢复 undo 时点文档（drift 后 redo 恢复 undo 时点文档）。
 * - 另一 host 约定并存：editor-core 自带会话 API（editor-core.ts `EditorCore.undo/redo`，
 *   结构化域 diff）仍按「同 entry 原样移入」流转——那是 types.ts `EditorCore` 契约的既有
 *   语义，与本类无冲突（本类 entry-agnostic）。
 *
 * 纯逻辑，Vitest 单测先行。
 */
export class UndoCommandStack<TDiff = unknown> {
  private undoStack: EditorDiffEntry<TDiff>[] = [];
  private redoStack: EditorDiffEntry<TDiff>[] = [];
  private readonly maxDepth: number;

  constructor(maxDepth: number = MAX_UNDO_STACK_DEPTH) {
    this.maxDepth = maxDepth;
  }

  /** 新操作入栈（host 在 diff 预计算后调用）。满栈丢弃最旧（U7）。截断 redo 链（U6）。 */
  push(entry: EditorDiffEntry<TDiff>): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
  }

  /** 推入 undo 栈（redo 成功后由 host 经 rebuild 语义推回——不截断 redo 链）。 */
  pushUndo(entry: EditorDiffEntry<TDiff>): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
  }

  /** 当前 undo 栈顶 entry（不弹出）。 */
  peekUndo(): EditorDiffEntry<TDiff> | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  /** 弹出 undo 栈顶 entry（undo 成功后由 host 经 rebuild 语义入 redo 栈）。 */
  popUndo(): EditorDiffEntry<TDiff> | undefined {
    return this.undoStack.pop();
  }

  /** 推入 redo 栈（undo 成功后由 host 以操作时点文档 rebuild 推入）。 */
  pushRedo(entry: EditorDiffEntry<TDiff>): void {
    this.redoStack.push(entry);
  }

  /**
   * 替换 undo 栈顶 entry（跨操作合并用：把栈顶替换为合并后的新 entry；空栈等价 push）。
   * 合并替换也是一次「新提交」（coalesce-merge 产出新 forward），按 U6 截断 redo 链——与
   * industrial `UndoStack.replaceUndoTop` 同语义。
   */
  replaceUndoTop(entry: EditorDiffEntry<TDiff>): void {
    if (this.undoStack.length === 0) {
      this.undoStack.push(entry);
    } else {
      this.undoStack[this.undoStack.length - 1] = entry;
    }
    this.redoStack.length = 0;
  }

  /** 当前 redo 栈顶 entry（不弹出）。 */
  peekRedo(): EditorDiffEntry<TDiff> | undefined {
    return this.redoStack[this.redoStack.length - 1];
  }

  /** undo 栈只读投影（栈底→栈顶快照数组；历史面板/域合并决策消费，不泄漏内部可变数组）。 */
  listUndo(): readonly EditorDiffEntry<TDiff>[] {
    return [...this.undoStack];
  }

  /** redo 栈只读投影（栈底→栈顶快照数组）。 */
  listRedo(): readonly EditorDiffEntry<TDiff>[] {
    return [...this.redoStack];
  }

  /** 清空 redo 栈（不动 undo 栈；域事务开启期间丢弃重做分支用）。 */
  clearRedo(): void {
    this.redoStack.length = 0;
  }

  /** 弹出 redo 栈顶 entry（redo 成功后由 host 经 rebuild 语义推回 undo 栈）。 */
  popRedo(): EditorDiffEntry<TDiff> | undefined {
    return this.redoStack.pop();
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoDepth(): number {
    return this.undoStack.length;
  }

  get redoDepth(): number {
    return this.redoStack.length;
  }

  /** 清空双栈（load / revert / reset 语义）。 */
  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
