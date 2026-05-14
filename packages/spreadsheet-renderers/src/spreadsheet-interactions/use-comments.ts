import { useCallback, useState } from 'react';
import { cellAddress } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge } from '../bridge.js';

export function useComments(
  bridge: SpreadsheetBridge,
  sheetId: string,
  selectedCell: { row: number; col: number } | null,
  readOnly: boolean,
  addLog: (msg: string) => void,
  commentText: string,
  setCommentText: React.Dispatch<React.SetStateAction<string>>,
) {
  const [showCommentInput, setShowCommentInput] = useState(false);

  const handleAddComment = useCallback(async () => {
    if (readOnly) return;
    if (!selectedCell || !commentText.trim()) return;
    await bridge.dispatch({
      type: 'spreadsheet:addComment',
      cell: {
        sheetId,
        address: cellAddress(selectedCell.row, selectedCell.col),
        row: selectedCell.row,
        col: selectedCell.col,
      },
      text: commentText.trim(),
    });
    setShowCommentInput(false);
    addLog('Added comment');
  }, [selectedCell, commentText, sheetId, bridge, addLog, readOnly]);

  const handleDeleteComment = useCallback(async () => {
    if (readOnly) return;
    if (!selectedCell) return;
    await bridge.dispatch({
      type: 'spreadsheet:deleteComment',
      cell: {
        sheetId,
        address: cellAddress(selectedCell.row, selectedCell.col),
        row: selectedCell.row,
        col: selectedCell.col,
      },
    });
    setCommentText('');
    addLog('Deleted comment');
  }, [selectedCell, sheetId, bridge, addLog, setCommentText, readOnly]);

  return {
    showCommentInput,
    setShowCommentInput,
    handleAddComment,
    handleDeleteComment,
  };
}
