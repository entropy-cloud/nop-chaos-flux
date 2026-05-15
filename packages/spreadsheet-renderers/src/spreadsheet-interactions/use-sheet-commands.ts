import { useCallback } from 'react';
import { cellAddress, type SpreadsheetRange } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

export function useSheetCommands(
  snapshot: SpreadsheetHostSnapshot,
  bridge: SpreadsheetBridge,
  sheetId: string,
  selectedCell: { row: number; col: number } | null,
  getSelectedRange: () => SpreadsheetRange | null,
  addLog: (msg: string) => void,
) {
  const reportCommandResult = useCallback(
    (label: string, result: { ok?: boolean; cancelled?: boolean; error?: unknown } | void) => {
      if (!result) {
        addLog(label);
        return;
      }

      if (result.ok === false) {
        if (result.cancelled) {
          addLog(`${label} cancelled`);
          return;
        }

        const message =
          result.error instanceof Error && result.error.message ? result.error.message : `${label} failed`;
        addLog(message);
        return;
      }

      addLog(label);
    },
    [addLog],
  );

  const handleInsertRow = useCallback(async () => {
    if (!selectedCell) return;
    await bridge.dispatch({ type: 'spreadsheet:insertRow', sheetId, row: selectedCell.row });
    addLog(`Inserted row at ${selectedCell.row + 1}`);
  }, [selectedCell, sheetId, bridge, addLog]);

  const handleDeleteRow = useCallback(async () => {
    if (!selectedCell) return;
    await bridge.dispatch({ type: 'spreadsheet:deleteRow', sheetId, row: selectedCell.row });
    addLog(`Deleted row ${selectedCell.row + 1}`);
  }, [selectedCell, sheetId, bridge, addLog]);

  const handleInsertColumn = useCallback(async () => {
    if (!selectedCell) return;
    await bridge.dispatch({ type: 'spreadsheet:insertColumn', sheetId, col: selectedCell.col });
    addLog(`Inserted column at ${String.fromCharCode(65 + selectedCell.col)}`);
  }, [selectedCell, sheetId, bridge, addLog]);

  const handleDeleteColumn = useCallback(async () => {
    if (!selectedCell) return;
    await bridge.dispatch({ type: 'spreadsheet:deleteColumn', sheetId, col: selectedCell.col });
    addLog(`Deleted column ${String.fromCharCode(65 + selectedCell.col)}`);
  }, [selectedCell, sheetId, bridge, addLog]);

  const handleFillDown = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await bridge.dispatch({ type: 'spreadsheet:fillDown', range });
    addLog('Filled down');
  }, [getSelectedRange, bridge, addLog]);

  const handleFillSeries = useCallback(
    async (direction: 'down' | 'right') => {
      const range = getSelectedRange();
      if (!range) return;
      await bridge.dispatch({
        type: 'spreadsheet:fillSeries',
        range,
        direction,
        seriesType: 'linear',
      });
      addLog(`Filled series ${direction}`);
    },
    [getSelectedRange, bridge, addLog],
  );

  const handleAddSheet = useCallback(async () => {
    await bridge.dispatch({
      type: 'spreadsheet:addSheet',
      name: `Sheet${snapshot.workbook.sheets.length + 1}`,
    });
    addLog('Added new sheet');
  }, [bridge, snapshot, addLog]);

  const handleRemoveSheet = useCallback(
    async (id: string) => {
      if (snapshot.workbook.sheets.length <= 1) {
        addLog('Cannot remove last sheet');
        return;
      }
      await bridge.dispatch({ type: 'spreadsheet:removeSheet', sheetId: id });
      addLog('Removed sheet');
    },
    [bridge, snapshot, addLog],
  );

  const handleRenameSheet = useCallback(
    async (id: string, name: string) => {
      await bridge.dispatch({ type: 'spreadsheet:renameSheet', sheetId: id, name });
      addLog(`Renamed sheet to "${name}"`);
    },
    [bridge, addLog],
  );

  const handleMerge = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await bridge.dispatch({ type: 'spreadsheet:mergeRange', range });
    addLog('Merged cells');
  }, [getSelectedRange, bridge, addLog]);

  const handleUnmerge = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await bridge.dispatch({ type: 'spreadsheet:unmergeRange', range });
    addLog('Unmerged cells');
  }, [getSelectedRange, bridge, addLog]);

  const handleMergeCenter = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await bridge.dispatch({ type: 'spreadsheet:mergeCellsCenter', range });
    addLog('Merged and centered');
  }, [getSelectedRange, bridge, addLog]);

  const handleFreeze = useCallback(async () => {
    if (!selectedCell) return;
    await bridge.dispatch({
      type: 'spreadsheet:freezePanes',
      sheetId,
      row: selectedCell.row,
      col: selectedCell.col,
    });
    addLog(`Froze panes at ${cellAddress(selectedCell.row, selectedCell.col)}`);
  }, [selectedCell, sheetId, bridge, addLog]);

  const handleUnfreeze = useCallback(async () => {
    await bridge.dispatch({ type: 'spreadsheet:unfreezePanes', sheetId });
    addLog('Unfroze panes');
  }, [sheetId, bridge, addLog]);

  const handleUndo = useCallback(async () => {
    const result = await bridge.dispatch({ type: 'spreadsheet:undo' });
    reportCommandResult('Undo', result as { ok?: boolean; cancelled?: boolean; error?: unknown });
  }, [bridge, reportCommandResult]);

  const handleRedo = useCallback(async () => {
    const result = await bridge.dispatch({ type: 'spreadsheet:redo' });
    reportCommandResult('Redo', result as { ok?: boolean; cancelled?: boolean; error?: unknown });
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
