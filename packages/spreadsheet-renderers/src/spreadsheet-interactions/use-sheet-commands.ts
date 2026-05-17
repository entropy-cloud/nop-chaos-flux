import { useCallback } from 'react';
import { cellAddress, type SpreadsheetRange } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

type CommandResultLike = {
  ok?: boolean;
  changed?: boolean;
  cancelled?: boolean;
  error?: unknown;
};

function formatFailureMessage(label: string, error: unknown): string {
  return error instanceof Error && error.message ? error.message : `${label} failed`;
}

export function useSheetCommands(
  snapshot: SpreadsheetHostSnapshot,
  bridge: SpreadsheetBridge,
  sheetId: string,
  selectedCell: { row: number; col: number } | null,
  getSelectedRange: () => SpreadsheetRange | null,
  addLog: (msg: string) => void,
) {
  const reportCommandResult = useCallback(
    (label: string, result: CommandResultLike | void, successMessage = label) => {
      if (!result) {
        addLog(successMessage);
        return;
      }

      if (result.cancelled) {
        addLog(`${label} cancelled`);
        return;
      }

      if (result.ok === false) {
        addLog(formatFailureMessage(label, result.error));
        return;
      }

      addLog(successMessage);
    },
    [addLog],
  );

  const handleInsertRow = useCallback(async () => {
    if (!selectedCell) return;
    const result = await bridge.dispatch({ type: 'spreadsheet:insertRow', sheetId, row: selectedCell.row });
    reportCommandResult('Insert row', result, `Inserted row at ${selectedCell.row + 1}`);
  }, [selectedCell, sheetId, bridge, reportCommandResult]);

  const handleDeleteRow = useCallback(async () => {
    if (!selectedCell) return;
    const result = await bridge.dispatch({ type: 'spreadsheet:deleteRow', sheetId, row: selectedCell.row });
    reportCommandResult('Delete row', result, `Deleted row ${selectedCell.row + 1}`);
  }, [selectedCell, sheetId, bridge, reportCommandResult]);

  const handleInsertColumn = useCallback(async () => {
    if (!selectedCell) return;
    const result = await bridge.dispatch({ type: 'spreadsheet:insertColumn', sheetId, col: selectedCell.col });
    reportCommandResult('Insert column', result, `Inserted column at ${String.fromCharCode(65 + selectedCell.col)}`);
  }, [selectedCell, sheetId, bridge, reportCommandResult]);

  const handleDeleteColumn = useCallback(async () => {
    if (!selectedCell) return;
    const result = await bridge.dispatch({ type: 'spreadsheet:deleteColumn', sheetId, col: selectedCell.col });
    reportCommandResult('Delete column', result, `Deleted column ${String.fromCharCode(65 + selectedCell.col)}`);
  }, [selectedCell, sheetId, bridge, reportCommandResult]);

  const handleFillDown = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    const result = await bridge.dispatch({ type: 'spreadsheet:fillDown', range });
    reportCommandResult('Fill down', result, 'Filled down');
  }, [getSelectedRange, bridge, reportCommandResult]);

  const handleFillSeries = useCallback(
    async (direction: 'down' | 'right') => {
      const range = getSelectedRange();
      if (!range) return;
      const result = await bridge.dispatch({
        type: 'spreadsheet:fillSeries',
        range,
        direction,
        seriesType: 'linear',
      });
      reportCommandResult(`Fill series ${direction}`, result, `Filled series ${direction}`);
    },
    [getSelectedRange, bridge, reportCommandResult],
  );

  const handleAddSheet = useCallback(async () => {
    const result = await bridge.dispatch({
      type: 'spreadsheet:addSheet',
      name: `Sheet${snapshot.workbook.sheets.length + 1}`,
    });
    reportCommandResult('Add sheet', result, 'Added new sheet');
  }, [bridge, snapshot, reportCommandResult]);

  const handleRemoveSheet = useCallback(
    async (id: string) => {
      if (snapshot.workbook.sheets.length <= 1) {
        addLog('Cannot remove last sheet');
        return;
      }
      const result = await bridge.dispatch({ type: 'spreadsheet:removeSheet', sheetId: id });
      reportCommandResult('Remove sheet', result, 'Removed sheet');
    },
    [bridge, snapshot, addLog, reportCommandResult],
  );

  const handleRenameSheet = useCallback(
    async (id: string, name: string) => {
      const result = await bridge.dispatch({ type: 'spreadsheet:renameSheet', sheetId: id, name });
      reportCommandResult('Rename sheet', result, `Renamed sheet to "${name}"`);
    },
    [bridge, reportCommandResult],
  );

  const handleMerge = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    const result = await bridge.dispatch({ type: 'spreadsheet:mergeRange', range });
    reportCommandResult('Merge cells', result, 'Merged cells');
  }, [getSelectedRange, bridge, reportCommandResult]);

  const handleUnmerge = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    const result = await bridge.dispatch({ type: 'spreadsheet:unmergeRange', range });
    reportCommandResult('Unmerge cells', result, 'Unmerged cells');
  }, [getSelectedRange, bridge, reportCommandResult]);

  const handleMergeCenter = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    const result = await bridge.dispatch({ type: 'spreadsheet:mergeCellsCenter', range });
    reportCommandResult('Merge and center', result, 'Merged and centered');
  }, [getSelectedRange, bridge, reportCommandResult]);

  const handleFreeze = useCallback(async () => {
    if (!selectedCell) return;
    const result = await bridge.dispatch({
      type: 'spreadsheet:freezePanes',
      sheetId,
      row: selectedCell.row,
      col: selectedCell.col,
    });
    reportCommandResult(
      'Freeze panes',
      result,
      `Froze panes at ${cellAddress(selectedCell.row, selectedCell.col)}`,
    );
  }, [selectedCell, sheetId, bridge, reportCommandResult]);

  const handleUnfreeze = useCallback(async () => {
    const result = await bridge.dispatch({ type: 'spreadsheet:unfreezePanes', sheetId });
    reportCommandResult('Unfreeze panes', result, 'Unfroze panes');
  }, [sheetId, bridge, reportCommandResult]);

  const handleUndo = useCallback(async () => {
    const result = await bridge.dispatch({ type: 'spreadsheet:undo' });
    reportCommandResult('Undo', result as CommandResultLike);
  }, [bridge, reportCommandResult]);

  const handleRedo = useCallback(async () => {
    const result = await bridge.dispatch({ type: 'spreadsheet:redo' });
    reportCommandResult('Redo', result as CommandResultLike);
  }, [bridge, reportCommandResult]);

  const getMergeInfo = useCallback(
    (
      row: number,
      col: number,
    ): { isMerged: boolean; isTopLeft: boolean; rowSpan: number; colSpan: number } => {
      const merges = snapshot.activeSheet?.merges ?? [];
      for (const merge of merges) {
        if (
          row >= merge.startRow &&
          row <= merge.endRow &&
          col >= merge.startCol &&
          col <= merge.endCol
        ) {
          return {
            isMerged: true,
            isTopLeft: row === merge.startRow && col === merge.startCol,
            rowSpan: merge.endRow - merge.startRow + 1,
            colSpan: merge.endCol - merge.startCol + 1,
          };
        }
      }
      return { isMerged: false, isTopLeft: false, rowSpan: 1, colSpan: 1 };
    },
    [snapshot.activeSheet?.merges],
  );

  return {
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
  };
}
