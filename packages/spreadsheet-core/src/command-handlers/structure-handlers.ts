import type { CommandHandler } from './types.js';
import type {
  InsertRowCommand,
  InsertColumnCommand,
  DeleteRowCommand,
  DeleteColumnCommand,
} from '../commands.js';
import {
  applyInsertRow,
  applyInsertColumn,
  applyDeleteRow,
  applyDeleteColumn,
} from '../core/structure-operations.js';
import { applySimpleDocumentMutation } from '../core/internal-state.js';

export const handleInsertRow: CommandHandler<InsertRowCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyInsertRow(state.document, command.sheetId, command.row, command.count ?? 1);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleInsertColumn: CommandHandler<InsertColumnCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyInsertColumn(
    state.document,
    command.sheetId,
    command.col,
    command.count ?? 1,
  );
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleDeleteRow: CommandHandler<DeleteRowCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyDeleteRow(state.document, command.sheetId, command.row, command.count ?? 1);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleDeleteColumn: CommandHandler<DeleteColumnCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyDeleteColumn(
    state.document,
    command.sheetId,
    command.col,
    command.count ?? 1,
  );
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export function registerStructureHandlers(registry: Map<string, CommandHandler>) {
  registry.set('spreadsheet:insertRow', handleInsertRow as CommandHandler);
  registry.set('spreadsheet:insertColumn', handleInsertColumn as CommandHandler);
  registry.set('spreadsheet:deleteRow', handleDeleteRow as CommandHandler);
  registry.set('spreadsheet:deleteColumn', handleDeleteColumn as CommandHandler);
}
