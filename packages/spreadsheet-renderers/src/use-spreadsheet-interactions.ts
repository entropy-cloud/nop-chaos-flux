import { useCallback } from 'react';
import { cellAddress } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from './bridge.js';
import {
  useSnapshot,
  useSelection,
  useEditing,
  useFillHandle,
  useResize,
  useClipboard,
  useStyleCommands,
  useSheetCommands,
  useFindReplace,
  useComments,
  useFieldDrop,
  useKeyboard,
  useMouseUpBinding,
  useCellValueSync,
  useSpreadsheetShell,
} from './spreadsheet-interactions/index.js';

function isAbortLike(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    ((error as { name?: string } | null | undefined)?.name === 'AbortError')
  );
}

function formatFailureMessage(prefix: string, error: unknown): string {
  return error instanceof Error && error.message ? `${prefix}: ${error.message}` : prefix;
}

export type {
  DragState,
  ResizeState,
  FillHandleState,
  StyleToolType,
} from './spreadsheet-interactions/index.js';

type SpreadsheetCell = SpreadsheetInteractionsReturn['currentCell'];

export interface SpreadsheetInteractionsConfig {
  bridge: SpreadsheetBridge;
  sheetId: string;
  rows?: number;
  cols?: number;
  onLog?: (msg: string) => void;
}

export interface SpreadsheetInteractionsReturn {
  snapshot: SpreadsheetHostSnapshot;
  selectedCell: { row: number; col: number } | null;
  setSelectedCell: (cell: { row: number; col: number } | null) => void;
  cellValue: string;
  getSelectedRange: ReturnType<typeof useSelection>['getSelectedRange'];
  editingCell: { row: number; col: number } | null;
  editValue: string;
  editingCellRef: React.RefObject<{ row: number; col: number } | null>;
  editValueRef: React.RefObject<string>;
  handleEditSave: () => Promise<void>;
  handleEditCancel: () => void;
  handleEditValueChange: (value: string) => void;
  fillHandleState: ReturnType<typeof useFillHandle>['fillHandleState'];
  fillHandleRef: ReturnType<typeof useFillHandle>['fillHandleRef'];
  isFillPreview: (row: number, col: number) => boolean;
  handleFillHandleMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
  handleFillHandleDoubleClick: () => Promise<void>;
  handleCellClick: (row: number, col: number) => void;
  handleCellDoubleClick: (row: number, col: number) => void;
  handleCellMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
  handleCellMouseEnter: (row: number, col: number) => void;
  handleMouseUp: () => void;
  handleSelectRow: (row: number, extend?: boolean) => void;
  handleSelectColumn: (col: number, extend?: boolean) => void;
  handleSelectAll: () => void;
  handleColumnResizeStart: (col: number, e: React.MouseEvent) => void;
  handleRowResizeStart: (row: number, e: React.MouseEvent) => void;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  onCanvasMouseDown: (e: React.MouseEvent) => void;
  isInRange: (row: number, col: number) => boolean;
  getMergeInfo: (
    row: number,
    col: number,
  ) => { isMerged: boolean; isTopLeft: boolean; rowSpan: number; colSpan: number };
  handleCellValueChange: (value: string) => void;
  handleCopy: () => Promise<void>;
  handleCut: () => Promise<void>;
  handlePaste: () => Promise<void>;
  handleClear: () => Promise<void>;
  handleStyleTool: ReturnType<typeof useStyleCommands>['handleStyleTool'];
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
  currentCell: ReturnType<SpreadsheetBridge['getSnapshot']>['activeSheet'] extends infer S | null
    ? S extends { cells?: infer C }
      ? C extends Record<string, infer Cell>
        ? Cell
        : undefined
      : undefined
    : undefined;
  dropTargetCell: { row: number; col: number } | null;
  setDropTargetCell: React.Dispatch<React.SetStateAction<{ row: number; col: number } | null>>;
  dropTargetCellRef: React.RefObject<{ row: number; col: number } | null>;
  handleFieldDrop: (cb: (target: { row: number; col: number }) => void | Promise<void>) => Promise<boolean>;
  handleFieldDragOver: (row: number, col: number) => void;
  handleFieldDragLeave: () => void;
  handleCellValueSave: () => Promise<void>;
}

export function useSpreadsheetInteractions(
  config: SpreadsheetInteractionsConfig,
): SpreadsheetInteractionsReturn {
  const { bridge, sheetId, onLog } = config;
  const snapshot = useSnapshot(bridge);
  const readOnly = snapshot.runtime.readonly;
  const selectedCell = snapshot.activeCell
    ? { row: snapshot.activeCell.row, col: snapshot.activeCell.col }
    : null;
  const { addLog, cellValue, setCellValue, commentText, setCommentText, gridRef } =
    useSpreadsheetShell(snapshot, selectedCell, onLog);

  const {
    editingCell,
    setEditingCell,
    editValue,
    editingCellRef,
    editValueRef,
    handleCellDoubleClick,
    handleEditSave,
    handleEditCancel,
    handleEditValueChange,
    handleCellValueSave,
  } = useEditing(snapshot, bridge, sheetId, null, cellValue);

  const {
    selectedCell: selectionCell,
    setSelectedCell,
    getSelectedRange,
    isInRange,
    handleCellClick,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp: selectionMouseUp,
    handleSelectRow,
    handleSelectColumn,
    handleSelectAll,
  } = useSelection(
    snapshot,
    bridge,
    sheetId,
    addLog,
    editingCellRef,
    editValueRef,
    setEditingCell,
    setCommentText,
    setCellValue,
  );

  const {
    fillHandleState,
    fillHandleRef,
    isFillPreview,
    handleFillHandleMouseDown,
    handleFillHandleDoubleClick,
  } = useFillHandle(bridge, snapshot, sheetId, addLog, getSelectedRange);

  const {
    resizeState,
    columnWidths,
    rowHeights,
    handleColumnResizeStart,
    handleRowResizeStart,
    endResize,
  } = useResize({ bridge, snapshot, sheetId, onLog });

  const handleMouseUp = useCallback(() => {
    selectionMouseUp(resizeState.isResizing, endResize, getSelectedRange);
  }, [selectionMouseUp, resizeState.isResizing, endResize, getSelectedRange]);

  const handleCommandError = useCallback(
    (error: unknown) => {
      if (!isAbortLike(error)) {
        addLog(formatFailureMessage('Spreadsheet command failed', error));
      }
    },
    [addLog],
  );

  useMouseUpBinding(handleMouseUp);

  const { handleCopy, handleCut, handlePaste, handleClear } = useClipboard(
    snapshot,
    bridge,
    sheetId,
    selectedCell,
    getSelectedRange,
    setCellValue,
    addLog,
  );

  const { handleStyleTool } = useStyleCommands(
    snapshot,
    bridge,
    selectionCell,
    getSelectedRange,
    addLog,
  );

  const {
    handleInsertRow,
    handleDeleteRow,
    handleInsertColumn,
    handleDeleteColumn,
    handleFillDown,
    handleFillSeries,
    handleAddSheet,
    handleRemoveSheet,
    handleRenameSheet,
    handleMerge,
    handleUnmerge,
    handleMergeCenter,
    handleFreeze,
    handleUnfreeze,
    handleUndo,
    handleRedo,
    getMergeInfo,
  } = useSheetCommands(snapshot, bridge, sheetId, selectedCell, getSelectedRange, addLog);

  const {
    showFindReplace,
    setShowFindReplace,
    findQuery,
    setFindQuery,
    replaceText,
    setReplaceText,
    findResults,
    setFindResults,
    handleFind,
    handleReplace,
    handleReplaceAll,
  } = useFindReplace(bridge, sheetId, selectionCell, addLog);

  const { showCommentInput, setShowCommentInput, handleAddComment, handleDeleteComment } =
    useComments(bridge, sheetId, selectionCell, readOnly, addLog, commentText, setCommentText);

  const {
    dropTargetCell,
    setDropTargetCell,
    dropTargetCellRef,
    handleFieldDrop,
    handleFieldDragOver,
    handleFieldDragLeave,
  } = useFieldDrop(selectionCell, readOnly);

  useKeyboard(
    selectionCell,
    handleCopy,
    handleCut,
    handlePaste,
    handleUndo,
    handleRedo,
    handleStyleTool,
    handleClear,
    handleCommandError,
    setShowFindReplace,
    setShowCommentInput,
    gridRef,
    readOnly,
  );

  const onCanvasMouseDown = useCallback(() => {
    if (editingCellRef.current) {
      void handleEditSave().catch((error) => {
        if (!isAbortLike(error)) {
          addLog(formatFailureMessage('Cell save failed', error));
        }
      });
    }
  }, [addLog, handleEditSave, editingCellRef]);

  const handleCellValueChange = useCellValueSync({
    bridge,
    sheetId,
    selectedCell: selectionCell,
    setCellValue,
    readOnly,
  });

  const currentCell: SpreadsheetCell = selectionCell
    ? snapshot.activeSheet?.cells?.[cellAddress(selectionCell.row, selectionCell.col)]
    : undefined;

  const hasComment = !!currentCell?.comment;

  return {
    snapshot,
    selectedCell: selectionCell,
    setSelectedCell,
    cellValue,
    getSelectedRange,
    editingCell,
    editValue,
    editingCellRef,
    editValueRef,
    handleEditSave,
    handleEditCancel,
    handleEditValueChange,
    fillHandleState,
    fillHandleRef,
    isFillPreview,
    handleFillHandleMouseDown,
    handleFillHandleDoubleClick,
    handleCellClick,
    handleCellDoubleClick,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    handleSelectRow,
    handleSelectColumn,
    handleSelectAll,
    handleColumnResizeStart,
    handleRowResizeStart,
    columnWidths,
    rowHeights,
    gridRef,
    onCanvasMouseDown,
    isInRange,
    getMergeInfo,
    handleCellValueChange,
    handleCopy,
    handleCut,
    handlePaste,
    handleClear,
    handleStyleTool,
    handleInsertRow,
    handleDeleteRow,
    handleInsertColumn,
    handleDeleteColumn,
    handleFillDown,
    handleFillSeries,
    handleAddSheet,
    handleRemoveSheet,
    handleRenameSheet,
    handleMerge,
    handleUnmerge,
    handleMergeCenter,
    handleFreeze,
    handleUnfreeze,
    handleUndo,
    handleRedo,
    showFindReplace,
    setShowFindReplace,
    findQuery,
    setFindQuery,
    replaceText,
    setReplaceText,
    findResults,
    setFindResults,
    handleFind,
    handleReplace,
    handleReplaceAll,
    showCommentInput,
    setShowCommentInput,
    commentText,
    setCommentText,
    handleAddComment,
    handleDeleteComment,
    hasComment,
    currentCell,
    dropTargetCell,
    setDropTargetCell,
    dropTargetCellRef,
    handleFieldDrop,
    handleFieldDragOver,
    handleFieldDragLeave,
    handleCellValueSave,
  };
}
