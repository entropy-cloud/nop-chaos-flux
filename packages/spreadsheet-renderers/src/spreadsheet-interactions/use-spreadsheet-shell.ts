import { useCallback, useRef } from 'react';
import { cellAddress } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetHostSnapshot } from '../bridge.js';

export function useSpreadsheetShell(
  snapshot: SpreadsheetHostSnapshot,
  selectedCell: { row: number; col: number } | null,
  onLog?: (msg: string) => void,
) {
  const addLog = useCallback(
    (msg: string) => {
      onLog?.(msg);
    },
    [onLog],
  );
  const gridRef = useRef<HTMLDivElement>(null);

  const cell = selectedCell
    ? snapshot.activeSheet?.cells?.[cellAddress(selectedCell.row, selectedCell.col)]
    : undefined;
  const comment = cell?.comment;
  const cellValue = String(cell?.value ?? '');
  const commentText = typeof comment === 'string' ? comment : (comment?.text ?? '');

  const setCellValue = useCallback(
    (_value: React.SetStateAction<string>) => {
    },
    [],
  );

  const setCommentText = useCallback(
    (_value: React.SetStateAction<string>) => {
    },
    [],
  );

  return {
    addLog,
    cellValue,
    setCellValue,
    commentText,
    setCommentText,
    gridRef,
  };
}
