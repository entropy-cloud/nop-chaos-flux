import { useCallback, useMemo, useRef, useState } from 'react';
import {
  cellAddress,
  type SpreadsheetRange,
  type SpreadsheetSelection,
} from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

export interface DragState {
  isDragging: boolean;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

function isAbortLike(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    ((error as { name?: string } | null | undefined)?.name === 'AbortError')
  );
}

function formatFailureMessage(prefix: string, error: unknown): string {
  return error instanceof Error && error.message ? `${prefix}: ${error.message}` : prefix;
}

function createRange(
  sheetId: string,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): SpreadsheetRange {
  return {
    sheetId,
    startRow: Math.min(startRow, endRow),
    startCol: Math.min(startCol, endCol),
    endRow: Math.max(startRow, endRow),
    endCol: Math.max(startCol, endCol),
  };
}

function isSameRange(left: SpreadsheetRange | null, right: SpreadsheetRange | null): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    left.sheetId === right.sheetId &&
    left.startRow === right.startRow &&
    left.startCol === right.startCol &&
    left.endRow === right.endRow &&
    left.endCol === right.endCol
  );
}

export function useSelection(
  snapshot: SpreadsheetHostSnapshot,
  bridge: SpreadsheetBridge,
  sheetId: string,
  addLog: (msg: string) => void,
  setCommentText: (text: string) => void,
  setCellValue: (value: string) => void,
) {
  const totalRows = 100;
  const totalCols = 26;

  const selectedCell = useMemo(
    () =>
      snapshot.activeCell ? { row: snapshot.activeCell.row, col: snapshot.activeCell.col } : null,
    [snapshot.activeCell],
  );
  const [previewRange, setPreviewRange] = useState<SpreadsheetRange | null>(null);
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    startRow: -1,
    startCol: -1,
    endRow: -1,
    endCol: -1,
  });
  const hasDraggedRef = useRef(false);

  const settleSelectionDispatch = useCallback(
    async (work: () => Promise<unknown>, successLog?: string) => {
      try {
        await work();
        if (successLog) {
          addLog(successLog);
        }
      } catch (error) {
        if (!isAbortLike(error)) {
          addLog(formatFailureMessage('Selection failed', error));
        }
      }
    },
    [addLog],
  );

  const commitEditingCell = useCallback(async () => {
    const core = bridge.getCore();
    const editingState = core.getSnapshot().editing;
    if (!editingState) {
      return;
    }

    const { cell, draftValue } = editingState;
    if (cell.row < 0 || cell.col < 0 || cell.row >= totalRows || cell.col >= totalCols) {
      core.clearEditing();
      return;
    }

    const addr = cellAddress(cell.row, cell.col);
    core.clearEditing();

    try {
      await bridge.dispatch({
        type: 'spreadsheet:setCellValue',
        cell: { sheetId, address: addr, row: cell.row, col: cell.col },
        value: String(draftValue ?? ''),
      });
    } catch (error) {
      if (!isAbortLike(error)) {
        addLog(formatFailureMessage('Cell save failed', error));
      }
    }
  }, [addLog, bridge, sheetId]);

  const syncSelectionToCore = useCallback(
    async (selection: SpreadsheetSelection) => {
      await bridge.dispatch({ type: 'spreadsheet:setSelection', selection });
    },
    [bridge],
  );

  const requestSelectedCell = useCallback(
    async (cell: { row: number; col: number } | null) => {
      if (cell) {
        await syncSelectionToCore({
          kind: 'cell',
          sheetId,
          anchor: {
            sheetId,
            address: cellAddress(cell.row, cell.col),
            row: cell.row,
            col: cell.col,
          },
        });
      } else {
        await syncSelectionToCore({ kind: 'none' });
      }
    },
    [sheetId, syncSelectionToCore],
  );

  const setSelectedCell = useCallback(
    (cell: { row: number; col: number } | null) => {
      void settleSelectionDispatch(() => requestSelectedCell(cell));
    },
    [requestSelectedCell, settleSelectionDispatch],
  );

  const syncRangeSelectionToCore = useCallback(
    async (range: SpreadsheetRange) => {
      await syncSelectionToCore({
        kind: 'range',
        sheetId,
        range,
        anchor: {
          sheetId,
          address: cellAddress(range.startRow, range.startCol),
          row: range.startRow,
          col: range.startCol,
        },
      });
    },
    [sheetId, syncSelectionToCore],
  );

  const getSelectedRange = useCallback((): SpreadsheetRange | null => {
    if (previewRange) {
      return previewRange;
    }
    if (snapshot.activeRange) {
      return snapshot.activeRange;
    }
    if (snapshot.selection.kind === 'row' && snapshot.selection.rows?.length) {
      const rows = [...snapshot.selection.rows].sort((a, b) => a - b);
      return createRange(sheetId, rows[0]!, 0, rows[rows.length - 1]!, totalCols - 1);
    }
    if (snapshot.selection.kind === 'column' && snapshot.selection.columns?.length) {
      const columns = [...snapshot.selection.columns].sort((a, b) => a - b);
      return createRange(sheetId, 0, columns[0]!, totalRows - 1, columns[columns.length - 1]!);
    }
    if (snapshot.selection.kind === 'sheet') {
      return createRange(sheetId, 0, 0, totalRows - 1, totalCols - 1);
    }
    const state = dragStateRef.current;
    if (state.startRow >= 0 && state.endRow >= 0) {
      return createRange(sheetId, state.startRow, state.startCol, state.endRow, state.endCol);
    }
    if (selectedCell) {
      return createRange(
        sheetId,
        selectedCell.row,
        selectedCell.col,
        selectedCell.row,
        selectedCell.col,
      );
    }
    return null;
  }, [previewRange, selectedCell, sheetId, snapshot.activeRange, snapshot.selection]);

  const isInRange = useCallback(
    (row: number, col: number): boolean => {
      const range = getSelectedRange();
      if (!range) return false;
      return (
        row >= range.startRow && row <= range.endRow && col >= range.startCol && col <= range.endCol
      );
    },
    [getSelectedRange],
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!hasDraggedRef.current) {
        dragStateRef.current = {
          isDragging: false,
          startRow: row,
          startCol: col,
          endRow: row,
          endCol: col,
        };
        setPreviewRange(null);
        const cell = snapshot.activeSheet?.cells?.[cellAddress(row, col)];
        setCellValue(String(cell?.value ?? ''));
        const comment = cell?.comment;
        setCommentText(typeof comment === 'string' ? comment : (comment?.text ?? ''));
        void (async () => {
          await commitEditingCell();
          await settleSelectionDispatch(
            () => requestSelectedCell({ row, col }),
            `Selected ${cellAddress(row, col)}`,
          );
        })();
      }
      hasDraggedRef.current = false;
    },
    [
      snapshot,
      commitEditingCell,
      setCommentText,
      setCellValue,
      requestSelectedCell,
      settleSelectionDispatch,
    ],
  );

  const handleCellMouseDown = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      hasDraggedRef.current = false;
      dragStateRef.current = {
        isDragging: true,
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col,
      };
      setPreviewRange(createRange(sheetId, row, col, row, col));
      void settleSelectionDispatch(() => requestSelectedCell({ row, col }));
    },
    [requestSelectedCell, settleSelectionDispatch, sheetId],
  );

  const handleCellMouseEnter = useCallback(
    (row: number, col: number) => {
      if (dragStateRef.current.isDragging) {
        hasDraggedRef.current = true;
        dragStateRef.current = { ...dragStateRef.current, endRow: row, endCol: col };
        const nextRange = createRange(
          sheetId,
          dragStateRef.current.startRow,
          dragStateRef.current.startCol,
          row,
          col,
        );
        setPreviewRange((current) => (isSameRange(current, nextRange) ? current : nextRange));
      }
    },
    [sheetId],
  );

  const handleMouseUp = useCallback(
    (
      isResizing: boolean,
      onResizeEnd: () => void,
      getSelectedRangeFn: () => SpreadsheetRange | null,
    ) => {
      if (dragStateRef.current.isDragging) {
        dragStateRef.current = { ...dragStateRef.current, isDragging: false };
        const range = getSelectedRangeFn();
        if (range && hasDraggedRef.current) {
          setPreviewRange(null);
          void settleSelectionDispatch(
            () => syncRangeSelectionToCore(range),
            `Selected range ${cellAddress(range.startRow, range.startCol)}:${cellAddress(range.endRow, range.endCol)}`,
          );
        } else {
          setPreviewRange(null);
        }
      }
      if (isResizing) {
        onResizeEnd();
      }
    },
    [settleSelectionDispatch, syncRangeSelectionToCore],
  );

  const handleSelectRow = useCallback(
    (row: number, extend = false) => {
      dragStateRef.current = {
        isDragging: false,
        startRow: row,
        startCol: 0,
        endRow: row,
        endCol: 0,
      };
      setPreviewRange(null);
      void settleSelectionDispatch(
        () => bridge.dispatch({ type: 'spreadsheet:selectRow', sheetId, row, extend }),
        `Selected row ${row + 1}`,
      );
    },
    [bridge, settleSelectionDispatch, sheetId],
  );

  const handleSelectColumn = useCallback(
    (col: number, extend = false) => {
      dragStateRef.current = {
        isDragging: false,
        startRow: 0,
        startCol: col,
        endRow: 0,
        endCol: col,
      };
      setPreviewRange(null);
      void settleSelectionDispatch(
        () => bridge.dispatch({ type: 'spreadsheet:selectColumn', sheetId, col, extend }),
        `Selected column ${cellAddress(0, col).replace(/[0-9]/g, '')}`,
      );
    },
    [bridge, settleSelectionDispatch, sheetId],
  );

  const handleSelectAll = useCallback(() => {
    dragStateRef.current = { isDragging: false, startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
    setPreviewRange(null);
    void settleSelectionDispatch(
      () => bridge.dispatch({ type: 'spreadsheet:selectAll', sheetId }),
      'Selected entire sheet',
    );
  }, [bridge, settleSelectionDispatch, sheetId]);

  return {
    selectedCell,
    setSelectedCell,
    dragStateRef,
    hasDraggedRef,
    getSelectedRange,
    isInRange,
    handleCellClick,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    handleSelectRow,
    handleSelectColumn,
    handleSelectAll,
  };
}
