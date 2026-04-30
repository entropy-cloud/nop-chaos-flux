import { useCallback } from 'react';
import {
  cellAddress,
  type SpreadsheetRange,
  type WorksheetDocument,
} from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge } from '../bridge.js';

export interface UseContextMenuActionsParams {
  bridge: SpreadsheetBridge;
  selectedRange: SpreadsheetRange | null;
  selectionAnchorCell: { row: number; col: number } | null;
  selectedRowInfo: { start: number; end: number; count: number } | null;
  selectedColumnInfo: { start: number; end: number; count: number } | null;
  sortRange: SpreadsheetRange | null;
  activeSheetId: string;
  cells: WorksheetDocument['cells'];
}

export interface ContextMenuActions {
  handleContextCopy: () => Promise<void>;
  handleContextCut: () => Promise<void>;
  handleContextPaste: () => Promise<void>;
  handleContextClear: () => Promise<void>;
  handleContextInsertRow: () => Promise<void>;
  handleContextInsertRowBelow: () => Promise<void>;
  handleContextDeleteRow: () => Promise<void>;
  handleContextInsertColumn: () => Promise<void>;
  handleContextInsertColumnRight: () => Promise<void>;
  handleContextDeleteColumn: () => Promise<void>;
  handleContextMerge: () => Promise<void>;
  handleContextUnmerge: () => Promise<void>;
  handleContextFreeze: () => Promise<void>;
  handleContextUnfreeze: () => Promise<void>;
  handleContextSort: (direction: 'asc' | 'desc') => Promise<void>;
  handleContextFilterBySelectedValue: () => Promise<void>;
  handleContextClearFilter: () => Promise<void>;
}

export function useContextMenuActions(params: UseContextMenuActionsParams): ContextMenuActions {
  const {
    bridge,
    selectedRange,
    selectionAnchorCell,
    selectedRowInfo,
    selectedColumnInfo,
    sortRange,
    activeSheetId,
    cells,
  } = params;

  const handleContextCopy = useCallback(async () => {
    if (!selectedRange) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:copyCells', range: selectedRange });
  }, [bridge, selectedRange]);

  const handleContextCut = useCallback(async () => {
    if (!selectedRange) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:cutCells', range: selectedRange });
  }, [bridge, selectedRange]);

  const handleContextPaste = useCallback(async () => {
    const targetCell = selectionAnchorCell;
    if (!targetCell || !activeSheetId) {
      return;
    }

    await bridge.dispatch({
      type: 'spreadsheet:pasteCells',
      target: {
        sheetId: activeSheetId,
        address: cellAddress(targetCell.row, targetCell.col),
        row: targetCell.row,
        col: targetCell.col,
      },
    });
  }, [activeSheetId, bridge, selectionAnchorCell]);

  const handleContextClear = useCallback(async () => {
    if (!selectedRange) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:clearCells', target: selectedRange });
  }, [bridge, selectedRange]);

  const handleContextInsertRow = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    const row = selectedRowInfo?.start ?? selectionAnchorCell?.row;
    if (row == null) {
      return;
    }
    await bridge.dispatch({
      type: 'spreadsheet:insertRow',
      sheetId: activeSheetId,
      row,
      count: selectedRowInfo?.count,
    });
  }, [activeSheetId, bridge, selectedRowInfo, selectionAnchorCell]);

  const handleContextInsertRowBelow = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    const row = selectedRowInfo?.end ?? selectionAnchorCell?.row;
    if (row == null) {
      return;
    }
    await bridge.dispatch({
      type: 'spreadsheet:insertRow',
      sheetId: activeSheetId,
      row: row + 1,
      count: selectedRowInfo?.count,
    });
  }, [activeSheetId, bridge, selectedRowInfo, selectionAnchorCell]);

  const handleContextDeleteRow = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    const row = selectedRowInfo?.start ?? selectionAnchorCell?.row;
    if (row == null) {
      return;
    }
    await bridge.dispatch({
      type: 'spreadsheet:deleteRow',
      sheetId: activeSheetId,
      row,
      count: selectedRowInfo?.count,
    });
  }, [activeSheetId, bridge, selectedRowInfo, selectionAnchorCell]);

  const handleContextInsertColumn = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    const col = selectedColumnInfo?.start ?? selectionAnchorCell?.col;
    if (col == null) {
      return;
    }
    await bridge.dispatch({
      type: 'spreadsheet:insertColumn',
      sheetId: activeSheetId,
      col,
      count: selectedColumnInfo?.count,
    });
  }, [activeSheetId, bridge, selectedColumnInfo, selectionAnchorCell]);

  const handleContextInsertColumnRight = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    const col = selectedColumnInfo?.end ?? selectionAnchorCell?.col;
    if (col == null) {
      return;
    }
    await bridge.dispatch({
      type: 'spreadsheet:insertColumn',
      sheetId: activeSheetId,
      col: col + 1,
      count: selectedColumnInfo?.count,
    });
  }, [activeSheetId, bridge, selectedColumnInfo, selectionAnchorCell]);

  const handleContextDeleteColumn = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    const col = selectedColumnInfo?.start ?? selectionAnchorCell?.col;
    if (col == null) {
      return;
    }
    await bridge.dispatch({
      type: 'spreadsheet:deleteColumn',
      sheetId: activeSheetId,
      col,
      count: selectedColumnInfo?.count,
    });
  }, [activeSheetId, bridge, selectedColumnInfo, selectionAnchorCell]);

  const handleContextMerge = useCallback(async () => {
    if (!selectedRange) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:mergeRange', range: selectedRange });
  }, [bridge, selectedRange]);

  const handleContextUnmerge = useCallback(async () => {
    if (!selectedRange) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:unmergeRange', range: selectedRange });
  }, [bridge, selectedRange]);

  const handleContextFreeze = useCallback(async () => {
    if (!activeSheetId || !selectionAnchorCell) {
      return;
    }
    await bridge.dispatch({
      type: 'spreadsheet:freezePanes',
      sheetId: activeSheetId,
      row: selectionAnchorCell.row,
      col: selectionAnchorCell.col,
    });
  }, [activeSheetId, bridge, selectionAnchorCell]);

  const handleContextUnfreeze = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:unfreezePanes', sheetId: activeSheetId });
  }, [activeSheetId, bridge]);

  const handleContextSort = useCallback(
    async (direction: 'asc' | 'desc') => {
      if (!sortRange || !selectionAnchorCell) {
        return;
      }
      await bridge.dispatch({
        type: 'spreadsheet:sortRange',
        range: sortRange,
        keyCol: selectionAnchorCell.col,
        direction,
      });
    },
    [bridge, selectionAnchorCell, sortRange],
  );

  const handleContextFilterBySelectedValue = useCallback(async () => {
    if (!activeSheetId || !selectionAnchorCell) {
      return;
    }
    const selectedCellValue =
      cells?.[cellAddress(selectionAnchorCell.row, selectionAnchorCell.col)]?.value;
    await bridge.dispatch({
      type: 'spreadsheet:filterRowsByCellValue',
      sheetId: activeSheetId,
      col: selectionAnchorCell.col,
      value: selectedCellValue,
    });
  }, [activeSheetId, bridge, selectionAnchorCell, cells]);

  const handleContextClearFilter = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:clearRowFilters', sheetId: activeSheetId });
  }, [activeSheetId, bridge]);

  return {
    handleContextCopy,
    handleContextCut,
    handleContextPaste,
    handleContextClear,
    handleContextInsertRow,
    handleContextInsertRowBelow,
    handleContextDeleteRow,
    handleContextInsertColumn,
    handleContextInsertColumnRight,
    handleContextDeleteColumn,
    handleContextMerge,
    handleContextUnmerge,
    handleContextFreeze,
    handleContextUnfreeze,
    handleContextSort,
    handleContextFilterBySelectedValue,
    handleContextClearFilter,
  };
}
