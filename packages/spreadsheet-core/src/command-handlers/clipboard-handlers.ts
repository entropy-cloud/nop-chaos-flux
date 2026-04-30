import type { CommandHandler } from './types.js';
import type {
  CopyCellsCommand,
  CutCellsCommand,
  PasteCellsCommand,
  ClearCellsCommand,
} from '../commands.js';
import {
  copyRangeToClipboard,
  applyPasteCells,
  applyClearCells,
} from '../core/clipboard-operations.js';
import { applySimpleDocumentMutation, pushUndo } from '../core/internal-state.js';

export const handleCopyCells: CommandHandler<CopyCellsCommand> = (store, command) => {
  const state = store.getState();
  const clipboard = copyRangeToClipboard(
    state.document,
    command.range.sheetId,
    command.range,
    'copy',
  );
  store.setState({ clipboard });
  return { ok: true, changed: false, data: clipboard };
};

export const handleCutCells: CommandHandler<CutCellsCommand> = (store, command) => {
  const state = store.getState();
  const clipboard = copyRangeToClipboard(
    state.document,
    command.range.sheetId,
    command.range,
    'cut',
  );
  store.setState({ clipboard });
  return { ok: true, changed: false, data: clipboard };
};

export const handlePasteCells: CommandHandler<PasteCellsCommand> = (store, command) => {
  const state = store.getState();
  if (!state.clipboard) return { ok: false, changed: false, error: 'Clipboard is empty' };
  const nextDoc = applyPasteCells(state.document, state.clipboard, command.target);
  const updated = pushUndo(store.getState());
  const newClipboard = state.clipboard.type === 'cut' ? null : state.clipboard;
  store.setState({ ...updated, document: nextDoc, clipboard: newClipboard, dirty: true });
  return { ok: true, changed: true };
};

export const handleClearCells: CommandHandler<ClearCellsCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyClearCells(
    state.document,
    command.target,
    command.clearValues ?? true,
    command.clearFormats ?? false,
    command.clearComments ?? false,
  );
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export function registerClipboardHandlers(registry: Map<string, CommandHandler>) {
  registry.set('spreadsheet:copyCells', handleCopyCells as CommandHandler);
  registry.set('spreadsheet:cutCells', handleCutCells as CommandHandler);
  registry.set('spreadsheet:pasteCells', handlePasteCells as CommandHandler);
  registry.set('spreadsheet:clearCells', handleClearCells as CommandHandler);
}
