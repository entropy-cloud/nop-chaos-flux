import { useEffect, useMemo, useRef, useState } from 'react';
import type { SpreadsheetFrozenPane } from '@nop-chaos/spreadsheet-core';
import { t } from '@nop-chaos/flux-i18n';
import { ContextMenu, ContextMenuTrigger } from '@nop-chaos/ui';
import {
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  getAnchorCellFromSelection,
  getSelectedAxisInfo,
  rangesEqual,
  expandSortRangeToUsedColumns,
} from './spreadsheet-grid/constants.js';
import type { SpreadsheetGridProps } from './spreadsheet-grid/types.js';
import { buildSpreadsheetGridOffsets, buildSpreadsheetGridViewport } from './spreadsheet-grid/viewport.js';
import { useContextMenuActions } from './spreadsheet-grid/use-context-menu-actions.js';
import { SpreadsheetEditStatus } from './spreadsheet-grid/inline-controls.js';
import { SpreadsheetGridOverlayControls } from './spreadsheet-grid/overlay-controls.js';
import {
  SpreadsheetGridTableShell,
  type PendingKeyboardContextMenuRequest,
} from './spreadsheet-grid/table-shell.js';

export function SpreadsheetGrid({
  snapshot,
  bridge,
  rows,
  cols,
  columnWidths,
  rowHeights,
  selectedCell,
  selection,
  editingCell,
  editValue,
  editSaveState,
  fillHandleState,
  isInRange,
  isFillPreview,
  getSelectedRange,
  getMergeInfo,
  onCellClick,
  onCellDoubleClick,
  onCellMouseDown,
  onCellMouseEnter,
  onSelectRow,
  onSelectColumn,
  onSelectAll,
  onColumnResizeStart,
  onRowResizeStart,
  onFillHandleMouseDown,
  onFillHandleDoubleClick,
  onEditValueChange,
  onEditSave,
  onEditCancel,
  dropTargetCell,
  draggingField,
  getCellMetadata,
  onFieldDragOver,
  onFieldDragLeave,
  readonly,
}: SpreadsheetGridProps) {
  const clampCell = (row: number, col: number) => ({
      row: Math.max(0, Math.min(rows - 1, row)),
      col: Math.max(0, Math.min(cols - 1, col)),
    });
  const frozen: SpreadsheetFrozenPane | undefined = snapshot.activeSheet?.frozen;
  const activeSheetId = snapshot.activeSheet?.id ?? '';
  const selectedRange = getSelectedRange();
  const selectionAnchorCell = getAnchorCellFromSelection(selection);
  const selectedRowInfo = getSelectedAxisInfo(selection, 'row');
  const selectedColumnInfo = getSelectedAxisInfo(selection, 'column');
  const canUseRowStructureActions =
    selection.kind === 'cell' || selection.kind === 'range' || selection.kind === 'row';
  const canUseColumnStructureActions =
    selection.kind === 'cell' || selection.kind === 'range' || selection.kind === 'column';
  const canResizeRow = selection.kind === 'row' && selectedRowInfo?.count === 1;
  const canResizeColumn = selection.kind === 'column' && selectedColumnInfo?.count === 1;
  const canSort = !!selectedRange && canUseColumnStructureActions;
  const canFilter = !!selectionAnchorCell && !!activeSheetId && selection.kind === 'cell';
  const sortRange = selectedRange
        ? expandSortRangeToUsedColumns(selectedRange, snapshot.activeSheet?.cells)
        : null;
  const canMerge =
    !!selectedRange &&
    (selectedRange.startRow !== selectedRange.endRow ||
      selectedRange.startCol !== selectedRange.endCol);
  const canUnmerge =
    !!selectedRange &&
    (snapshot.activeSheet?.merges ?? []).some((merge) => rangesEqual(selectedRange, merge));
  const canFreeze = !!selectionAnchorCell && !!activeSheetId && selection.kind !== 'sheet';
  const hasActiveRowFilters = (snapshot.activeSheet?.filters?.columns?.length ?? 0) > 0;
  const filteredColumnSet = new Set((snapshot.activeSheet?.filters?.columns ?? []).map((entry) => entry.col));

  const contextActions = useContextMenuActions({
    bridge,
    selectedRange,
    selectionAnchorCell,
    selectedRowInfo,
    selectedColumnInfo,
    sortRange,
    activeSheetId,
    cells: snapshot.activeSheet?.cells,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingKeyboardContextMenuRef = useRef<PendingKeyboardContextMenuRequest | null>(null);
  const [resizeDialog, setResizeDialog] = useState<
    | { axis: 'row'; index: number; size: string }
    | { axis: 'column'; index: number; size: string }
    | null
  >(null);
  const [scrollTop, setScrollTop] = useState(snapshot.runtime.viewport?.scrollY ?? 0);
  const [scrollLeft, setScrollLeft] = useState(snapshot.runtime.viewport?.scrollX ?? 0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [viewportWidth, setViewportWidth] = useState(800);
  const keyboardCellRef = useRef<{ row: number; col: number }>(selectedCell ?? { row: 0, col: 0 });

  useEffect(() => {
    keyboardCellRef.current = selectedCell ?? { row: 0, col: 0 };
  }, [selectedCell]);

  useEffect(() => {
    const pending = pendingKeyboardContextMenuRef.current;
    if (!pending) {
      return;
    }

    const ready =
      pending.axis === 'row'
        ? selection.kind === 'row' && selectedRowInfo?.count === 1 && selectedRowInfo.start === pending.index
        : selection.kind === 'column' && selectedColumnInfo?.count === 1 && selectedColumnInfo.start === pending.index;

    if (!ready) {
      return;
    }

    pendingKeyboardContextMenuRef.current = null;
    pending.element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  }, [selectedColumnInfo, selectedRowInfo, selection.kind]);

  const openResizeDialog = (axis: 'row' | 'column', index: number) => {
      const currentSize =
        axis === 'row' ? String(rowHeights[index] ?? DEFAULT_ROW_HEIGHT) : String(columnWidths[index] ?? DEFAULT_COL_WIDTH);
      setResizeDialog({ axis, index, size: currentSize });
    };

  const submitResizeDialog = async () => {
    if (!resizeDialog) {
      return;
    }

    const nextSize = Number(resizeDialog.size);
    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      return;
    }

    if (resizeDialog.axis === 'row') {
      await contextActions.handleContextResizeRow(nextSize);
    } else {
      await contextActions.handleContextResizeColumn(nextSize);
    }

    setResizeDialog(null);
  };

  const moveSelection = (nextRow: number, nextCol: number) => {
      const next = clampCell(nextRow, nextCol);
      keyboardCellRef.current = next;
      onCellClick(next.row, next.col);
      requestAnimationFrame(() => {
        const cell = scrollRef.current?.querySelector(
          `td[data-row="${next.row}"][data-col="${next.col}"]`,
        ) as HTMLElement | null;
        cell?.focus();
      });
    };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    setScrollLeft(el.scrollLeft);
    if (el.clientHeight !== viewportHeight) setViewportHeight(el.clientHeight);
    if (el.clientWidth !== viewportWidth) setViewportWidth(el.clientWidth);
    void bridge.dispatch({
      type: 'spreadsheet:setViewport',
      viewport: {
        scrollX: el.scrollLeft,
        scrollY: el.scrollTop,
        zoom: snapshot.runtime.zoom,
      },
    });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    if (el.scrollTop !== scrollTop) {
      el.scrollTop = scrollTop;
    }
    if (el.scrollLeft !== scrollLeft) {
      el.scrollLeft = scrollLeft;
    }
  }, [scrollLeft, scrollTop]);

  const offsets = useMemo(
    () =>
      buildSpreadsheetGridOffsets({
        rows,
        cols,
        columnWidths,
        rowHeights,
      }),
    [rows, cols, columnWidths, rowHeights],
  );

  const viewport = buildSpreadsheetGridViewport({
        rows,
        cols,
        columnWidths,
        rowHeights,
        selection,
        snapshot,
        selectedCell,
        frozen,
        scrollTop,
        scrollLeft,
        viewportHeight,
        viewportWidth,
      }, offsets);

  const isDraggingRef = useRef(false);
  const lastDragCellRef = useRef<{ row: number; col: number } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || e.buttons !== 1) {
        isDraggingRef.current = false;
        return;
      }
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!target) return;
      const td = target.closest('td[data-row][data-col]') as HTMLElement | null;
      if (!td) return;
      const r = Number(td.dataset.row);
      const c = Number(td.dataset.col);
      if (isNaN(r) || isNaN(c)) return;
      const last = lastDragCellRef.current;
      if (last && last.row === r && last.col === c) return;
      lastDragCellRef.current = { row: r, col: c };
      onCellMouseEnter(r, c);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      lastDragCellRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', handleMouseUp, true);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
    };
  }, [onCellMouseEnter]);

  return (
    <ContextMenu>
      <ContextMenuTrigger
        ref={scrollRef}
        className="ss-grid-shell"
        data-slot="spreadsheet-grid"
        data-fill-dragging={fillHandleState.isFilling || undefined}
        style={{ overflow: 'auto', position: 'relative' }}
        tabIndex={0}
        role="grid"
        aria-label={t('flux.spreadsheet.gridAriaLabel')}
        aria-activedescendant={viewport.mountedSelectedCellId}
        onScroll={handleScroll}
        onKeyDown={(event) => {
          if (editingCell) {
            return;
          }

          const active = keyboardCellRef.current;

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveSelection(active.row - 1, active.col);
            return;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveSelection(active.row + 1, active.col);
            return;
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            moveSelection(active.row, active.col - 1);
            return;
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            moveSelection(active.row, active.col + 1);
            return;
          }
          if (event.key === 'Enter') {
            if (readonly) {
              return;
            }
            event.preventDefault();
            onCellDoubleClick(active.row, active.col);
            return;
          }
          if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            if (readonly) {
              return;
            }
            event.preventDefault();
            onCellClick(active.row, active.col);
            onCellDoubleClick(active.row, active.col);
            onEditValueChange(event.key);
          }
        }}
        onMouseDown={(e) => {
          if (e.button === 0 && (e.target as HTMLElement).closest('td[data-row][data-col]')) {
            isDraggingRef.current = true;
            lastDragCellRef.current = null;
          }
        }}
      >
        <SpreadsheetGridTableShell
          snapshot={snapshot}
          viewport={viewport}
          activeSheetId={activeSheetId}
          selectedCell={selectedCell}
          selection={selection}
          selectedRange={selectedRange}
          editingCell={editingCell}
          editValue={editValue}
          columnWidths={columnWidths}
          rowHeights={rowHeights}
          filteredColumnSet={filteredColumnSet}
          dropTargetCell={dropTargetCell}
          draggingField={draggingField}
          readonly={readonly}
          getMergeInfo={getMergeInfo}
          getCellMetadata={getCellMetadata}
          isInRange={isInRange}
          isFillPreview={isFillPreview}
          onCellClick={onCellClick}
          onCellDoubleClick={onCellDoubleClick}
          onCellMouseDown={onCellMouseDown}
          onCellMouseEnter={onCellMouseEnter}
          onSelectRow={onSelectRow}
          onSelectColumn={onSelectColumn}
          onSelectAll={onSelectAll}
          onColumnResizeStart={onColumnResizeStart}
          onRowResizeStart={onRowResizeStart}
          onFillHandleMouseDown={onFillHandleMouseDown}
          onFillHandleDoubleClick={onFillHandleDoubleClick}
          onEditValueChange={onEditValueChange}
          onEditSave={onEditSave}
          onEditCancel={onEditCancel}
          onFieldDragOver={onFieldDragOver}
          onFieldDragLeave={onFieldDragLeave}
          onKeyboardContextMenuRequest={(request) => {
            pendingKeyboardContextMenuRef.current = request;
          }}
        />
      </ContextMenuTrigger>
      {editingCell ? <SpreadsheetEditStatus state={editSaveState} /> : null}
      <SpreadsheetGridOverlayControls
        contextActions={contextActions}
        selectedRange={selectedRange}
        selectionAnchorCell={selectionAnchorCell}
        activeSheetId={activeSheetId}
        canSort={canSort}
        canFilter={canFilter}
        canMerge={canMerge}
        canUnmerge={canUnmerge}
        canFreeze={canFreeze}
        canUseRowStructureActions={canUseRowStructureActions}
        canUseColumnStructureActions={canUseColumnStructureActions}
        canResizeRow={canResizeRow}
        canResizeColumn={canResizeColumn}
        hasActiveRowFilters={hasActiveRowFilters}
        readOnly={readonly}
        selectedRowInfo={selectedRowInfo}
        selectedColumnInfo={selectedColumnInfo}
        resizeDialog={resizeDialog}
        setResizeDialog={setResizeDialog}
        openResizeDialog={openResizeDialog}
        submitResizeDialog={submitResizeDialog}
      />
      </ContextMenu>
    );
}
