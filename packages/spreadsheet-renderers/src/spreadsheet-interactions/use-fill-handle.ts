import { useCallback, useEffect, useRef, useState } from 'react';
import { cellAddress, type SpreadsheetRange } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge } from '../bridge.js';

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
  sheetId: string,
  addLog: (msg: string) => void,
  getSelectedRange: () => SpreadsheetRange | null
) {
  const [fillHandleState, setFillHandleState] = useState<FillHandleState>({
    isFilling: false, startRow: 0, startCol: 0, endRow: 0, endCol: 0, currentRow: 0, currentCol: 0,
  });
  const fillHandleRef = useRef<FillHandleState>(fillHandleState);
  useEffect(() => {
    fillHandleRef.current = fillHandleState;
  }, [fillHandleState]);

  const isFillPreview = useCallback((row: number, col: number): boolean => {
    if (!fillHandleState.isFilling) return false;
    const { startRow, startCol, endRow, endCol, currentRow, currentCol } = fillHandleState;
    let previewEndRow = endRow;
    let previewEndCol = endCol;
    if (currentRow > endRow) { previewEndRow = currentRow; }
    else if (currentCol > endCol) { previewEndCol = currentCol; }
    else { return false; }
    return row >= startRow && row <= previewEndRow && col >= startCol && col <= previewEndCol;
  }, [fillHandleState]);

  const handleFillHandleMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
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
  }, [getSelectedRange]);

  useEffect(() => {
    if (!fillHandleState.isFilling) return;

    const handleMouseMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      const td = (el as HTMLElement).closest('td.ss-cell');
      if (!td) return;
      const row = parseInt((td as HTMLElement).dataset.row || '-1');
      const col = parseInt((td as HTMLElement).dataset.col || '-1');
      if (row >= 0 && col >= 0) {
        fillHandleRef.current = { ...fillHandleRef.current, currentRow: row, currentCol: col };
        setFillHandleState(prev => ({ ...prev, currentRow: row, currentCol: col }));
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
        addLog(`Series fill ${fillDirection}: ${cellAddress(startRow, startCol)}:${cellAddress(targetRange.endRow, targetRange.endCol)}`);
      }

      const reset: FillHandleState = { isFilling: false, startRow: 0, startCol: 0, endRow: 0, endCol: 0, currentRow: 0, currentCol: 0 };
      fillHandleRef.current = reset;
      setFillHandleState(reset);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [fillHandleState.isFilling, bridge, sheetId, addLog]);

  return { fillHandleState, fillHandleRef, isFillPreview, handleFillHandleMouseDown };
}
