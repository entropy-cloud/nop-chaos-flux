import { useCallback, useEffect, useRef, useState } from 'react';
import { cellAddress, type SpreadsheetRange } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

export interface FillHandleState {
  isFilling: boolean;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  currentRow: number;
  currentCol: number;
}

export function useFillHandle(
  bridge: SpreadsheetBridge,
  snapshot: SpreadsheetHostSnapshot,
  sheetId: string,
  addLog: (msg: string) => void,
  getSelectedRange: () => SpreadsheetRange | null,
) {
  const [fillHandleState, setFillHandleState] = useState<FillHandleState>({
    isFilling: false,
    startRow: 0,
    startCol: 0,
    endRow: 0,
    endCol: 0,
    currentRow: 0,
    currentCol: 0,
  });
  const fillHandleRef = useRef<FillHandleState>(fillHandleState);
  useEffect(() => {
    fillHandleRef.current = fillHandleState;
  }, [fillHandleState]);

  const isFillPreview = useCallback(
    (row: number, col: number): boolean => {
      if (!fillHandleState.isFilling) return false;
      const { startRow, startCol, endRow, endCol, currentRow, currentCol } = fillHandleState;
      let previewEndRow = endRow;
      let previewEndCol = endCol;
      if (currentRow > endRow) {
        previewEndRow = currentRow;
      } else if (currentCol > endCol) {
        previewEndCol = currentCol;
      } else {
        return false;
      }
      return row >= startRow && row <= previewEndRow && col >= startCol && col <= previewEndCol;
    },
    [fillHandleState],
  );

  const handleFillHandleMouseDown = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const range = getSelectedRange();
      if (!range) return;
      const state: FillHandleState = {
        isFilling: true,
        startRow: range.startRow,
        startCol: range.startCol,
        endRow: range.endRow,
        endCol: range.endCol,
        currentRow: row,
        currentCol: col,
      };
      fillHandleRef.current = state;
      setFillHandleState(state);
    },
    [getSelectedRange],
  );

  const handleFillHandleDoubleClick = useCallback(async () => {
    const range = getSelectedRange();
    const activeSheet = snapshot.activeSheet;
    if (!range || !activeSheet) {
      return;
    }

    const candidateCols = [] as number[];
    if (range.endCol + 1 < 26) {
      candidateCols.push(range.endCol + 1);
    }
    if (range.startCol - 1 >= 0) {
      candidateCols.push(range.startCol - 1);
    }

    const cells = activeSheet.cells ?? {};
    let fillEndRow = range.endRow;

    const hasValue = (row: number, col: number) => {
      const cell = cells[cellAddress(row, col)];
      return cell?.value !== undefined && cell?.value !== null && cell?.value !== '';
    };

    for (const candidateCol of candidateCols) {
      if (!hasValue(range.startRow, candidateCol)) {
        continue;
      }

      let probeRow = range.endRow + 1;
      while (probeRow < 100 && hasValue(probeRow, candidateCol)) {
        fillEndRow = probeRow;
        probeRow += 1;
      }

      if (fillEndRow > range.endRow) {
        break;
      }
    }

    if (fillEndRow <= range.endRow) {
      return;
    }

    await bridge.dispatch({
      type: 'spreadsheet:fillSeries',
      range: {
        sheetId,
        startRow: range.startRow,
        startCol: range.startCol,
        endRow: fillEndRow,
        endCol: range.endCol,
      },
      direction: 'down',
    });
    addLog(
      `Series fill down: ${cellAddress(range.startRow, range.startCol)}:${cellAddress(fillEndRow, range.endCol)}`,
    );
  }, [addLog, bridge, getSelectedRange, sheetId, snapshot.activeSheet]);

  useEffect(() => {
    if (!fillHandleState.isFilling) return;

    let rafId = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      const td = (el as HTMLElement).closest('td.ss-cell');
      if (!td) return;
      const row = parseInt((td as HTMLElement).dataset.row || '-1');
      const col = parseInt((td as HTMLElement).dataset.col || '-1');
      if (row >= 0 && col >= 0) {
        fillHandleRef.current = { ...fillHandleRef.current, currentRow: row, currentCol: col };
        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            rafId = 0;
            setFillHandleState((prev) => ({
              ...prev,
              currentRow: fillHandleRef.current.currentRow,
              currentCol: fillHandleRef.current.currentCol,
            }));
          });
        }
      }
    };

    const handleMouseUp = async () => {
      const { startRow, startCol, endRow, endCol, currentRow, currentCol } = fillHandleRef.current;

      let fillDirection: 'down' | 'right' | null = null;
      let targetRange: SpreadsheetRange | null = null;

      if (currentRow > endRow) {
        fillDirection = 'down';
        targetRange = { sheetId, startRow, startCol, endRow: currentRow, endCol };
      } else if (currentCol > endCol) {
        fillDirection = 'right';
        targetRange = { sheetId, startRow, startCol, endRow, endCol: currentCol };
      }

      if (fillDirection && targetRange) {
        await bridge.dispatch({
          type: 'spreadsheet:fillSeries',
          range: targetRange,
          direction: fillDirection,
        });
        addLog(
          `Series fill ${fillDirection}: ${cellAddress(startRow, startCol)}:${cellAddress(targetRange.endRow, targetRange.endCol)}`,
        );
      }

      const reset: FillHandleState = {
        isFilling: false,
        startRow: 0,
        startCol: 0,
        endRow: 0,
        endCol: 0,
        currentRow: 0,
        currentCol: 0,
      };
      fillHandleRef.current = reset;
      setFillHandleState(reset);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [fillHandleState.isFilling, bridge, sheetId, addLog]);

  return {
    fillHandleState,
    fillHandleRef,
    isFillPreview,
    handleFillHandleMouseDown,
    handleFillHandleDoubleClick,
  };
}
