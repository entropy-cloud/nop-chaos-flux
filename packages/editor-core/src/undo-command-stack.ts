import type { EditorDiffEntry } from './types.js';

/** 栈深度上限（对齐 `MAX_UNDO_STACK_DEPTH`）。 */
export const MAX_UNDO_STACK_DEPTH = 100;

/**
 * UndoCommandStack —— undo/redo 栈管理（对齐 `UndoStack`，design-undo-redo.md §4.1 + §4.1.2）。
 *
 * **栈元素不调换字段**：
 * - undo：从 undo 栈 peek entry →（host apply inverse）→ **同一个 entry 原样**移入 redo 栈。
 * - redo：从 redo 栈 peek entry →（host apply forward）→ **同一个 entry 原样**移回 undo 栈。
 * - undo-of-redo / redo-of-undo 自动正确：entry 永远持原始 forward + inverse。
 *
 * 本类只管栈结构（push/pop/peek/深度/canUndo/canRedo）；apply 由 host（EditorCore）经
 * `adapter.applyDiff` 执行。纯逻辑，Vitest 单测先行。
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

  /** 推入 undo 栈（redo 成功后由 host 原样移回——不截断 redo 链）。 */
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

  /** 弹出 undo 栈顶 entry（undo 成功后由 host 移入 redo 栈）。 */
  popUndo(): EditorDiffEntry<TDiff> | undefined {
    return this.undoStack.pop();
  }

  /** 推入 redo 栈（undo 成功后由 host 原样移入）。 */
  pushRedo(entry: EditorDiffEntry<TDiff>): void {
    this.redoStack.push(entry);
  }

  /** 当前 redo 栈顶 entry（不弹出）。 */
  peekRedo(): EditorDiffEntry<TDiff> | undefined {
    return this.redoStack[this.redoStack.length - 1];
  }

  /** 弹出 redo 栈顶 entry（redo 成功后由 host 移回 undo 栈）。 */
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
