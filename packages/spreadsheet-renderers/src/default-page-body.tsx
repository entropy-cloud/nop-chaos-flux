import React from 'react';
import { cellAddress, type SpreadsheetConfig } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from './bridge.js';
import { SpreadsheetGrid } from './spreadsheet-grid.js';
import { SheetTabBar } from './sheet-tab-bar.js';
import { SpreadsheetToolbar } from './spreadsheet-toolbar.js';
import { useSpreadsheetInteractions } from './use-spreadsheet-interactions.js';

const DEFAULT_ROWS = 100;
const DEFAULT_COLS = 26;

function resolveGridDimensions(config: SpreadsheetConfig | undefined) {
  return {
    rows: Math.max(DEFAULT_ROWS, 1),
    cols: Math.max(DEFAULT_COLS, 1),
    defaultRowHeight: config?.defaultRowHeight,
    defaultColumnWidth: config?.defaultColumnWidth,
  };
}

export function DefaultSpreadsheetPageBody(props: {
  bridge: SpreadsheetBridge;
  snapshot: SpreadsheetHostSnapshot;
  config?: SpreadsheetConfig;
  showToolbar: boolean;
}) {
  const sheetId = props.snapshot.activeSheet?.id ?? props.snapshot.workbook.sheets[0]?.id ?? '';
  const dimensions = resolveGridDimensions(props.config);
  const interactions = useSpreadsheetInteractions({
    bridge: props.bridge,
    sheetId,
    rows: dimensions.rows,
    cols: dimensions.cols,
  });
  const {
    snapshot,
    selectedCell,
    cellValue,
    currentCell,
    columnWidths,
    rowHeights,
    editingCell,
    editValue,
    fillHandleState,
    dropTargetCell,
    showFindReplace,
    setShowFindReplace,
    findQuery,
    setFindQuery,
    replaceText,
    setReplaceText,
    findResults,
    showCommentInput,
    setShowCommentInput,
    commentText,
    setCommentText,
    hasComment,
    gridRef,
    editingCellRef,
    isInRange,
    isFillPreview,
    getSelectedRange,
    getMergeInfo,
    handleUndo,
    handleRedo,
    handleCopy,
    handleCut,
    handlePaste,
    handleClear,
    handleStyleTool,
    handleMerge,
    handleUnmerge,
    handleMergeCenter,
    handleFillDown,
    handleFillSeries,
    handleAddSheet,
    handleRemoveSheet,
    handleRenameSheet,
    handleInsertRow,
    handleDeleteRow,
    handleInsertColumn,
    handleDeleteColumn,
    handleFreeze,
    handleUnfreeze,
    handleCellValueChange,
    handleFind,
    handleReplace,
    handleReplaceAll,
    handleAddComment,
    handleDeleteComment,
    handleCellClick,
    handleCellDoubleClick,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleSelectRow,
    handleSelectColumn,
    handleSelectAll,
    handleColumnResizeStart,
    handleRowResizeStart,
    handleFillHandleMouseDown,
    handleFillHandleDoubleClick,
    handleEditValueChange,
    handleEditSave,
    handleEditCancel,
    handleFieldDragOver,
    handleFieldDragLeave,
  } = interactions;
  const currentSheet = snapshot.activeSheet;
  const cellRef = selectedCell ? cellAddress(selectedCell.row, selectedCell.col) : '';
  const frozen = Boolean(
    currentSheet?.frozen &&
      ((currentSheet.frozen.row ?? 0) > 0 || (currentSheet.frozen.col ?? 0) > 0),
  );

  return (
    <div
      ref={gridRef}
      data-slot="spreadsheet-default-host"
      onMouseDown={(event) => {
        if (editingCellRef.current && (event.target as HTMLElement).tagName !== 'INPUT') {
          void handleEditSave();
        }
      }}
    >
      {props.showToolbar ? (
        <div data-slot="spreadsheet-default-toolbar">
          <SpreadsheetToolbar
            selectedCell={selectedCell}
            cellAddress={cellRef}
            cellValue={cellValue}
            frozen={frozen}
            hasSelection={Boolean(selectedCell)}
            currentCellStyle={currentCell?.style}
            onUndo={() => void handleUndo()}
            onRedo={() => void handleRedo()}
            onCopy={() => void handleCopy()}
            onCut={() => void handleCut()}
            onPaste={() => void handlePaste()}
            onClear={() => void handleClear()}
            onStyleTool={(tool) => void handleStyleTool(tool)}
            onMerge={() => void handleMerge()}
            onUnmerge={() => void handleUnmerge()}
            onMergeCenter={() => void handleMergeCenter()}
            onFillDown={() => void handleFillDown()}
            onFillSeries={(direction) => void handleFillSeries(direction)}
            onInsertRow={() => void handleInsertRow()}
            onDeleteRow={() => void handleDeleteRow()}
            onInsertColumn={() => void handleInsertColumn()}
            onDeleteColumn={() => void handleDeleteColumn()}
            onFreeze={() => void handleFreeze()}
            onUnfreeze={() => void handleUnfreeze()}
            onCellValueChange={handleCellValueChange}
            showFindReplace={showFindReplace}
            onToggleFindReplace={() => setShowFindReplace((value) => !value)}
            findQuery={findQuery}
            onFindQueryChange={setFindQuery}
            replaceText={replaceText}
            onReplaceTextChange={setReplaceText}
            findResults={findResults}
            onFind={() => void handleFind()}
            onReplace={() => void handleReplace()}
            onReplaceAll={() => void handleReplaceAll()}
            showCommentInput={showCommentInput}
            onToggleCommentInput={() => setShowCommentInput((value) => !value)}
            commentText={commentText}
            onCommentTextChange={setCommentText}
            onAddComment={() => void handleAddComment()}
            onDeleteComment={() => void handleDeleteComment()}
            hasComment={hasComment}
            readOnly={snapshot.runtime.readonly}
          />
        </div>
      ) : null}

      <SpreadsheetGrid
        snapshot={snapshot}
        bridge={props.bridge}
        rows={dimensions.rows}
        cols={dimensions.cols}
        columnWidths={columnWidths}
        rowHeights={rowHeights}
        selectedCell={selectedCell}
        selection={snapshot.selection}
        editingCell={editingCell}
        editValue={editValue}
        fillHandleState={fillHandleState}
        isInRange={isInRange}
        isFillPreview={isFillPreview}
        getSelectedRange={getSelectedRange}
        getMergeInfo={getMergeInfo}
        onCellClick={handleCellClick}
        onCellDoubleClick={handleCellDoubleClick}
        onCellMouseDown={handleCellMouseDown}
        onCellMouseEnter={handleCellMouseEnter}
        onSelectRow={handleSelectRow}
        onSelectColumn={handleSelectColumn}
        onSelectAll={handleSelectAll}
        onColumnResizeStart={handleColumnResizeStart}
        onRowResizeStart={handleRowResizeStart}
        onFillHandleMouseDown={handleFillHandleMouseDown}
        onFillHandleDoubleClick={handleFillHandleDoubleClick}
        onEditValueChange={handleEditValueChange}
        onEditSave={() => void handleEditSave()}
        onEditCancel={handleEditCancel}
        dropTargetCell={dropTargetCell}
        draggingField={null}
        onFieldDragOver={handleFieldDragOver}
        onFieldDragLeave={handleFieldDragLeave}
        readonly={snapshot.runtime.readonly}
      />

      <SheetTabBar
        sheets={snapshot.workbook.sheets}
        activeSheetId={snapshot.activeSheet?.id ?? ''}
        onSwitchSheet={(nextSheetId) =>
          void props.bridge.dispatch({ type: 'spreadsheet:setActiveSheet', sheetId: nextSheetId })
        }
        onAddSheet={() => void handleAddSheet()}
        onRemoveSheet={(nextSheetId) => void handleRemoveSheet(nextSheetId)}
        onRenameSheet={(nextSheetId, name) => void handleRenameSheet(nextSheetId, name)}
        canRemoveSheet={snapshot.workbook.sheets.length > 1}
        readOnly={snapshot.runtime.readonly}
      />
    </div>
  );
}
