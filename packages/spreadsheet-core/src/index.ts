import type { SchemaInput } from '@nop-chaos/flux-core';
export type {
  SpreadsheetHostStatusSummary,
  SpreadsheetDocument,
  SpreadsheetViewportSnapshot,
  WorkbookDocument,
  StyleDefinition,
  WorksheetDocument,
  SheetProtectionOptions,
  RowDocument,
  ColumnDocument,
  CellDocument,
  CellStyle,
  BorderStyle,
  BorderLineStyle,
  CellComment,
  MergeRange,
  SpreadsheetSelectionKind,
  SpreadsheetSelection,
  SpreadsheetCellRef,
  SpreadsheetRange,
  SpreadsheetEditingState,
  EditSaveStatus,
  SpreadsheetHistoryState,
  SpreadsheetLayoutSummary,
  SpreadsheetFrozenPane,
  SpreadsheetSortDirection,
  SpreadsheetRuntimeSnapshot,
  SpreadsheetConfig,
  ClipboardData,
  ClipboardCell,
  PasteOptions,
} from './types.js';

export {
  createDefaultSelection,
  createDefaultViewport,
  createDefaultHistory,
  createDefaultLayout,
  cellAddress,
  parseCellAddress,
  isSameCellRef,
  isRangeEmpty,
  rangeContainsCell,
  normalizeRange,
  rangeSize,
  createEmptyDocument,
  mergeCellStyle,
  getCellsInRange,
  rangeIntersects,
} from './types.js';

export type {
  SpreadsheetCommand,
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
  AutoFitRowCommand,
  AutoFitColumnCommand,
  MergeCellsCenterCommand,
  FreezePanesCommand,
  UnfreezePanesCommand,
  SortRangeCommand,
  FilterRowsByCellValueCommand,
  ClearRowFiltersCommand,
  FindCommand,
  FindNextCommand,
  FindOptions,
  FindResult,
  ReplaceCommand,
  ReplaceAllCommand,
  BeginSpreadsheetTransactionCommand,
  CommitSpreadsheetTransactionCommand,
  RollbackSpreadsheetTransactionCommand,
  UndoSpreadsheetCommand,
  RedoSpreadsheetCommand,
  SpreadsheetCommandResult,
} from './commands.js';

export { isSpreadsheetCommand } from './commands.js';

export type { SpreadsheetCore, CreateSpreadsheetCoreOptions } from './core.js';

export { createSpreadsheetCore } from './core.js';

/**
 * Shared designer-page schema preamble (cq-4 Phase 4): the designer-family
 * page-input fields common to spreadsheet/report (and available to future
 * designer pages). `type` and package-specific payload fields stay with each
 * renderer package.
 */
export interface DesignerPageSchemaInputBase {
  id?: string;
  name?: string;
  label?: string;
  title?: string | SchemaInput;
  className?: string;
  visible?: boolean | string;
  hidden?: boolean | string;
  disabled?: boolean | string;
  statusPath?: string;
}
