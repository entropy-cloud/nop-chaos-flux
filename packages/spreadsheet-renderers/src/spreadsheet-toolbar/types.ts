export type StyleToolType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'bg-yellow'
  | 'bg-green'
  | 'bg-blue'
  | 'bg-none'
  | 'font-color-red'
  | 'font-color-blue'
  | 'font-color-black';

export interface SpreadsheetToolbarProps {
  selectedCell: { row: number; col: number } | null;
  cellAddress: string;
  cellValue: string;
  frozen: boolean;
  hasSelection: boolean;
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
