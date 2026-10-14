import type { CommandHandler } from './types.js';
import type {
  BeginSpreadsheetTransactionCommand,
  CommitSpreadsheetTransactionCommand,
  RollbackSpreadsheetTransactionCommand,
  UndoSpreadsheetCommand,
  RedoSpreadsheetCommand,
} from '../commands.js';
import { popAndRebuildOppositeEntry } from '@nop-chaos/editor-core';
import {
  clearTransientState,
  cloneSpreadsheetDocument,
} from '../core/internal-state.js';
import type { SpreadsheetInternalState } from '../core/internal-state.js';
import type { SpreadsheetDocument } from '../types.js';

/**
 * P1.2 迁移（plan 547）：undo/redo 存储单源 editor-core `UndoCommandStack`（快照对 entry）。
 * **操作时点语义**（与旧数组实现逐字节一致）：undo/redo 恢复目标取 entry.inverse/forward，
 * 但对侧 entry 以操作时点 `current.document` 重建——事务开启期间文档漂移（事务内 mutation /
 * recalc 不入栈）后 undo→redo 仍恢复 undo 时点文档。
 */

const handleBeginTransaction: CommandHandler<BeginSpreadsheetTransactionCommand> = (
  store,
) => {
  const state = store.getState();
  if (state.transactionDoc) {
    return { ok: true, changed: false };
  }

  store.setState({ transactionDoc: cloneSpreadsheetDocument(state.document) });
  return { ok: true, changed: false };
};

const handleCommitTransaction: CommandHandler<CommitSpreadsheetTransactionCommand> = (
  store,
) => {
  const state = store.getState();
  if (state.transactionDoc) {
    if (state.document !== state.transactionDoc) {
      const updated = pushUndoDocumentTransaction(
        { ...state, transactionDoc: null },
        state.transactionDoc,
      );
      store.setState({ ...updated, transactionDoc: null });
    } else {
      store.setState({ transactionDoc: null });
    }
  }
  return { ok: true, changed: false };
};

const handleRollbackTransaction: CommandHandler<RollbackSpreadsheetTransactionCommand> = (
  store,
) => {
  const state = store.getState();
  if (state.transactionDoc) {
    state.undo.clearRedo();
    store.setState({
      document: state.transactionDoc,
      transactionDoc: null,
      ...clearTransientState(state),
    });
  }
  return { ok: true, changed: true };
};

/** 事务收口入栈：transactionDoc 为 undo 目标（inverse），redo 分支已清（push 截断）。 */
function pushUndoDocumentTransaction(
  state: SpreadsheetInternalState,
  transactionDoc: SpreadsheetDocument,
): SpreadsheetInternalState {
  state.undo.push({
    forward: state.document,
    inverse: transactionDoc,
    timestamp: Date.now(),
  });
  return { ...state };
}

const handleUndo: CommandHandler<UndoSpreadsheetCommand> = (store) => {
  // plan 598 G3：共享 5 步骨架单源 editor-core popAndRebuildOppositeEntry
  //（peek→空栈→pop→操作时点重建对侧 entry→返回 restored）；调用点保留
  // spreadsheet 分歧步（error 文本 + setState payload + dirty + clearTransientState）。
  const current = store.getState();
  const prevDoc = popAndRebuildOppositeEntry(current.undo, 'undo', current.document);
  if (prevDoc === undefined) return { ok: false, changed: false, error: 'Nothing to undo' };
  store.setState({
    document: prevDoc,
    dirty: true,
    ...clearTransientState(current),
  });
  return { ok: true, changed: true };
};

const handleRedo: CommandHandler<RedoSpreadsheetCommand> = (store) => {
  const current = store.getState();
  const nextDoc = popAndRebuildOppositeEntry(current.undo, 'redo', current.document);
  if (nextDoc === undefined) return { ok: false, changed: false, error: 'Nothing to redo' };
  store.setState({
    document: nextDoc,
    dirty: true,
    ...clearTransientState(current),
  });
  return { ok: true, changed: true };
};

export function registerHistoryHandlers(registry: Map<string, CommandHandler>) {
  registry.set('spreadsheet:beginTransaction', handleBeginTransaction as CommandHandler);
  registry.set('spreadsheet:commitTransaction', handleCommitTransaction as CommandHandler);
  registry.set('spreadsheet:rollbackTransaction', handleRollbackTransaction as CommandHandler);
  registry.set('spreadsheet:undo', handleUndo as CommandHandler);
  registry.set('spreadsheet:redo', handleRedo as CommandHandler);
}
