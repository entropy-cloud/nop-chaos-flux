import type { PasteOptions, SpreadsheetCellRef, SpreadsheetRange, SpreadsheetSelection } from './types.js';
export type SpreadsheetCommand = SetActiveSheetCommand | SetSelectionCommand | SetCellValueCommand | SetCellFormulaCommand | SetCellStyleCommand | ResizeRowCommand | ResizeColumnCommand | MergeRangeCommand | UnmergeRangeCommand | HideRowCommand | HideColumnCommand | AddSheetCommand | RemoveSheetCommand | BeginSpreadsheetTransactionCommand | CommitSpreadsheetTransactionCommand | RollbackSpreadsheetTransactionCommand | UndoSpreadsheetCommand | RedoSpreadsheetCommand | CopyCellsCommand | CutCellsCommand | PasteCellsCommand | ClearCellsCommand | InsertRowCommand | InsertColumnCommand | DeleteRowCommand | DeleteColumnCommand | RenameSheetCommand | MoveSheetCommand | CopySheetCommand | SetSheetTabColorCommand | HideSheetCommand | ProtectSheetCommand | SelectAllCommand | SelectRowCommand | SelectColumnCommand | SetCellFontFamilyCommand | SetCellFontSizeCommand | SetCellFontWeightCommand | SetCellFontStyleCommand | SetCellTextDecorationCommand | SetCellFontColorCommand | SetCellBackgroundColorCommand | SetCellBorderCommand | SetCellTextAlignCommand | SetCellVerticalAlignCommand | SetCellWrapTextCommand | SetCellNumberFormatCommand | FillDownCommand | FillRightCommand | FillSeriesCommand | AddCommentCommand | EditCommentCommand | DeleteCommentCommand | AutoFitRowCommand | AutoFitColumnCommand | MergeCellsCenterCommand | FreezePanesCommand | UnfreezePanesCommand | FindCommand | FindNextCommand | ReplaceCommand | ReplaceAllCommand;
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
    options?: PasteOptions;
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
export interface SetCellFontFamilyCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:setCellFontFamily';
    target: SpreadsheetCellRef | SpreadsheetRange;
    fontFamily: string;
}
export interface SetCellFontSizeCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:setCellFontSize';
    target: SpreadsheetCellRef | SpreadsheetRange;
    fontSize: number;
}
export interface SetCellFontWeightCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:setCellFontWeight';
    target: SpreadsheetCellRef | SpreadsheetRange;
    fontWeight: 'normal' | 'bold';
}
export interface SetCellFontStyleCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:setCellFontStyle';
    target: SpreadsheetCellRef | SpreadsheetRange;
    fontStyle: 'normal' | 'italic';
}
export interface SetCellTextDecorationCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:setCellTextDecoration';
    target: SpreadsheetCellRef | SpreadsheetRange;
    textDecoration: 'none' | 'underline' | 'line-through';
}
export interface SetCellFontColorCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:setCellFontColor';
    target: SpreadsheetCellRef | SpreadsheetRange;
    color: string;
}
export interface SetCellBackgroundColorCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:setCellBackgroundColor';
    target: SpreadsheetCellRef | SpreadsheetRange;
    color: string;
}
export interface SetCellBorderCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:setCellBorder';
    target: SpreadsheetCellRef | SpreadsheetRange;
    border: 'none' | 'all' | 'outer' | 'inner' | 'top' | 'right' | 'bottom' | 'left';
    color?: string;
    width?: number;
}
export interface SetCellTextAlignCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:setCellTextAlign';
    target: SpreadsheetCellRef | SpreadsheetRange;
    textAlign: 'left' | 'center' | 'right';
}
export interface SetCellVerticalAlignCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:setCellVerticalAlign';
    target: SpreadsheetCellRef | SpreadsheetRange;
    verticalAlign: 'top' | 'middle' | 'bottom';
}
export interface SetCellWrapTextCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:setCellWrapText';
    target: SpreadsheetCellRef | SpreadsheetRange;
    wrapText: boolean;
}
export interface SetCellNumberFormatCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:setCellNumberFormat';
    target: SpreadsheetCellRef | SpreadsheetRange;
    format: string;
}
export interface FillDownCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:fillDown';
    range: SpreadsheetRange;
}
export interface FillRightCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:fillRight';
    range: SpreadsheetRange;
}
export interface AddCommentCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:addComment';
    cell: SpreadsheetCellRef;
    text: string;
    author?: string;
}
export interface EditCommentCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:editComment';
    cell: SpreadsheetCellRef;
    text: string;
}
export interface DeleteCommentCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:deleteComment';
    cell: SpreadsheetCellRef;
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
export interface FillSeriesCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:fillSeries';
    range: SpreadsheetRange;
    direction: 'down' | 'right';
    seriesType?: 'linear' | 'auto';
}
export interface FindOptions {
    query: string;
    matchCase?: boolean;
    matchWholeCell?: boolean;
    useRegex?: boolean;
    searchScope?: 'sheet' | 'workbook';
}
export interface FindResult {
    sheetId: string;
    address: string;
    row: number;
    col: number;
    value: string;
    matchStart: number;
    matchEnd: number;
}
export interface FindCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:find';
    options: FindOptions;
}
export interface FindNextCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:findNext';
    options: FindOptions;
    from?: SpreadsheetCellRef;
}
export interface ReplaceCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:replace';
    options: FindOptions;
    replacement: string;
    cell: SpreadsheetCellRef;
}
export interface ReplaceAllCommand extends SpreadsheetCommandBase {
    type: 'spreadsheet:replaceAll';
    options: FindOptions;
    replacement: string;
}
export interface SpreadsheetCommandResult {
    ok: boolean;
    changed: boolean;
    error?: unknown;
    data?: unknown;
}
export declare function isSpreadsheetCommand(value: unknown): value is SpreadsheetCommand;
