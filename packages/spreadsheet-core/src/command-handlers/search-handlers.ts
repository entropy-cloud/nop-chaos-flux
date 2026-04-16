import type { CommandHandler } from './types.js';
import type {
  FindCommand,
  FindNextCommand,
  ReplaceCommand,
  ReplaceAllCommand,
} from '../commands.js';
import {
  findInDocument,
  replaceInDocument,
  replaceAllInDocument,
} from '../core/search-operations.js';
import { applySimpleDocumentMutation } from '../core/internal-state.js';

export const handleFind: CommandHandler<FindCommand> = (store, command) => {
  const state = store.getState();
  const result = findInDocument(
    state.document,
    command.options.searchScope === 'sheet' ? state.activeSheetId : undefined,
    command.options.query,
    command.options,
  );
  return { ok: result !== null, changed: false, data: result };
};

export const handleFindNext: CommandHandler<FindNextCommand> = (store, command) => {
  const state = store.getState();
  const fromRow = command.from?.row;
  const fromCol = command.from?.col;
  const result = findInDocument(
    state.document,
    command.options.searchScope === 'sheet' ? state.activeSheetId : undefined,
    command.options.query,
    command.options,
    fromRow,
    fromCol,
  );
  return { ok: result !== null, changed: false, data: result };
};

export const handleReplace: CommandHandler<ReplaceCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = replaceInDocument(
    state.document,
    command.cell,
    command.options.query,
    command.replacement,
    command.options,
  );
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleReplaceAll: CommandHandler<ReplaceAllCommand> = (store, command) => {
  const state = store.getState();
  const { doc: nextDoc, count } = replaceAllInDocument(
    state.document,
    command.options.query,
    command.replacement,
    command.options,
    state.activeSheetId,
  );
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true, data: { count } };
};

export function registerSearchHandlers(registry: Map<string, CommandHandler>) {
  registry.set('spreadsheet:find', handleFind as CommandHandler);
  registry.set('spreadsheet:findNext', handleFindNext as CommandHandler);
  registry.set('spreadsheet:replace', handleReplace as CommandHandler);
  registry.set('spreadsheet:replaceAll', handleReplaceAll as CommandHandler);
}
