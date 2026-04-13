import type {
  SpreadsheetCellRef,
  SpreadsheetRange,
} from './types.js';
import type { SpreadsheetCommandBase } from './commands-base.js';

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

export interface FillSeriesCommand extends SpreadsheetCommandBase {
  type: 'spreadsheet:fillSeries';
  range: SpreadsheetRange;
  direction: 'down' | 'right';
  seriesType?: 'linear' | 'auto';
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
