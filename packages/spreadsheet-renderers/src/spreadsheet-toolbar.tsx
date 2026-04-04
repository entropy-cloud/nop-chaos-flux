import { Button, Input, Tooltip, TooltipContent, TooltipTrigger } from '@nop-chaos/ui';
import {
  Undo2,
  Redo2,
  Copy,
  Scissors,
  ClipboardPaste,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Merge,
  TableCellsMerge,
  TableCellsSplit,
  ArrowDown,
  ArrowRight,
  Plus,
  Minus,
  Search,
  MessageSquare,
  Snowflake,
  Sun,
  Type,
} from 'lucide-react';

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

export function SpreadsheetToolbar({
  selectedCell,
  cellAddress,
  cellValue,
  frozen,
  hasSelection,
  currentCellStyle,
  onUndo,
  onRedo,
  onCopy,
  onCut,
  onPaste,
  onClear,
  onStyleTool,
  onMerge,
  onUnmerge,
  onMergeCenter,
  onFillDown,
  onFillSeries,
  onInsertRow,
  onDeleteRow,
  onInsertColumn,
  onDeleteColumn,
  onFreeze,
  onUnfreeze,
  onCellValueChange,
  showFindReplace,
  onToggleFindReplace,
  findQuery,
  onFindQueryChange,
  replaceText,
  onReplaceTextChange,
  findResults,
  onFind,
  onReplace,
  onReplaceAll,
  showCommentInput,
  onToggleCommentInput,
  commentText,
  onCommentTextChange,
  onAddComment,
  onDeleteComment,
  hasComment,
}: SpreadsheetToolbarProps) {
  const isBold = currentCellStyle?.fontWeight === 'bold';
  const isItalic = currentCellStyle?.fontStyle === 'italic';
  const isUnderline = currentCellStyle?.textDecoration === 'underline';
  const textAlign = currentCellStyle?.textAlign ?? 'left';

  return (
    <>
        <div className="rd-toolbar">
          <div className="rd-toolbar-group">
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onUndo}><Undo2 /></Button></TooltipTrigger><TooltipContent>Undo <kbd>Ctrl+Z</kbd></TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onRedo}><Redo2 /></Button></TooltipTrigger><TooltipContent>Redo <kbd>Ctrl+Y</kbd></TooltipContent></Tooltip>
          </div>
          <span className="rd-toolbar-separator" />
          <div className="rd-toolbar-group">
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onCopy} disabled={!hasSelection}><Copy /></Button></TooltipTrigger><TooltipContent>Copy <kbd>Ctrl+C</kbd></TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onCut} disabled={!hasSelection}><Scissors /></Button></TooltipTrigger><TooltipContent>Cut <kbd>Ctrl+X</kbd></TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onPaste} disabled={!hasSelection}><ClipboardPaste /></Button></TooltipTrigger><TooltipContent>Paste <kbd>Ctrl+V</kbd></TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onClear} disabled={!hasSelection}><Trash2 /></Button></TooltipTrigger><TooltipContent>Clear <kbd>Delete</kbd></TooltipContent></Tooltip>
          </div>
          <span className="rd-toolbar-separator" />
          <div className="rd-toolbar-group">
            <Tooltip><TooltipTrigger ><Button variant={isBold ? 'outline' : 'ghost'} size="icon-sm" onClick={() => onStyleTool('bold')} disabled={!hasSelection} data-toolbar-active={isBold || undefined}><Bold /></Button></TooltipTrigger><TooltipContent>Bold <kbd>Ctrl+B</kbd></TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant={isItalic ? 'outline' : 'ghost'} size="icon-sm" onClick={() => onStyleTool('italic')} disabled={!hasSelection} data-toolbar-active={isItalic || undefined}><Italic /></Button></TooltipTrigger><TooltipContent>Italic <kbd>Ctrl+I</kbd></TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant={isUnderline ? 'outline' : 'ghost'} size="icon-sm" onClick={() => onStyleTool('underline')} disabled={!hasSelection} data-toolbar-active={isUnderline || undefined}><Underline /></Button></TooltipTrigger><TooltipContent>Underline <kbd>Ctrl+U</kbd></TooltipContent></Tooltip>
          </div>
          <span className="rd-toolbar-separator" />
          <div className="rd-toolbar-group">
            <Tooltip><TooltipTrigger ><Button variant={textAlign === 'left' ? 'outline' : 'ghost'} size="icon-sm" onClick={() => onStyleTool('align-left')} disabled={!hasSelection} data-toolbar-active={textAlign === 'left' || undefined}><AlignLeft /></Button></TooltipTrigger><TooltipContent>Align Left</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant={textAlign === 'center' ? 'outline' : 'ghost'} size="icon-sm" onClick={() => onStyleTool('align-center')} disabled={!hasSelection} data-toolbar-active={textAlign === 'center' || undefined}><AlignCenter /></Button></TooltipTrigger><TooltipContent>Align Center</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant={textAlign === 'right' ? 'outline' : 'ghost'} size="icon-sm" onClick={() => onStyleTool('align-right')} disabled={!hasSelection} data-toolbar-active={textAlign === 'right' || undefined}><AlignRight /></Button></TooltipTrigger><TooltipContent>Align Right</TooltipContent></Tooltip>
          </div>
          <span className="rd-toolbar-separator" />
          <div className="rd-toolbar-group">
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" className="bg-btn bg-yellow" onClick={() => onStyleTool('bg-yellow')} disabled={!hasSelection}></Button></TooltipTrigger><TooltipContent>Yellow Background</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" className="bg-btn bg-green" onClick={() => onStyleTool('bg-green')} disabled={!hasSelection}></Button></TooltipTrigger><TooltipContent>Green Background</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" className="bg-btn bg-blue" onClick={() => onStyleTool('bg-blue')} disabled={!hasSelection}></Button></TooltipTrigger><TooltipContent>Blue Background</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" className="bg-btn bg-none" onClick={() => onStyleTool('bg-none')} disabled={!hasSelection}></Button></TooltipTrigger><TooltipContent>No Background</TooltipContent></Tooltip>
          </div>
          <span className="rd-toolbar-separator" />
          <div className="rd-toolbar-group">
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" className="color-btn color-red" onClick={() => onStyleTool('font-color-red')} disabled={!hasSelection}><Type /></Button></TooltipTrigger><TooltipContent>Red Font</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" className="color-btn color-blue" onClick={() => onStyleTool('font-color-blue')} disabled={!hasSelection}><Type /></Button></TooltipTrigger><TooltipContent>Blue Font</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" className="color-btn color-black" onClick={() => onStyleTool('font-color-black')} disabled={!hasSelection}><Type /></Button></TooltipTrigger><TooltipContent>Black Font</TooltipContent></Tooltip>
          </div>
          <span className="rd-toolbar-separator" />
          <div className="rd-toolbar-group">
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onMerge} disabled={!hasSelection}><TableCellsMerge /></Button></TooltipTrigger><TooltipContent>Merge Cells</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onUnmerge} disabled={!hasSelection}><TableCellsSplit /></Button></TooltipTrigger><TooltipContent>Unmerge Cells</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onMergeCenter} disabled={!hasSelection}><Merge /></Button></TooltipTrigger><TooltipContent>Merge &amp; Center</TooltipContent></Tooltip>
          </div>
          <span className="rd-toolbar-separator" />
          <div className="rd-toolbar-group">
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onFillDown} disabled={!hasSelection}><ArrowDown /></Button></TooltipTrigger><TooltipContent>Fill Down</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={() => onFillSeries('right')} disabled={!hasSelection}><ArrowRight /></Button></TooltipTrigger><TooltipContent>Fill Series Right</TooltipContent></Tooltip>
          </div>
          <span className="rd-toolbar-separator" />
          <div className="rd-toolbar-group">
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onInsertRow} disabled={!hasSelection}><Plus /></Button></TooltipTrigger><TooltipContent>Insert Row</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onDeleteRow} disabled={!hasSelection}><Minus /></Button></TooltipTrigger><TooltipContent>Delete Row</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onInsertColumn} disabled={!hasSelection}><Plus /></Button></TooltipTrigger><TooltipContent>Insert Column</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onDeleteColumn} disabled={!hasSelection}><Minus /></Button></TooltipTrigger><TooltipContent>Delete Column</TooltipContent></Tooltip>
          </div>
          <span className="rd-toolbar-separator" />
          <div className="rd-toolbar-group">
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onToggleCommentInput} disabled={!hasSelection}><MessageSquare /></Button></TooltipTrigger><TooltipContent>Comment</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onToggleFindReplace}><Search /></Button></TooltipTrigger><TooltipContent>Find &amp; Replace <kbd>Ctrl+F</kbd></TooltipContent></Tooltip>
          </div>
          <span className="rd-toolbar-separator" />
          <div className="rd-toolbar-group">
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onFreeze} disabled={!hasSelection}><Snowflake /></Button></TooltipTrigger><TooltipContent>Freeze Panes</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger ><Button variant="ghost" size="icon-sm" onClick={onUnfreeze}><Sun /></Button></TooltipTrigger><TooltipContent>Unfreeze Panes</TooltipContent></Tooltip>
          </div>
          <div className="rd-toolbar-status">
            <span className="rd-toolbar-cell-addr">{selectedCell ? cellAddress : ''}</span>
            {frozen && <span className="rd-toolbar-frozen-badge">Frozen</span>}
          </div>
        </div>

      {showFindReplace && (
        <div className="find-replace-panel">
          <div className="find-row">
            <label>Find:</label>
            <Input
              size="sm"
              value={findQuery}
              onChange={(e) => onFindQueryChange(e.target.value)}
              placeholder="Search text..."
              autoFocus
            />
            <Button variant="ghost" size="xs" onClick={onFind}>Find Next</Button>
          </div>
          <div className="find-row">
            <label>Replace:</label>
            <Input
              size="sm"
              value={replaceText}
              onChange={(e) => onReplaceTextChange(e.target.value)}
              placeholder="Replace with..."
            />
            <Button variant="ghost" size="xs" onClick={onReplace} disabled={!hasSelection}>Replace</Button>
            <Button variant="ghost" size="xs" onClick={onReplaceAll}>Replace All</Button>
          </div>
          {findResults && <div className="find-results">{findResults}</div>}
        </div>
      )}

      {selectedCell && (
        <div className="cell-editor">
          <label>
            {cellAddress}:
            <Input
              size="sm"
              value={cellValue}
              onChange={(e) => onCellValueChange(e.target.value)}
              placeholder="Enter cell value"
            />
          </label>
          {showCommentInput && (
            <div className="comment-editor">
              <Input
                size="sm"
                value={commentText}
                onChange={(e) => onCommentTextChange(e.target.value)}
                placeholder="Add comment..."
              />
              <Button variant="ghost" size="xs" onClick={onAddComment}>Add</Button>
              {hasComment && (
                <Button variant="ghost" size="xs" onClick={onDeleteComment}>Delete</Button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
