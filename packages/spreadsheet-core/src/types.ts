export interface SpreadsheetDocument {
  id: string;
  kind: string;
  name: string;
  version: string;
  meta?: Record<string, unknown>;
  viewport?: SpreadsheetViewportSnapshot;
  workbook: WorkbookDocument;
}

export interface SpreadsheetViewportSnapshot {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export interface WorkbookDocument {
  id?: string;
  name?: string;
  props?: Record<string, unknown>;
  styles?: StyleDefinition[];
  sheets: WorksheetDocument[];
}

export interface StyleDefinition {
  id: string;
  name?: string;
  props: Record<string, unknown>;
}

export interface WorksheetDocument {
  id: string;
  name: string;
  order: number;
  props?: Record<string, unknown>;
  rows?: Record<string, RowDocument>;
  columns?: Record<string, ColumnDocument>;
  cells?: Record<string, CellDocument>;
  merges?: MergeRange[];
  frozen?: SpreadsheetFrozenPane;
  tabColor?: string;
  hidden?: boolean;
  protected?: boolean;
  protectionOptions?: SheetProtectionOptions;
  defaultRowHeight?: number;
  defaultColumnWidth?: number;
}

export interface SheetProtectionOptions {
  selectLockedCells?: boolean;
  selectUnlockedCells?: boolean;
  formatCells?: boolean;
  formatColumns?: boolean;
  formatRows?: boolean;
  insertColumns?: boolean;
  insertRows?: boolean;
  deleteColumns?: boolean;
  deleteRows?: boolean;
}

export interface RowDocument {
  index: number;
  height?: number;
  hidden?: boolean;
  styleId?: string;
}

export interface ColumnDocument {
  index: number;
  width?: number;
  hidden?: boolean;
  styleId?: string;
}

export interface CellDocument {
  address: string;
  row: number;
  col: number;
  value?: unknown;
  formula?: string;
  type?: string;
  style?: CellStyle;
  styleId?: string;
  comment?: string | CellComment;
  linkUrl?: string;
  protected?: boolean;
  richText?: unknown;
  numberFormat?: string;
}

export interface CellStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  fontColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderStyle?: BorderStyle;
  borderWidth?: number;
  borderTop?: BorderLineStyle;
  borderRight?: BorderLineStyle;
  borderBottom?: BorderLineStyle;
  borderLeft?: BorderLineStyle;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  wrapText?: boolean;
  textIndent?: number;
}

export type BorderStyle = 'none' | 'all' | 'outer' | 'inner' | 'top' | 'right' | 'bottom' | 'left' | 'horizontal' | 'vertical';

export interface BorderLineStyle {
  color: string;
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  width: number;
}

export interface CellComment {
  text: string;
  author?: string;
  createdAt?: string;
  resolved?: boolean;
}

export interface MergeRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export type SpreadsheetSelectionKind = 'none' | 'cell' | 'range' | 'row' | 'column' | 'sheet';

export interface SpreadsheetSelection {
  kind: SpreadsheetSelectionKind;
  sheetId?: string;
  anchor?: SpreadsheetCellRef;
  range?: SpreadsheetRange;
  rows?: number[];
  columns?: number[];
}

export interface SpreadsheetCellRef {
  sheetId: string;
  address: string;
  row: number;
  col: number;
}

export interface SpreadsheetRange {
  sheetId: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface SpreadsheetEditingState {
  cell: SpreadsheetCellRef;
  editorId: string;
  initialValue: unknown;
  draftValue: unknown;
}

export interface SpreadsheetHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoDepth: number;
  redoDepth: number;
}

export interface SpreadsheetLayoutSummary {
  visibleRange: SpreadsheetRange;
  frozen?: SpreadsheetFrozenPane;
}

export interface SpreadsheetFrozenPane {
  row?: number;
  col?: number;
}

export interface ClipboardData {
  type: 'copy' | 'cut';
  sourceSheetId: string;
  range: SpreadsheetRange;
  cells: ClipboardCell[][];
  timestamp: number;
}

export interface ClipboardCell {
  value?: unknown;
  formula?: string;
  style?: CellStyle;
  merge?: MergeRange;
  comment?: string | CellComment;
  linkUrl?: string;
  numberFormat?: string;
}

export interface PasteOptions {
  values?: boolean;
  formats?: boolean;
  formulas?: boolean;
  comments?: boolean;
  transpose?: boolean;
}

export interface SpreadsheetRuntimeSnapshot {
  document: SpreadsheetDocument;
  activeSheetId: string;
  selection: SpreadsheetSelection;
  editing?: SpreadsheetEditingState;
  history: SpreadsheetHistoryState;
  viewport: SpreadsheetViewportSnapshot;
  layout: SpreadsheetLayoutSummary;
  readonly: boolean;
  dirty: boolean;
}

export interface SpreadsheetConfig {
  defaultRowHeight?: number;
  defaultColumnWidth?: number;
  minRowHeight?: number;
  minColumnWidth?: number;
  maxUndoDepth?: number;
}

export function createDefaultSelection(): SpreadsheetSelection {
  return { kind: 'none' };
}

export function createDefaultViewport(): SpreadsheetViewportSnapshot {
  return { scrollX: 0, scrollY: 0, zoom: 1 };
}

export function createDefaultHistory(): SpreadsheetHistoryState {
  return { canUndo: false, canRedo: false, undoDepth: 0, redoDepth: 0 };
}

export function createDefaultLayout(): SpreadsheetLayoutSummary {
  return {
    visibleRange: {
      sheetId: '',
      startRow: 0,
      startCol: 0,
      endRow: 100,
      endCol: 26,
    },
  };
}

export function cellAddress(row: number, col: number): string {
  let result = '';
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode(65 + (c % 26)) + result;
    c = Math.floor(c / 26) - 1;
  }
  return `${result}${row + 1}`;
}

export function parseCellAddress(address: string): { row: number; col: number } {
  const match = address.match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid cell address: ${address}`);
  const colStr = match[1];
  const rowStr = match[2];
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  return { row: parseInt(rowStr, 10) - 1, col: col - 1 };
}

export function isSameCellRef(a: SpreadsheetCellRef, b: SpreadsheetCellRef): boolean {
  return a.sheetId === b.sheetId && a.row === b.row && a.col === b.col;
}

export function isRangeEmpty(range: SpreadsheetRange): boolean {
  return range.startRow === range.endRow && range.startCol === range.endCol;
}

export function rangeContainsCell(range: SpreadsheetRange, cell: SpreadsheetCellRef): boolean {
  if (range.sheetId !== cell.sheetId) return false;
  return (
    cell.row >= range.startRow &&
    cell.row <= range.endRow &&
    cell.col >= range.startCol &&
    cell.col <= range.endCol
  );
}

export function normalizeRange(range: SpreadsheetRange): SpreadsheetRange {
  return {
    sheetId: range.sheetId,
    startRow: Math.min(range.startRow, range.endRow),
    startCol: Math.min(range.startCol, range.endCol),
    endRow: Math.max(range.startRow, range.endRow),
    endCol: Math.max(range.startCol, range.endCol),
  };
}

export function rangeSize(range: SpreadsheetRange): { rows: number; cols: number } {
  const normalized = normalizeRange(range);
  return {
    rows: normalized.endRow - normalized.startRow + 1,
    cols: normalized.endCol - normalized.startCol + 1,
  };
}

export function createEmptyDocument(id?: string): SpreadsheetDocument {
  return {
    id: id ?? crypto.randomUUID(),
    kind: 'spreadsheet',
    name: 'Untitled',
    version: '1.0.0',
    workbook: {
      sheets: [
        {
          id: crypto.randomUUID(),
          name: 'Sheet1',
          order: 0,
        },
      ],
    },
  };
}

export function mergeCellStyle(existing: CellStyle | undefined, patch: Partial<CellStyle>): CellStyle {
  return { ...(existing ?? {}), ...patch };
}

export function getCellsInRange(range: SpreadsheetRange): { row: number; col: number }[] {
  const normalized = normalizeRange(range);
  const cells: { row: number; col: number }[] = [];
  for (let r = normalized.startRow; r <= normalized.endRow; r++) {
    for (let c = normalized.startCol; c <= normalized.endCol; c++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

export function rangeIntersects(a: SpreadsheetRange, b: SpreadsheetRange): boolean {
  if (a.sheetId !== b.sheetId) return false;
  const na = normalizeRange(a);
  const nb = normalizeRange(b);
  return !(
    na.endRow < nb.startRow ||
    na.startRow > nb.endRow ||
    na.endCol < nb.startCol ||
    na.startCol > nb.endCol
  );
}
