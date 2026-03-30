import { type SpreadsheetRange } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetHostSnapshot, SpreadsheetBridge } from './bridge.js';
export interface SpreadsheetGridProps {
    snapshot: SpreadsheetHostSnapshot;
    bridge: SpreadsheetBridge;
    rows: number;
    cols: number;
    columnWidths: Record<number, number>;
    rowHeights: Record<number, number>;
    selectedCell: {
        row: number;
        col: number;
    } | null;
    editingCell: {
        row: number;
        col: number;
    } | null;
    editValue: string;
    fillHandleState: {
        isFilling: boolean;
        startRow: number;
        startCol: number;
        endRow: number;
        endCol: number;
        currentRow: number;
        currentCol: number;
    };
    isInRange: (row: number, col: number) => boolean;
    isFillPreview: (row: number, col: number) => boolean;
    getSelectedRange: () => SpreadsheetRange | null;
    getMergeInfo: (row: number, col: number) => {
        isMerged: boolean;
        isTopLeft: boolean;
        rowSpan: number;
        colSpan: number;
    };
    onCellClick: (row: number, col: number) => void;
    onCellDoubleClick: (row: number, col: number) => void;
    onCellMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
    onCellMouseEnter: (row: number, col: number) => void;
    onColumnResizeStart: (col: number, e: React.MouseEvent) => void;
    onRowResizeStart: (row: number, e: React.MouseEvent) => void;
    onFillHandleMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
    onEditValueChange: (value: string) => void;
    onEditSave: () => void;
    onEditCancel: () => void;
    dropTargetCell: {
        row: number;
        col: number;
    } | null;
    draggingField: unknown;
    getCellMetadata?: (row: number, col: number) => unknown;
    onFieldDragOver?: (row: number, col: number) => void;
    onFieldDragLeave?: () => void;
}
export declare function SpreadsheetGrid({ snapshot, rows, cols, columnWidths, rowHeights, selectedCell, editingCell, editValue, fillHandleState, isInRange, isFillPreview, getSelectedRange, getMergeInfo, onCellClick, onCellDoubleClick, onCellMouseDown, onCellMouseEnter, onColumnResizeStart, onRowResizeStart, onFillHandleMouseDown, onEditValueChange, onEditSave, onEditCancel, dropTargetCell, draggingField, getCellMetadata, onFieldDragOver, onFieldDragLeave, }: SpreadsheetGridProps): import("react/jsx-runtime").JSX.Element;
