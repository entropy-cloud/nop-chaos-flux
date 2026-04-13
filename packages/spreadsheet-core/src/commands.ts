export type {
  SpreadsheetCommandBase,
  SetActiveSheetCommand,
  SetSelectionCommand,
  SetCellValueCommand,
  SetCellFormulaCommand,
  SetCellStyleCommand,
  ResizeRowCommand,
  ResizeColumnCommand,
  MergeRangeCommand,
  UnmergeRangeCommand,
  HideRowCommand,
  HideColumnCommand,
  AddSheetCommand,
  RemoveSheetCommand,
  RenameSheetCommand,
  MoveSheetCommand,
  CopySheetCommand,
  SetSheetTabColorCommand,
  HideSheetCommand,
  ProtectSheetCommand,
  BeginSpreadsheetTransactionCommand,
  CommitSpreadsheetTransactionCommand,
  RollbackSpreadsheetTransactionCommand,
  UndoSpreadsheetCommand,
  RedoSpreadsheetCommand,
  CopyCellsCommand,
  CutCellsCommand,
  PasteCellsCommand,
  ClearCellsCommand,
  InsertRowCommand,
  InsertColumnCommand,
  DeleteRowCommand,
  DeleteColumnCommand,
  SelectAllCommand,
  SelectRowCommand,
  SelectColumnCommand,
  AutoFitRowCommand,
  AutoFitColumnCommand,
  MergeCellsCenterCommand,
  FreezePanesCommand,
  UnfreezePanesCommand,
} from './commands-base.js';

export type {
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
  FindOptions,
  FindResult,
  FindCommand,
  FindNextCommand,
  ReplaceCommand,
  ReplaceAllCommand,
} from './commands-style.js';

import type {
  SetActiveSheetCommand,
  SetSelectionCommand,
  SetCellValueCommand,
  SetCellFormulaCommand,
  SetCellStyleCommand,
  ResizeRowCommand,
  ResizeColumnCommand,
  MergeRangeCommand,
  UnmergeRangeCommand,
  HideRowCommand,
  HideColumnCommand,
  AddSheetCommand,
  RemoveSheetCommand,
  BeginSpreadsheetTransactionCommand,
  CommitSpreadsheetTransactionCommand,
  RollbackSpreadsheetTransactionCommand,
  UndoSpreadsheetCommand,
  RedoSpreadsheetCommand,
  CopyCellsCommand,
  CutCellsCommand,
  PasteCellsCommand,
  ClearCellsCommand,
  InsertRowCommand,
  InsertColumnCommand,
  DeleteRowCommand,
  DeleteColumnCommand,
  RenameSheetCommand,
  MoveSheetCommand,
  CopySheetCommand,
  SetSheetTabColorCommand,
  HideSheetCommand,
  ProtectSheetCommand,
  SelectAllCommand,
  SelectRowCommand,
  SelectColumnCommand,
  AutoFitRowCommand,
  AutoFitColumnCommand,
  MergeCellsCenterCommand,
  FreezePanesCommand,
  UnfreezePanesCommand,
} from './commands-base.js';

import type {
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
  FindCommand,
  FindNextCommand,
  ReplaceCommand,
  ReplaceAllCommand,
} from './commands-style.js';

export type SpreadsheetCommand =
  | SetActiveSheetCommand
  | SetSelectionCommand
  | SetCellValueCommand
  | SetCellFormulaCommand
  | SetCellStyleCommand
  | ResizeRowCommand
  | ResizeColumnCommand
  | MergeRangeCommand
  | UnmergeRangeCommand
  | HideRowCommand
  | HideColumnCommand
  | AddSheetCommand
  | RemoveSheetCommand
  | BeginSpreadsheetTransactionCommand
  | CommitSpreadsheetTransactionCommand
  | RollbackSpreadsheetTransactionCommand
  | UndoSpreadsheetCommand
  | RedoSpreadsheetCommand
  | CopyCellsCommand
  | CutCellsCommand
  | PasteCellsCommand
  | ClearCellsCommand
  | InsertRowCommand
  | InsertColumnCommand
  | DeleteRowCommand
  | DeleteColumnCommand
  | RenameSheetCommand
  | MoveSheetCommand
  | CopySheetCommand
  | SetSheetTabColorCommand
  | HideSheetCommand
  | ProtectSheetCommand
  | SelectAllCommand
  | SelectRowCommand
  | SelectColumnCommand
  | SetCellFontFamilyCommand
  | SetCellFontSizeCommand
  | SetCellFontWeightCommand
  | SetCellFontStyleCommand
  | SetCellTextDecorationCommand
  | SetCellFontColorCommand
  | SetCellBackgroundColorCommand
  | SetCellBorderCommand
  | SetCellTextAlignCommand
  | SetCellVerticalAlignCommand
  | SetCellWrapTextCommand
  | SetCellNumberFormatCommand
  | FillDownCommand
  | FillRightCommand
  | FillSeriesCommand
  | AddCommentCommand
  | EditCommentCommand
  | DeleteCommentCommand
  | AutoFitRowCommand
  | AutoFitColumnCommand
  | MergeCellsCenterCommand
  | FreezePanesCommand
  | UnfreezePanesCommand
  | FindCommand
  | FindNextCommand
  | ReplaceCommand
  | ReplaceAllCommand;

export interface SpreadsheetCommandResult {
  ok: boolean;
  changed: boolean;
  error?: unknown;
  data?: unknown;
}

export function isSpreadsheetCommand(value: unknown): value is SpreadsheetCommand {
  if (typeof value !== 'object' || value === null) return false;
  const cmd = value as SpreadsheetCommand;
  return typeof cmd.type === 'string' && cmd.type.startsWith('spreadsheet:');
}
