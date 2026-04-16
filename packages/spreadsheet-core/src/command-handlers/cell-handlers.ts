import type { CommandHandler, SpreadsheetDispatchStore } from './types.js';
import type {
  SetCellValueCommand,
  SetCellFormulaCommand,
  SetCellStyleCommand,
  MergeRangeCommand,
  UnmergeRangeCommand,
  MergeCellsCenterCommand,
  SetCellFontFamilyCommand,
  SetCellFontSizeCommand,
  SetCellFontWeightCommand,
  SetCellFontStyleCommand,
  SetCellTextDecorationCommand,
  SetCellFontColorCommand,
  SetCellBackgroundColorCommand,
  SetCellBorderCommand,
  SetCellTextAlignCommand,
  SetCellVerticalAlignCommand,
  SetCellWrapTextCommand,
  SetCellNumberFormatCommand,
  FillDownCommand,
  FillRightCommand,
  FillSeriesCommand,
  AddCommentCommand,
  EditCommentCommand,
  DeleteCommentCommand,
} from '../commands.js';
import type { CellStyle } from '../types.js';
import {
  applySetCellValue,
  applySetCellFormula,
  applySetCellStyle,
  applyMergeRange,
  applyUnmergeRange,
  applyMergeCellsCenter,
  applyCellStyleChange,
  applyFillDown,
  applyFillRight,
  applyFillSeries,
  applyAddComment,
  applyEditComment,
  applyDeleteComment,
} from '../core/cell-operations.js';
import { applySimpleDocumentMutation } from '../core/internal-state.js';

export const handleSetCellValue: CommandHandler<SetCellValueCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applySetCellValue(state.document, command.cell, command.value);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleSetCellFormula: CommandHandler<SetCellFormulaCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applySetCellFormula(state.document, command.cell, command.formula);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleSetCellStyle: CommandHandler<SetCellStyleCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applySetCellStyle(state.document, command.target, command.styleId);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleMergeRange: CommandHandler<MergeRangeCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyMergeRange(state.document, command.range);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleUnmergeRange: CommandHandler<UnmergeRangeCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyUnmergeRange(state.document, command.range);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleMergeCellsCenter: CommandHandler<MergeCellsCenterCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyMergeCellsCenter(state.document, command.range);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

function applyStyleHandler<T extends { target: Parameters<typeof applyCellStyleChange>[1] }>(
  store: SpreadsheetDispatchStore,
  command: T,
  stylePatch: Partial<CellStyle>
) {
  const state = store.getState();
  const nextDoc = applyCellStyleChange(state.document, command.target, stylePatch);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
}

export const handleSetCellFontFamily: CommandHandler<SetCellFontFamilyCommand> = (store, command) =>
  applyStyleHandler(store, command, { fontFamily: command.fontFamily });

export const handleSetCellFontSize: CommandHandler<SetCellFontSizeCommand> = (store, command) =>
  applyStyleHandler(store, command, { fontSize: command.fontSize });

export const handleSetCellFontWeight: CommandHandler<SetCellFontWeightCommand> = (store, command) =>
  applyStyleHandler(store, command, { fontWeight: command.fontWeight });

export const handleSetCellFontStyle: CommandHandler<SetCellFontStyleCommand> = (store, command) =>
  applyStyleHandler(store, command, { fontStyle: command.fontStyle });

export const handleSetCellTextDecoration: CommandHandler<SetCellTextDecorationCommand> = (store, command) =>
  applyStyleHandler(store, command, { textDecoration: command.textDecoration });

export const handleSetCellFontColor: CommandHandler<SetCellFontColorCommand> = (store, command) =>
  applyStyleHandler(store, command, { fontColor: command.color });

export const handleSetCellBackgroundColor: CommandHandler<SetCellBackgroundColorCommand> = (store, command) =>
  applyStyleHandler(store, command, { backgroundColor: command.color });

export const handleSetCellBorder: CommandHandler<SetCellBorderCommand> = (store, command) => {
  const borderPatch: Partial<CellStyle> = { borderStyle: command.border };
  if (command.color) borderPatch.borderColor = command.color;
  if (command.width) borderPatch.borderWidth = command.width;
  return applyStyleHandler(store, command, borderPatch);
};

export const handleSetCellTextAlign: CommandHandler<SetCellTextAlignCommand> = (store, command) =>
  applyStyleHandler(store, command, { textAlign: command.textAlign });

export const handleSetCellVerticalAlign: CommandHandler<SetCellVerticalAlignCommand> = (store, command) =>
  applyStyleHandler(store, command, { verticalAlign: command.verticalAlign });

export const handleSetCellWrapText: CommandHandler<SetCellWrapTextCommand> = (store, command) =>
  applyStyleHandler(store, command, { wrapText: command.wrapText });

export const handleSetCellNumberFormat: CommandHandler<SetCellNumberFormatCommand> = (store, command) =>
  applyStyleHandler(store, command, {});

export const handleFillDown: CommandHandler<FillDownCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyFillDown(state.document, command.range);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleFillRight: CommandHandler<FillRightCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyFillRight(state.document, command.range);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleFillSeries: CommandHandler<FillSeriesCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyFillSeries(state.document, command.range, command.direction);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleAddComment: CommandHandler<AddCommentCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyAddComment(state.document, command.cell, command.text, command.author);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleEditComment: CommandHandler<EditCommentCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyEditComment(state.document, command.cell, command.text);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export const handleDeleteComment: CommandHandler<DeleteCommentCommand> = (store, command) => {
  const state = store.getState();
  const nextDoc = applyDeleteComment(state.document, command.cell);
  store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
  return { ok: true, changed: true };
};

export function registerCellHandlers(registry: Map<string, CommandHandler>) {
  registry.set('spreadsheet:setCellValue', handleSetCellValue as CommandHandler);
  registry.set('spreadsheet:setCellFormula', handleSetCellFormula as CommandHandler);
  registry.set('spreadsheet:setCellStyle', handleSetCellStyle as CommandHandler);
  registry.set('spreadsheet:mergeRange', handleMergeRange as CommandHandler);
  registry.set('spreadsheet:unmergeRange', handleUnmergeRange as CommandHandler);
  registry.set('spreadsheet:mergeCellsCenter', handleMergeCellsCenter as CommandHandler);
  registry.set('spreadsheet:setCellFontFamily', handleSetCellFontFamily as CommandHandler);
  registry.set('spreadsheet:setCellFontSize', handleSetCellFontSize as CommandHandler);
  registry.set('spreadsheet:setCellFontWeight', handleSetCellFontWeight as CommandHandler);
  registry.set('spreadsheet:setCellFontStyle', handleSetCellFontStyle as CommandHandler);
  registry.set('spreadsheet:setCellTextDecoration', handleSetCellTextDecoration as CommandHandler);
  registry.set('spreadsheet:setCellFontColor', handleSetCellFontColor as CommandHandler);
  registry.set('spreadsheet:setCellBackgroundColor', handleSetCellBackgroundColor as CommandHandler);
  registry.set('spreadsheet:setCellBorder', handleSetCellBorder as CommandHandler);
  registry.set('spreadsheet:setCellTextAlign', handleSetCellTextAlign as CommandHandler);
  registry.set('spreadsheet:setCellVerticalAlign', handleSetCellVerticalAlign as CommandHandler);
  registry.set('spreadsheet:setCellWrapText', handleSetCellWrapText as CommandHandler);
  registry.set('spreadsheet:setCellNumberFormat', handleSetCellNumberFormat as CommandHandler);
  registry.set('spreadsheet:fillDown', handleFillDown as CommandHandler);
  registry.set('spreadsheet:fillRight', handleFillRight as CommandHandler);
  registry.set('spreadsheet:fillSeries', handleFillSeries as CommandHandler);
  registry.set('spreadsheet:addComment', handleAddComment as CommandHandler);
  registry.set('spreadsheet:editComment', handleEditComment as CommandHandler);
  registry.set('spreadsheet:deleteComment', handleDeleteComment as CommandHandler);
}
