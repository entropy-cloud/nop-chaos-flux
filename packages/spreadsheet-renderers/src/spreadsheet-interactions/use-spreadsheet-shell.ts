import { useCallback, useMemo, useRef, useState } from 'react';
import { cellAddress } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetHostSnapshot } from '../bridge.js';

function resolveDraftValue(
  next: React.SetStateAction<string>,
  current: string,
): string {
  return typeof next === 'function' ? next(current) : next;
}

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
  const selectedCellSnapshot = useMemo(() => {
    if (!selectedCell) {
      return {
        selectedKey: '',
        cellValue: '',
        commentText: '',
      };
    }

    const cell = snapshot.activeSheet?.cells?.[cellAddress(selectedCell.row, selectedCell.col)];
    const comment = cell?.comment;
    return {
      selectedKey: `${selectedCell.row}:${selectedCell.col}:${String(cell?.value ?? '')}:${typeof comment === 'string' ? comment : (comment?.text ?? '')}`,
      cellValue: String(cell?.value ?? ''),
      commentText: typeof comment === 'string' ? comment : (comment?.text ?? ''),
    };
  }, [snapshot.activeSheet, selectedCell]);
  const [draftState, setDraftState] = useState(() => ({
    selectedKey: selectedCellSnapshot.selectedKey,
    cellValue: selectedCellSnapshot.cellValue,
    commentText: selectedCellSnapshot.commentText,
  }));
  const gridRef = useRef<HTMLDivElement>(null);

  const cellValue =
    draftState.selectedKey === selectedCellSnapshot.selectedKey
      ? draftState.cellValue
      : selectedCellSnapshot.cellValue;
  const commentText =
    draftState.selectedKey === selectedCellSnapshot.selectedKey
      ? draftState.commentText
      : selectedCellSnapshot.commentText;

  const setCellValue = useCallback(
    (value: React.SetStateAction<string>) => {
      setDraftState({
        selectedKey: selectedCellSnapshot.selectedKey,
        cellValue: resolveDraftValue(value, cellValue),
        commentText,
      });
    },
    [cellValue, commentText, selectedCellSnapshot.selectedKey],
  );

  const setCommentText = useCallback(
    (value: React.SetStateAction<string>) => {
      setDraftState({
        selectedKey: selectedCellSnapshot.selectedKey,
        cellValue,
        commentText: resolveDraftValue(value, commentText),
      });
    },
    [cellValue, commentText, selectedCellSnapshot.selectedKey],
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
