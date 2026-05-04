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
import { ToolbarButton } from './toolbar-button.js';
import type { SpreadsheetToolbarProps } from './types.js';

function Separator() {
  return <span className="rd-toolbar-separator" />;
}

export function SpreadsheetToolbarGroups(props: SpreadsheetToolbarProps) {
  const isBold = props.currentCellStyle?.fontWeight === 'bold';
  const isItalic = props.currentCellStyle?.fontStyle === 'italic';
  const isUnderline = props.currentCellStyle?.textDecoration === 'underline';
  const textAlign = props.currentCellStyle?.textAlign ?? 'left';

  return (
    <>
      <div className="rd-toolbar-group">
        <ToolbarButton
          label="flux.spreadsheet.undoShortcut"
          icon={<Undo2 />}
          onClick={props.onUndo}
        />
        <ToolbarButton
          label="flux.spreadsheet.redoShortcut"
          icon={<Redo2 />}
          onClick={props.onRedo}
        />
      </div>
      <Separator />
      <div className="rd-toolbar-group">
        <ToolbarButton
          label="flux.spreadsheet.copyShortcut"
          icon={<Copy />}
          onClick={props.onCopy}
          disabled={!props.hasSelection}
        />
        <ToolbarButton
          label="flux.spreadsheet.cutShortcut"
          icon={<Scissors />}
          onClick={props.onCut}
          disabled={!props.hasSelection}
        />
        <ToolbarButton
          label="flux.spreadsheet.pasteShortcut"
          icon={<ClipboardPaste />}
          onClick={props.onPaste}
          disabled={!props.hasSelection}
        />
        <ToolbarButton
          label="flux.spreadsheet.clearShortcut"
          icon={<Trash2 />}
          onClick={props.onClear}
          disabled={!props.hasSelection}
        />
      </div>
      <Separator />
      <div className="rd-toolbar-group">
        <ToolbarButton
          label="flux.spreadsheet.boldShortcut"
          icon={<Bold />}
          onClick={() => props.onStyleTool('bold')}
          disabled={!props.hasSelection}
          variant={isBold ? 'outline' : 'ghost'}
          active={isBold}
        />
        <ToolbarButton
          label="flux.spreadsheet.italicShortcut"
          icon={<Italic />}
          onClick={() => props.onStyleTool('italic')}
          disabled={!props.hasSelection}
          variant={isItalic ? 'outline' : 'ghost'}
          active={isItalic}
        />
        <ToolbarButton
          label="flux.spreadsheet.underlineShortcut"
          icon={<Underline />}
          onClick={() => props.onStyleTool('underline')}
          disabled={!props.hasSelection}
          variant={isUnderline ? 'outline' : 'ghost'}
          active={isUnderline}
        />
      </div>
      <Separator />
      <div className="rd-toolbar-group">
        <ToolbarButton
          label="flux.spreadsheet.alignLeft"
          icon={<AlignLeft />}
          onClick={() => props.onStyleTool('align-left')}
          disabled={!props.hasSelection}
          variant={textAlign === 'left' ? 'outline' : 'ghost'}
          active={textAlign === 'left'}
        />
        <ToolbarButton
          label="flux.spreadsheet.alignCenter"
          icon={<AlignCenter />}
          onClick={() => props.onStyleTool('align-center')}
          disabled={!props.hasSelection}
          variant={textAlign === 'center' ? 'outline' : 'ghost'}
          active={textAlign === 'center'}
        />
        <ToolbarButton
          label="flux.spreadsheet.alignRight"
          icon={<AlignRight />}
          onClick={() => props.onStyleTool('align-right')}
          disabled={!props.hasSelection}
          variant={textAlign === 'right' ? 'outline' : 'ghost'}
          active={textAlign === 'right'}
        />
      </div>
      <Separator />
      <div className="rd-toolbar-group">
        <ToolbarButton
          label="flux.spreadsheet.bgYellow"
          onClick={() => props.onStyleTool('bg-yellow')}
          disabled={!props.hasSelection}
          className="bg-btn bg-yellow"
        />
        <ToolbarButton
          label="flux.spreadsheet.bgGreen"
          onClick={() => props.onStyleTool('bg-green')}
          disabled={!props.hasSelection}
          className="bg-btn bg-green"
        />
        <ToolbarButton
          label="flux.spreadsheet.bgBlue"
          onClick={() => props.onStyleTool('bg-blue')}
          disabled={!props.hasSelection}
          className="bg-btn bg-blue"
        />
        <ToolbarButton
          label="flux.spreadsheet.bgNone"
          onClick={() => props.onStyleTool('bg-none')}
          disabled={!props.hasSelection}
          className="bg-btn bg-none"
        />
      </div>
      <Separator />
      <div className="rd-toolbar-group">
        <ToolbarButton
          label="flux.spreadsheet.fontRed"
          icon={<Type />}
          onClick={() => props.onStyleTool('font-color-red')}
          disabled={!props.hasSelection}
          className="color-btn color-red"
        />
        <ToolbarButton
          label="flux.spreadsheet.fontBlue"
          icon={<Type />}
          onClick={() => props.onStyleTool('font-color-blue')}
          disabled={!props.hasSelection}
          className="color-btn color-blue"
        />
        <ToolbarButton
          label="flux.spreadsheet.fontBlack"
          icon={<Type />}
          onClick={() => props.onStyleTool('font-color-black')}
          disabled={!props.hasSelection}
          className="color-btn color-black"
        />
      </div>
      <Separator />
      <div className="rd-toolbar-group">
        <ToolbarButton
          label="flux.spreadsheet.mergeCells"
          icon={<TableCellsMerge />}
          onClick={props.onMerge}
          disabled={!props.hasSelection}
        />
        <ToolbarButton
          label="flux.spreadsheet.unmergeCells"
          icon={<TableCellsSplit />}
          onClick={props.onUnmerge}
          disabled={!props.hasSelection}
        />
        <ToolbarButton
          label="flux.spreadsheet.mergeCenter"
          icon={<Merge />}
          onClick={props.onMergeCenter}
          disabled={!props.hasSelection}
        />
      </div>
      <Separator />
      <div className="rd-toolbar-group">
        <ToolbarButton
          label="flux.spreadsheet.fillDown"
          icon={<ArrowDown />}
          onClick={props.onFillDown}
          disabled={!props.hasSelection}
        />
        <ToolbarButton
          label="flux.spreadsheet.fillSeriesRight"
          icon={<ArrowRight />}
          onClick={() => props.onFillSeries('right')}
          disabled={!props.hasSelection}
        />
      </div>
      <Separator />
      <div className="rd-toolbar-group">
        <ToolbarButton
          label="flux.spreadsheet.insertRow"
          icon={<Plus />}
          onClick={props.onInsertRow}
          disabled={!props.hasSelection}
        />
        <ToolbarButton
          label="flux.spreadsheet.deleteRow"
          icon={<Minus />}
          onClick={props.onDeleteRow}
          disabled={!props.hasSelection}
        />
        <ToolbarButton
          label="flux.spreadsheet.insertColumn"
          icon={<Plus />}
          onClick={props.onInsertColumn}
          disabled={!props.hasSelection}
        />
        <ToolbarButton
          label="flux.spreadsheet.deleteColumn"
          icon={<Minus />}
          onClick={props.onDeleteColumn}
          disabled={!props.hasSelection}
        />
      </div>
      <Separator />
      <div className="rd-toolbar-group">
        <ToolbarButton
          label="flux.spreadsheet.comment"
          icon={<MessageSquare />}
          onClick={props.onToggleCommentInput}
          disabled={!props.hasSelection}
        />
        <ToolbarButton
          label="flux.spreadsheet.findReplaceShortcut"
          icon={<Search />}
          onClick={props.onToggleFindReplace}
        />
      </div>
      <Separator />
      <div className="rd-toolbar-group">
        <ToolbarButton
          label="flux.spreadsheet.freezePanes"
          icon={<Snowflake />}
          onClick={props.onFreeze}
          disabled={!props.hasSelection}
        />
        <ToolbarButton
          label="flux.spreadsheet.unfreezePanes"
          icon={<Sun />}
          onClick={props.onUnfreeze}
        />
      </div>
    </>
  );
}
