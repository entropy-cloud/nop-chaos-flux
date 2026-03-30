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
export declare function createDefaultSelection(): SpreadsheetSelection;
export declare function createDefaultViewport(): SpreadsheetViewportSnapshot;
export declare function createDefaultHistory(): SpreadsheetHistoryState;
export declare function createDefaultLayout(): SpreadsheetLayoutSummary;
export declare function cellAddress(row: number, col: number): string;
export declare function parseCellAddress(address: string): {
    row: number;
    col: number;
};
export declare function isSameCellRef(a: SpreadsheetCellRef, b: SpreadsheetCellRef): boolean;
export declare function isRangeEmpty(range: SpreadsheetRange): boolean;
export declare function rangeContainsCell(range: SpreadsheetRange, cell: SpreadsheetCellRef): boolean;
export declare function normalizeRange(range: SpreadsheetRange): SpreadsheetRange;
export declare function rangeSize(range: SpreadsheetRange): {
    rows: number;
    cols: number;
};
export declare function createEmptyDocument(id?: string): SpreadsheetDocument;
export declare function mergeCellStyle(existing: CellStyle | undefined, patch: Partial<CellStyle>): CellStyle;
export declare function getCellsInRange(range: SpreadsheetRange): {
    row: number;
    col: number;
}[];
export declare function rangeIntersects(a: SpreadsheetRange, b: SpreadsheetRange): boolean;
