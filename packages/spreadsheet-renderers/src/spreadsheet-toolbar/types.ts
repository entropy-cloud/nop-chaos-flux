// Single-source the style-tool vocabulary: the union is declared next to its
// dispatcher (use-style-commands); this module only re-exports it so the
// toolbar props contract stays import-stable.
import type { StyleToolType } from '../spreadsheet-interactions/use-style-commands.js';

export type { StyleToolType };

export interface SpreadsheetToolbarProps {
  selectedCell: { row: number; col: number } | null;
  cellAddress: string;
  cellValue: string;
  frozen: boolean;
  hasSelection: boolean;
  readOnly?: boolean;
  currentCellStyle?: {
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: string;
    backgroundColor?: string;
    fontColor?: string;
  };
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onClear: () => void;
  onStyleTool: (tool: StyleToolType) => void;
  onMerge: () => void;
  onUnmerge: () => void;
  onMergeCenter: () => void;
  onFillDown: () => void;
  onFillSeries: (direction: 'down' | 'right') => void;
  onInsertRow: () => void;
  onDeleteRow: () => void;
  onInsertColumn: () => void;
  onDeleteColumn: () => void;
  onFreeze: () => void;
  onUnfreeze: () => void;
  onCellValueChange: (value: string) => void;
  showFindReplace: boolean;
  onToggleFindReplace: () => void;
  findQuery: string;
  onFindQueryChange: (value: string) => void;
  replaceText: string;
  onReplaceTextChange: (value: string) => void;
  findResults: string;
  onFind: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  showCommentInput: boolean;
  onToggleCommentInput: () => void;
  commentText: string;
  onCommentTextChange: (value: string) => void;
  onAddComment: () => void;
  onDeleteComment: () => void;
  hasComment: boolean;
}
