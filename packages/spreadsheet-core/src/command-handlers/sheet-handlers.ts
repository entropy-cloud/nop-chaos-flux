import type { CommandHandler } from './types.js';
import type {
  AddSheetCommand,
  RemoveSheetCommand,
  RenameSheetCommand,
  MoveSheetCommand,
  CopySheetCommand,
  SetSheetTabColorCommand,
  HideSheetCommand,
  ProtectSheetCommand,
  ResizeRowCommand,
  ResizeColumnCommand,
  HideRowCommand,
  HideColumnCommand,
  FreezePanesCommand,
  UnfreezePanesCommand,
  AutoFitRowCommand,
  AutoFitColumnCommand,
} from '../commands.js';
import {
  applyAddSheet,
  applyRemoveSheet,
  applyRenameSheet,
  applyMoveSheet,
  applyCopySheet,
  applySetSheetTabColor,
  applyHideSheet,
  applyProtectSheet,
  applyResizeRow,
  applyResizeColumn,
  applyHideRow,
  applyHideColumn,
  applyFreezePanes,
  applyUnfreezePanes,
} from '../core/sheet-operations.js';
import { applySimpleDocumentMutation, pushUndo } from '../core/internal-state.js';

export const handleAddSheet: CommandHandler<AddSheetCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyAddSheet(state.document, command.name, command.index);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleRemoveSheet: CommandHandler<RemoveSheetCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyRemoveSheet(state.document, command.sheetId);
  const updated = pushUndo(store.getState());
  let activeSheetId = state.activeSheetId;
  if (activeSheetId === command.sheetId) {
    activeSheetId = nextDoc.workbook.sheets[0]?.id ?? '';
  }
  store.setState({ ...updated, document: nextDoc, activeSheetId, selection: { kind: 'none' }, dirty: true });
  return { ok: true, changed: true };
};

export const handleRenameSheet: CommandHandler<RenameSheetCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyRenameSheet(state.document, command.sheetId, command.name);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleMoveSheet: CommandHandler<MoveSheetCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyMoveSheet(state.document, command.sheetId, command.targetIndex);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleCopySheet: CommandHandler<CopySheetCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyCopySheet(state.document, command.sheetId, command.name);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleSetSheetTabColor: CommandHandler<SetSheetTabColorCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applySetSheetTabColor(state.document, command.sheetId, command.color);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleHideSheet: CommandHandler<HideSheetCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyHideSheet(state.document, command.sheetId, command.hidden);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleProtectSheet: CommandHandler<ProtectSheetCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyProtectSheet(state.document, command.sheetId, command.password, command.options);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleResizeRow: CommandHandler<ResizeRowCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyResizeRow(state.document, command.sheetId, command.row, command.height);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleResizeColumn: CommandHandler<ResizeColumnCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyResizeColumn(state.document, command.sheetId, command.col, command.width);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleHideRow: CommandHandler<HideRowCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyHideRow(state.document, command.sheetId, command.row, command.hidden);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleHideColumn: CommandHandler<HideColumnCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyHideColumn(state.document, command.sheetId, command.col, command.hidden);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleFreezePanes: CommandHandler<FreezePanesCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyFreezePanes(state.document, command.sheetId, command.row, command.col);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleUnfreezePanes: CommandHandler<UnfreezePanesCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyUnfreezePanes(state.document, command.sheetId);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleAutoFitRow: CommandHandler<AutoFitRowCommand> = () => {
  return { ok: false, changed: false, error: new Error('autoFitRow requires host measurement support') };
};

export const handleAutoFitColumn: CommandHandler<AutoFitColumnCommand> = () => {
  return { ok: false, changed: false, error: new Error('autoFitColumn requires host measurement support') };
};

export function registerSheetHandlers(registry: Map<string, CommandHandler>) {
  registry.set('spreadsheet:addSheet', handleAddSheet as CommandHandler);
  registry.set('spreadsheet:removeSheet', handleRemoveSheet as CommandHandler);
  registry.set('spreadsheet:renameSheet', handleRenameSheet as CommandHandler);
  registry.set('spreadsheet:moveSheet', handleMoveSheet as CommandHandler);
  registry.set('spreadsheet:copySheet', handleCopySheet as CommandHandler);
  registry.set('spreadsheet:setSheetTabColor', handleSetSheetTabColor as CommandHandler);
  registry.set('spreadsheet:hideSheet', handleHideSheet as CommandHandler);
  registry.set('spreadsheet:protectSheet', handleProtectSheet as CommandHandler);
  registry.set('spreadsheet:resizeRow', handleResizeRow as CommandHandler);
  registry.set('spreadsheet:resizeColumn', handleResizeColumn as CommandHandler);
  registry.set('spreadsheet:hideRow', handleHideRow as CommandHandler);
  registry.set('spreadsheet:hideColumn', handleHideColumn as CommandHandler);
  registry.set('spreadsheet:freezePanes', handleFreezePanes as CommandHandler);
  registry.set('spreadsheet:unfreezePanes', handleUnfreezePanes as CommandHandler);
  registry.set('spreadsheet:autoFitRow', handleAutoFitRow as CommandHandler);
  registry.set('spreadsheet:autoFitColumn', handleAutoFitColumn as CommandHandler);
}
