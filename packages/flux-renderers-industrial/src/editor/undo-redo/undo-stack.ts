import type { ScadaConfigDiff } from '../../serialization/config-types.js';

/**
 * undo 栈元素结构（design-undo-redo.md §4.1.2）。
 *
 * 栈元素**仅含 forward + inverse 两条增量 diff**（外加 operationKind + timestamp 元数据）。
 * **不存储全量 prevSnapshot**（R4 内存约束——push 时 computeInverse 一次性预计算 inverse 后 prevSnapshot 丢弃）。
 */
export interface UndoStackEntry {
  /** 编辑操作产出的 forward diff（apply 到 working copy 使其前进）。 */
  forward: ScadaConfigDiff;
  /** forward 的逆 diff（apply 到 working copy 使其回退到此 entry 入栈前的状态）；push 时经 computeInverse 预计算。 */
  inverse: ScadaConfigDiff;
  /** 操作类型标签（跨操作合并 §4.4 + 边界提示 §4.5 用）。 */
  operationKind: EditorOperationKind;
  /** 操作时间戳（跨操作合并时间窗口判定 §4.4）。 */
  timestamp: number;
}

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
  | 'property-edit';

/** 栈深度上限（design-undo-redo.md §2 + §4.5 边界提示，U7 满栈丢弃最旧）。 */
export const MAX_UNDO_STACK_DEPTH = 100;

/**
 * UndoStack —— undo/redo 栈管理（design-undo-redo.md §4.1 + §4.1.2）。
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
  private undoStack: UndoStackEntry[] = [];
  private redoStack: UndoStackEntry[] = [];
  private readonly maxDepth: number;

  constructor(maxDepth: number = MAX_UNDO_STACK_DEPTH) {
    this.maxDepth = maxDepth;
  }

  /** 入栈（编辑器适配层在 computeInverse 预计算后调用）。满栈丢弃最旧（U7）。 */
  push(entry: UndoStackEntry): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    // 新操作入栈截断 redo 链（U6 标准模型）。
    this.redoStack = [];
  }

  /** 可撤销（undoStack 非空）。 */
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** 可重做（redoStack 非空）。 */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoStackDepth(): number {
    return this.undoStack.length;
  }

  get redoStackDepth(): number {
    return this.redoStack.length;
  }

  /** 栈顶 operationKind（合并/边界测试用）。 */
  get topOperationKind(): EditorOperationKind | undefined {
    return this.undoStack[this.undoStack.length - 1]?.operationKind;
  }

  /**
   * 撤销：pop undoStack 栈顶 entry（host apply entry.inverse）→ entry 原样推入 redoStack。
   * 返回 undefined 表示栈空（边界提示：无可撤销操作，§4.5）。
   */
  popForUndo(): UndoStackEntry | undefined {
    const entry = this.undoStack.pop();
    if (entry) this.redoStack.push(entry);
    return entry;
  }

  /**
   * 重做：pop redoStack 栈顶 entry（host apply entry.forward）→ entry 原样推回 undoStack。
   * 返回 undefined 表示栈空（边界提示：无可重做操作，§4.5）。
   */
  popForRedo(): UndoStackEntry | undefined {
    const entry = this.redoStack.pop();
    if (entry) this.undoStack.push(entry);
    return entry;
  }

  /** 查看栈顶（不 pop；合并决策用）。 */
  peekUndoTop(): UndoStackEntry | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  /** 替换栈顶 entry（合并用：把栈顶替换为合并后的新 entry）。 */
  replaceUndoTop(entry: UndoStackEntry): void {
    if (this.undoStack.length === 0) {
      this.undoStack.push(entry);
      return;
    }
    this.undoStack[this.undoStack.length - 1] = entry;
  }

  /** 清空两栈（load 句柄消费，design-undo-redo.md §8.2 编辑历史不保留）。 */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
