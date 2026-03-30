import { type SpreadsheetRange } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from './bridge.js';
export interface DragState {
    isDragging: boolean;
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
}
export interface ResizeState {
    isResizing: boolean;
    type: 'row' | 'column';
    index: number;
    startPos: number;
    startSize: number;
}
export interface FillHandleState {
    isFilling: boolean;
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
    currentRow: number;
    currentCol: number;
}
export type StyleToolType = 'bold' | 'italic' | 'underline' | 'align-left' | 'align-center' | 'align-right' | 'bg-yellow' | 'bg-green' | 'bg-blue' | 'bg-none' | 'font-color-red' | 'font-color-blue' | 'font-color-black';
export interface SpreadsheetInteractionsConfig {
    bridge: SpreadsheetBridge;
    sheetId: string;
    rows?: number;
    cols?: number;
    onLog?: (msg: string) => void;
}
export interface SpreadsheetInteractionsReturn {
    snapshot: SpreadsheetHostSnapshot;
    selectedCell: {
        row: number;
        col: number;
    } | null;
    setSelectedCell: React.Dispatch<React.SetStateAction<{
        row: number;
        col: number;
    } | null>>;
    cellValue: string;
    getSelectedRange: () => SpreadsheetRange | null;
    editingCell: {
        row: number;
        col: number;
    } | null;
    editValue: string;
    editingCellRef: React.RefObject<{
        row: number;
        col: number;
    } | null>;
    editValueRef: React.RefObject<string>;
    handleEditSave: () => Promise<void>;
    handleEditCancel: () => void;
    handleEditValueChange: (value: string) => void;
    fillHandleState: FillHandleState;
    fillHandleRef: React.RefObject<FillHandleState>;
    isFillPreview: (row: number, col: number) => boolean;
    handleFillHandleMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
    handleCellClick: (row: number, col: number) => void;
    handleCellDoubleClick: (row: number, col: number) => void;
    handleCellMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
    handleCellMouseEnter: (row: number, col: number) => void;
    handleMouseUp: () => void;
    handleColumnResizeStart: (col: number, e: React.MouseEvent) => void;
    handleRowResizeStart: (row: number, e: React.MouseEvent) => void;
    columnWidths: Record<number, number>;
    rowHeights: Record<number, number>;
    gridRef: React.RefObject<HTMLDivElement | null>;
    onCanvasMouseDown: (e: React.MouseEvent) => void;
    isInRange: (row: number, col: number) => boolean;
    getMergeInfo: (row: number, col: number) => {
        isMerged: boolean;
        isTopLeft: boolean;
        rowSpan: number;
        colSpan: number;
    };
    handleCellValueChange: (value: string) => void;
    handleCopy: () => Promise<void>;
    handleCut: () => Promise<void>;
    handlePaste: () => Promise<void>;
    handleClear: () => Promise<void>;
    handleStyleTool: (tool: StyleToolType) => Promise<void>;
    handleInsertRow: () => Promise<void>;
    handleDeleteRow: () => Promise<void>;
    handleInsertColumn: () => Promise<void>;
    handleDeleteColumn: () => Promise<void>;
    handleFillDown: () => Promise<void>;
    handleFillSeries: (direction: 'down' | 'right') => Promise<void>;
    handleAddSheet: () => Promise<void>;
    handleRemoveSheet: (id: string) => Promise<void>;
    handleRenameSheet: (sheetId: string, name: string) => Promise<void>;
    handleMerge: () => Promise<void>;
    handleUnmerge: () => Promise<void>;
    handleMergeCenter: () => Promise<void>;
    handleFreeze: () => Promise<void>;
    handleUnfreeze: () => Promise<void>;
    handleUndo: () => Promise<void>;
    handleRedo: () => Promise<void>;
    showFindReplace: boolean;
    setShowFindReplace: React.Dispatch<React.SetStateAction<boolean>>;
    findQuery: string;
    setFindQuery: React.Dispatch<React.SetStateAction<string>>;
    replaceText: string;
    setReplaceText: React.Dispatch<React.SetStateAction<string>>;
    findResults: string;
    setFindResults: React.Dispatch<React.SetStateAction<string>>;
    handleFind: () => Promise<void>;
    handleReplace: () => Promise<void>;
    handleReplaceAll: () => Promise<void>;
    showCommentInput: boolean;
    setShowCommentInput: React.Dispatch<React.SetStateAction<boolean>>;
    commentText: string;
    setCommentText: React.Dispatch<React.SetStateAction<string>>;
    handleAddComment: () => Promise<void>;
    handleDeleteComment: () => Promise<void>;
    hasComment: boolean;
    currentCell: ReturnType<SpreadsheetBridge['getSnapshot']>['activeSheet'] extends (infer S | null) ? (S extends {
        cells?: infer C;
    } ? C extends Record<string, infer Cell> ? Cell : undefined : undefined) : undefined;
    dropTargetCell: {
        row: number;
        col: number;
    } | null;
    setDropTargetCell: React.Dispatch<React.SetStateAction<{
        row: number;
        col: number;
    } | null>>;
    dropTargetCellRef: React.RefObject<{
        row: number;
        col: number;
    } | null>;
    handleFieldDrop: (cb: (target: {
        row: number;
        col: number;
    }) => void) => void;
    handleFieldDragOver: (row: number, col: number) => void;
    handleFieldDragLeave: () => void;
    handleCellValueSave: () => Promise<void>;
}
export declare function useSpreadsheetInteractions(config: SpreadsheetInteractionsConfig): SpreadsheetInteractionsReturn;
