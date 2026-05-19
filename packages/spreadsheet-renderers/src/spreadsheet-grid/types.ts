import type { MouseEvent } from 'react';
import type { SpreadsheetRange, SpreadsheetFrozenPane } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetHostSnapshot, SpreadsheetBridge } from '../bridge.js';

export interface SpreadsheetGridProps {
  snapshot: SpreadsheetHostSnapshot;
  bridge: SpreadsheetBridge;
  rows: number;
  cols: number;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  selectedCell: { row: number; col: number } | null;
  selection: SpreadsheetHostSnapshot['selection'];
  editingCell: { row: number; col: number } | null;
  editValue: string;
  editSaveState?: { status: 'idle' | 'saving' | 'cancelled' | 'failed'; message?: string };
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
  getMergeInfo: (
    row: number,
    col: number,
  ) => { isMerged: boolean; isTopLeft: boolean; rowSpan: number; colSpan: number };
  onCellClick: (row: number, col: number) => void;
  onCellDoubleClick: (row: number, col: number) => void;
  onCellMouseDown: (row: number, col: number, e: MouseEvent) => void;
  onCellMouseEnter: (row: number, col: number) => void;
  onSelectRow: (row: number, extend?: boolean) => void;
  onSelectColumn: (col: number, extend?: boolean) => void;
  onSelectAll: () => void;
  onColumnResizeStart: (col: number, e: MouseEvent) => void;
  onRowResizeStart: (row: number, e: MouseEvent) => void;
  onFillHandleMouseDown: (row: number, col: number, e: MouseEvent) => void;
  onFillHandleDoubleClick: () => void;
  onEditValueChange: (value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  dropTargetCell: { row: number; col: number } | null;
  draggingField: unknown;
  getCellMetadata?: (row: number, col: number) => unknown;
  onFieldDragOver?: (row: number, col: number) => void;
  onFieldDragLeave?: () => void;
  readonly?: boolean;
}

export interface SpreadsheetGridViewportModel {
  rows: number;
  cols: number;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  selection: SpreadsheetHostSnapshot['selection'];
  snapshot: SpreadsheetHostSnapshot;
  selectedCell: { row: number; col: number } | null;
  frozen: SpreadsheetFrozenPane | undefined;
  scrollTop: number;
  scrollLeft: number;
  viewportHeight: number;
  viewportWidth: number;
}
