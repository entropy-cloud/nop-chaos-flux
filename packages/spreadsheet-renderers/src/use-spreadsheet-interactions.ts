import { useCallback, useMemo } from 'react';
import { cellAddress } from '@nop-chaos/spreadsheet-core';
import { t } from '@nop-chaos/flux-i18n';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from './bridge.js';
import { formatFailureMessage, isAbortLike } from './spreadsheet-interactions/error-format.js';
import { DEFAULT_GRID_COLS, DEFAULT_GRID_ROWS } from './spreadsheet-interactions/grid-dimensions.js';
import {
  useSnapshotSelector,
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
  /** Full demo-era log stream (success + failure). Semantics unchanged. */
  onLog?: (msg: string) => void;
  /** Failure-only observation surface for host assembly points; runs in
   * addition to onLog so hosts can surface command/selection failures. */
  onFailure?: (msg: string) => void;
}

export interface SpreadsheetInteractionsReturn {
  snapshot: SpreadsheetHostSnapshot;
  selectedCell: { row: number; col: number } | null;
  setSelectedCell: (cell: { row: number; col: number } | null) => void;
  cellValue: string;
  getSelectedRange: ReturnType<typeof useSelection>['getSelectedRange'];
  editingCell: { row: number; col: number } | null;
  editValue: string;
  editSaveState: ReturnType<typeof useEditing>['editSaveState'];
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
  const { bridge, sheetId, onLog, onFailure } = config;
  const dimensions = useMemo(
    () => ({
      rows: config.rows ?? DEFAULT_GRID_ROWS,
      cols: config.cols ?? DEFAULT_GRID_COLS,
    }),
    [config.rows, config.cols],
  );
  const workbook = useSnapshotSelector(bridge, (snapshot) => snapshot.workbook);
  const activeSheet = useSnapshotSelector(bridge, (snapshot) => snapshot.activeSheet);
  const selection = useSnapshotSelector(bridge, (snapshot) => snapshot.selection);
  const activeCell = useSnapshotSelector(bridge, (snapshot) => snapshot.activeCell);
  const activeRange = useSnapshotSelector(bridge, (snapshot) => snapshot.activeRange);
  const runtime = useSnapshotSelector(bridge, (snapshot) => snapshot.runtime);
  const editing = useSnapshotSelector(bridge, (snapshot) => snapshot.editing);
  const snapshot = useMemo<SpreadsheetHostSnapshot>(
    () => ({
      workbook,
      activeSheet,
      selection,
      activeCell,
      activeRange,
      editing,
      runtime,
    }),
    [activeCell, activeRange, activeSheet, editing, runtime, selection, workbook],
  );
  const readOnly = snapshot.runtime.readonly;
  const selectedCell = snapshot.activeCell
    ? { row: snapshot.activeCell.row, col: snapshot.activeCell.col }
    : null;
  const { addLog, cellValue, commentText, gridRef } =
    useSpreadsheetShell(snapshot, selectedCell, onLog);

  const addFailureLog = useCallback(
    (message: string) => {
      addLog(message);
      onFailure?.(message);
    },
    [addLog, onFailure],
  );

  const {
    editingCell,
    editValue,
    editSaveState,
    handleCellDoubleClick,
    handleEditSave,
    handleEditCancel,
    handleEditValueChange,
    handleCellValueSave,
  } = useEditing(snapshot, bridge, sheetId, selectedCell, cellValue);

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
    addFailureLog,
    dimensions,
  );

  const {
    fillHandleState,
    fillHandleRef,
    isFillPreview,
    handleFillHandleMouseDown,
    handleFillHandleDoubleClick,
  } = useFillHandle(bridge, snapshot, sheetId, addLog, getSelectedRange, dimensions);

  const {
    resizeState,
    columnWidths,
    rowHeights,
    handleColumnResizeStart,
    handleRowResizeStart,
    endResize,
  } = useResize({ bridge, snapshot, sheetId, addFailureLog });

  const handleMouseUp = useCallback(() => {
    selectionMouseUp(resizeState.isResizing, endResize, getSelectedRange);
  }, [selectionMouseUp, resizeState.isResizing, endResize, getSelectedRange]);

  const handleCommandError = useCallback(
    (error: unknown) => {
      if (!isAbortLike(error)) {
        addFailureLog(formatFailureMessage(t('flux.spreadsheet.commandFailed'), error));
      }
    },
    [addFailureLog],
  );

  useMouseUpBinding(handleMouseUp);

  const { handleCopy, handleCut, handlePaste, handleClear } = useClipboard(
    snapshot,
    bridge,
    sheetId,
    selectedCell,
    getSelectedRange,
    addLog,
    addFailureLog,
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
  } = useSheetCommands(snapshot, bridge, sheetId, selectedCell, getSelectedRange, addLog, addFailureLog);

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
    useComments(bridge, sheetId, selectionCell, readOnly, addLog, commentText);

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
    if (editingCell) {
      void handleEditSave().catch((error) => {
        if (!isAbortLike(error)) {
          addFailureLog(formatFailureMessage(t('flux.spreadsheet.cellSaveFailed'), error));
        }
      });
    }
  }, [addFailureLog, editingCell, handleEditSave]);

  const handleCellValueChange = useCellValueSync({
    bridge,
    sheetId,
    selectedCell: selectionCell,
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
    editSaveState,
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
