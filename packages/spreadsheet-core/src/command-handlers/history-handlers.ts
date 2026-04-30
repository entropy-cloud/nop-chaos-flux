import type { CommandHandler } from './types.js';
import type {
  BeginSpreadsheetTransactionCommand,
  CommitSpreadsheetTransactionCommand,
  RollbackSpreadsheetTransactionCommand,
  UndoSpreadsheetCommand,
  RedoSpreadsheetCommand,
} from '../commands.js';
import { pushUndo } from '../core/internal-state.js';

export const handleBeginTransaction: CommandHandler<BeginSpreadsheetTransactionCommand> = (
  store,
) => {
  const state = store.getState();
  store.setState({ transactionDoc: state.document });
  return { ok: true, changed: false };
};

export const handleCommitTransaction: CommandHandler<CommitSpreadsheetTransactionCommand> = (
  store,
) => {
  const state = store.getState();
  if (state.transactionDoc) {
    const updated = pushUndo(store.getState());
    store.setState({ ...updated, transactionDoc: null });
  }
  return { ok: true, changed: false };
};

export const handleRollbackTransaction: CommandHandler<RollbackSpreadsheetTransactionCommand> = (
  store,
) => {
  const state = store.getState();
  if (state.transactionDoc) {
    store.setState({ document: state.transactionDoc, transactionDoc: null });
  }
  return { ok: true, changed: true };
};

export const handleUndo: CommandHandler<UndoSpreadsheetCommand> = (store) => {
  const current = store.getState();
  if (current.undoStack.length === 0)
    return { ok: false, changed: false, error: 'Nothing to undo' };
  const prevDoc = current.undoStack[current.undoStack.length - 1];
  const undoStack = current.undoStack.slice(0, -1);
  store.setState({
    document: prevDoc,
    undoStack,
    redoStack: [...current.redoStack, current.document],
    dirty: true,
  });
  return { ok: true, changed: true };
};

export const handleRedo: CommandHandler<RedoSpreadsheetCommand> = (store) => {
  const current = store.getState();
  if (current.redoStack.length === 0)
    return { ok: false, changed: false, error: 'Nothing to redo' };
  const nextDoc = current.redoStack[current.redoStack.length - 1];
  const redoStack = current.redoStack.slice(0, -1);
  store.setState({
    document: nextDoc,
    undoStack: [...current.undoStack, current.document],
    redoStack,
    dirty: true,
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
