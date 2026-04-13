import type {
  SpreadsheetCellRef,
  SpreadsheetRange,
  SpreadsheetSelection,
} from './types.js';

export interface SpreadsheetCommandBase {
  type: string;
  transactionId?: string;
  source?: 'user' | 'toolbar' | 'shortcut' | 'inspector' | 'adapter' | 'import';
}

export interface SetActiveSheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:setActiveSheet';
  sheetId: string;
}

export interface SetSelectionCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:setSelection';
  selection: SpreadsheetSelection;
}

export interface SetCellValueCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:setCellValue';
  cell: SpreadsheetCellRef;
  value: unknown;
}

export interface SetCellFormulaCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:setCellFormula';
  cell: SpreadsheetCellRef;
  formula?: string;
}

export interface SetCellStyleCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:setCellStyle';
  target: SpreadsheetCellRef | SpreadsheetRange;
  styleId: string;
}

export interface ResizeRowCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:resizeRow';
  sheetId: string;
  row: number;
  height: number;
}

export interface ResizeColumnCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:resizeColumn';
  sheetId: string;
  col: number;
  width: number;
}

export interface MergeRangeCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:mergeRange';
  range: SpreadsheetRange;
}

export interface UnmergeRangeCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:unmergeRange';
  range: SpreadsheetRange;
}

export interface HideRowCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:hideRow';
  sheetId: string;
  row: number;
  hidden: boolean;
}

export interface HideColumnCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:hideColumn';
  sheetId: string;
  col: number;
  hidden: boolean;
}

export interface AddSheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:addSheet';
  name?: string;
  index?: number;
}

export interface RemoveSheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:removeSheet';
  sheetId: string;
}

export interface RenameSheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:renameSheet';
  sheetId: string;
  name: string;
}

export interface MoveSheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:moveSheet';
  sheetId: string;
  targetIndex: number;
}

export interface CopySheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:copySheet';
  sheetId: string;
  name?: string;
}

export interface SetSheetTabColorCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:setSheetTabColor';
  sheetId: string;
  color: string;
}

export interface HideSheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:hideSheet';
  sheetId: string;
  hidden: boolean;
}

export interface ProtectSheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:protectSheet';
  sheetId: string;
  password?: string;
  options?: import('./types.js').SheetProtectionOptions;
}

export interface BeginSpreadsheetTransactionCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:beginTransaction';
  label?: string;
}

export interface CommitSpreadsheetTransactionCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:commitTransaction';
}

export interface RollbackSpreadsheetTransactionCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:rollbackTransaction';
}

export interface UndoSpreadsheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:undo';
}

export interface RedoSpreadsheetCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:redo';
}

export interface CopyCellsCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:copyCells';
  range: SpreadsheetRange;
}

export interface CutCellsCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:cutCells';
  range: SpreadsheetRange;
}

export interface PasteCellsCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:pasteCells';
  target: SpreadsheetCellRef;
  options?: import('./types.js').PasteOptions;
}

export interface ClearCellsCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:clearCells';
  target: SpreadsheetCellRef | SpreadsheetRange;
  clearValues?: boolean;
  clearFormats?: boolean;
  clearComments?: boolean;
}

export interface InsertRowCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:insertRow';
  sheetId: string;
  row: number;
  count?: number;
}

export interface InsertColumnCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:insertColumn';
  sheetId: string;
  col: number;
  count?: number;
}

export interface DeleteRowCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:deleteRow';
  sheetId: string;
  row: number;
  count?: number;
}

export interface DeleteColumnCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:deleteColumn';
  sheetId: string;
  col: number;
  count?: number;
}

export interface SelectAllCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:selectAll';
  sheetId: string;
}

export interface SelectRowCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:selectRow';
  sheetId: string;
  row: number;
  extend?: boolean;
}

export interface SelectColumnCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:selectColumn';
  sheetId: string;
  col: number;
  extend?: boolean;
}

export interface AutoFitRowCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:autoFitRow';
  sheetId: string;
  row: number;
}

export interface AutoFitColumnCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:autoFitColumn';
  sheetId: string;
  col: number;
}

export interface MergeCellsCenterCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:mergeCellsCenter';
  range: SpreadsheetRange;
  textAlign?: 'center';
}

export interface FreezePanesCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:freezePanes';
  sheetId: string;
  row?: number;
  col?: number;
}

export interface UnfreezePanesCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:unfreezePanes';
  sheetId: string;
}
