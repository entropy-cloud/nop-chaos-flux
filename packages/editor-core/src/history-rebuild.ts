import type { UndoCommandStack } from './undo-command-stack.js';

/**
 * 操作时点 rebuild-opposite-entry 骨架（plan 598 G3，reviewer-ruled 形态）：
 * undo/redo 共享 5 步——peek → 空栈返 undefined（调用点以各自 error 文本 early-return）→
 * pop → 以操作时点 `currentDocument` 重建对侧 entry {forward/inverse: currentDocument,
 * opposite: restored, timestamp: Date.now()} → 返回 restored。
 *
 * **刻意不移动原 entry**（与 undo-command-stack.ts 类注释的 host 约定一致）：对侧 entry
 * 以操作时点文档重建，事务开启期间文档漂移（事务内 mutation / recalc 不入栈）后
 * undo→redo 仍恢复 undo 时点文档。调用点保留各自分歧步（setState payload 形状、
 * dirty/clearTransientState、spreadsheetSyncSource、await refreshDerivedState）。
 *
 * 消费方：spreadsheet-core command-handlers/history-handlers.ts、report-designer-core
 * core-dispatch.ts（两 dispatcher 经本 helper 共享，doc/impl split 顺带修复）。
 */
export function popAndRebuildOppositeEntry<TDiff>(
  stack: UndoCommandStack<TDiff>,
  direction: 'undo' | 'redo',
  currentDocument: TDiff,
): TDiff | undefined {
  if (direction === 'undo') {
    const entry = stack.peekUndo();
    if (!entry) return undefined;
    stack.popUndo();
    const restored = entry.inverse;
    stack.pushRedo({
      forward: currentDocument,
      inverse: restored,
      timestamp: Date.now(),
    });
    return restored;
  }

  const entry = stack.peekRedo();
  if (!entry) return undefined;
  stack.popRedo();
  const restored = entry.forward;
  stack.pushUndo({
    forward: restored,
    inverse: currentDocument,
    timestamp: Date.now(),
  });
  return restored;
}
