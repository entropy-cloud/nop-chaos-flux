import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cellAddress,
  type SpreadsheetRange,
  type SpreadsheetFrozenPane,
} from '@nop-chaos/spreadsheet-core';
import { ContextMenu, ContextMenuTrigger } from '@nop-chaos/ui';
import type { SpreadsheetHostSnapshot, SpreadsheetBridge } from './bridge.js';
import { mapCellStyle } from './cell-style-map.js';
import {
  DEFAULT_ROW_HEIGHT,
  DEFAULT_COL_WIDTH,
  ROW_HEADER_WIDTH,
  OVERSCAN,
  computeRowOffsets,
  computeColOffsets,
  findFirstVisible,
  isCellWithinSelection,
  getAnchorCellFromSelection,
  getSelectedAxisInfo,
  rangesEqual,
  expandSortRangeToUsedColumns,
} from './spreadsheet-grid/constants.js';
import { useContextMenuActions } from './spreadsheet-grid/use-context-menu-actions.js';
import { SpreadsheetGridContextMenu } from './spreadsheet-grid/spreadsheet-grid-context-menu.js';

export interface SpreadsheetGridProps {
  snapshot: SpreadsheetHostSnapshot;
  bridge: SpreadsheetBridge;
  rows: number;
  cols: number;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  selectedCell: { row: number; col: number } | null;
  selection: SpreadsheetHostSnapshot['selection'];
  editingCell: { row: number; col: number } | null;
  editValue: string;
  fillHandleState: {
    isFilling: boolean;
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
    currentRow: number;
    currentCol: number;
  };
  isInRange: (row: number, col: number) => boolean;
  isFillPreview: (row: number, col: number) => boolean;
  getSelectedRange: () => SpreadsheetRange | null;
  getMergeInfo: (
    row: number,
    col: number,
  ) => { isMerged: boolean; isTopLeft: boolean; rowSpan: number; colSpan: number };
  onCellClick: (row: number, col: number) => void;
  onCellDoubleClick: (row: number, col: number) => void;
  onCellMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
  onCellMouseEnter: (row: number, col: number) => void;
  onSelectRow: (row: number, extend?: boolean) => void;
  onSelectColumn: (col: number, extend?: boolean) => void;
  onSelectAll: () => void;
  onColumnResizeStart: (col: number, e: React.MouseEvent) => void;
  onRowResizeStart: (row: number, e: React.MouseEvent) => void;
  onFillHandleMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
  onFillHandleDoubleClick: () => void;
  onEditValueChange: (value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  dropTargetCell: { row: number; col: number } | null;
  draggingField: unknown;
  getCellMetadata?: (row: number, col: number) => unknown;
  onFieldDragOver?: (row: number, col: number) => void;
  onFieldDragLeave?: () => void;
}

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
}: SpreadsheetGridProps) {
  const clampCell = useCallback(
    (row: number, col: number) => ({
      row: Math.max(0, Math.min(rows - 1, row)),
      col: Math.max(0, Math.min(cols - 1, col)),
    }),
    [cols, rows],
  );
  const frozen: SpreadsheetFrozenPane | undefined = snapshot.activeSheet?.frozen;
  const activeSheetId = snapshot.activeSheet?.id ?? '';
  const selectedRange = getSelectedRange();
  const selectionAnchorCell = useMemo(() => getAnchorCellFromSelection(selection), [selection]);
  const selectedRowInfo = useMemo(() => getSelectedAxisInfo(selection, 'row'), [selection]);
  const selectedColumnInfo = useMemo(() => getSelectedAxisInfo(selection, 'column'), [selection]);
  const canUseRowStructureActions =
    selection.kind === 'cell' || selection.kind === 'range' || selection.kind === 'row';
  const canUseColumnStructureActions =
    selection.kind === 'cell' || selection.kind === 'range' || selection.kind === 'column';
  const canSort = !!selectedRange && canUseColumnStructureActions;
  const canFilter = !!selectionAnchorCell && !!activeSheetId && selection.kind === 'cell';
  const sortRange = useMemo(
    () =>
      selectedRange
        ? expandSortRangeToUsedColumns(selectedRange, snapshot.activeSheet?.cells)
        : null,
    [selectedRange, snapshot.activeSheet?.cells],
  );
  const canMerge =
    !!selectedRange &&
    (selectedRange.startRow !== selectedRange.endRow ||
      selectedRange.startCol !== selectedRange.endCol);
  const canUnmerge =
    !!selectedRange &&
    (snapshot.activeSheet?.merges ?? []).some((merge) => rangesEqual(selectedRange, merge));
  const canFreeze = !!selectionAnchorCell && !!activeSheetId && selection.kind !== 'sheet';
  const hasActiveRowFilters = (snapshot.activeSheet?.filters?.columns?.length ?? 0) > 0;
  const filteredColumnSet = useMemo(
    () => new Set((snapshot.activeSheet?.filters?.columns ?? []).map((entry) => entry.col)),
    [snapshot.activeSheet?.filters?.columns],
  );

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
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [viewportWidth, setViewportWidth] = useState(800);

  const moveSelection = useCallback(
    (nextRow: number, nextCol: number) => {
      const next = clampCell(nextRow, nextCol);
      onCellClick(next.row, next.col);
      requestAnimationFrame(() => {
        const cell = scrollRef.current?.querySelector(
          `td[data-row="${next.row}"][data-col="${next.col}"]`,
        ) as HTMLElement | null;
        cell?.focus();
      });
    },
    [clampCell, onCellClick],
  );

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    setScrollLeft(el.scrollLeft);
    if (el.clientHeight !== viewportHeight) setViewportHeight(el.clientHeight);
    if (el.clientWidth !== viewportWidth) setViewportWidth(el.clientWidth);
  }, [viewportHeight, viewportWidth]);

  const rowOffsets = useMemo(() => computeRowOffsets(rows, rowHeights), [rows, rowHeights]);
  const colOffsets = useMemo(() => computeColOffsets(cols, columnWidths), [cols, columnWidths]);

  const totalHeight = rowOffsets[rows] ?? 0;
  const totalWidth = colOffsets[cols] ?? 0;

  const frozenRows = frozen?.row ?? 0;
  const frozenCols = frozen?.col ?? 0;
  const frozenRowHeight = frozenRows > 0 ? rowOffsets[frozenRows] : 0;
  const frozenColWidth = frozenCols > 0 ? colOffsets[frozenCols] : 0;

  const effectiveScrollTop = scrollTop;
  const effectiveScrollLeft = scrollLeft;

  const visStartRow = Math.max(
    frozenRows,
    findFirstVisible(rowOffsets, effectiveScrollTop + frozenRowHeight) - OVERSCAN,
  );
  const visEndRow = Math.min(
    rows - 1,
    findFirstVisible(rowOffsets, effectiveScrollTop + frozenRowHeight + viewportHeight) + OVERSCAN,
  );
  const visStartCol = Math.max(
    frozenCols,
    findFirstVisible(colOffsets, effectiveScrollLeft + frozenColWidth) - OVERSCAN,
  );
  const visEndCol = Math.min(
    cols - 1,
    findFirstVisible(colOffsets, effectiveScrollLeft + frozenColWidth + viewportWidth) + OVERSCAN,
  );

  const topSpacerHeight =
    frozenRows < visStartRow ? rowOffsets[visStartRow] - rowOffsets[frozenRows] : 0;
  const bottomSpacerHeight =
    visEndRow < rows - 1 ? rowOffsets[rows] - rowOffsets[visEndRow + 1] : 0;
  const leftSpacerWidth =
    frozenCols < visStartCol ? colOffsets[visStartCol] - colOffsets[frozenCols] : 0;
  const rightSpacerWidth = visEndCol < cols - 1 ? colOffsets[cols] - colOffsets[visEndCol + 1] : 0;

  const visibleColIndices: number[] = [];
  for (let c = 0; c < frozenCols; c++) visibleColIndices.push(c);
  for (let c = visStartCol; c <= visEndCol; c++) visibleColIndices.push(c);

  const visibleRowIndices: number[] = [];
  for (let r = 0; r < frozenRows; r++) {
    if (!snapshot.activeSheet?.rows?.[String(r)]?.filteredOut) visibleRowIndices.push(r);
  }
  for (let r = visStartRow; r <= visEndRow; r++) {
    if (!snapshot.activeSheet?.rows?.[String(r)]?.filteredOut) visibleRowIndices.push(r);
  }

  function renderCell(r: number, c: number) {
    const addr = cellAddress(r, c);
    const cell = snapshot.activeSheet?.cells?.[addr];
    const isSelected = selectedCell?.row === r && selectedCell?.col === c;
    const inRange = isInRange(r, c);
    const hasComment = !!cell?.comment;
    const hasBinding = getCellMetadata ? getCellMetadata(r, c) : undefined;
    const isFrozenCell = frozen && (r < (frozen.row ?? 0) || c < (frozen.col ?? 0));
    const mergeInfo = getMergeInfo(r, c);
    const isEditing = editingCell?.row === r && editingCell?.col === c;
    const isDropTarget = dropTargetCell?.row === r && dropTargetCell?.col === c && !!draggingField;

    const isFillHandleCell =
      selectedRange && r === selectedRange.endRow && c === selectedRange.endCol && !isEditing;

    if (mergeInfo.isMerged && !mergeInfo.isTopLeft) {
      return null;
    }

    const cellStyle = mapCellStyle(cell?.style);
    const style: React.CSSProperties = {
      ...cellStyle.style,
      width: columnWidths[c] ?? DEFAULT_COL_WIDTH,
    };

    return (
      <td
        key={c}
        className={cellStyle.className}
        style={style}
        tabIndex={isSelected ? 0 : -1}
        role="gridcell"
        aria-selected={isSelected || inRange || undefined}
        data-row={r}
        data-col={c}
        data-cell-active={isSelected || undefined}
        data-cell-selected={isSelected || undefined}
        data-range-highlight={inRange || undefined}
        data-cell-bound={hasBinding || undefined}
        data-cell-comment={hasComment || undefined}
        data-cell-frozen={isFrozenCell || undefined}
        data-cell-merged={mergeInfo.isMerged || undefined}
        data-cell-editing={isEditing || undefined}
        data-cell-drop-target={isDropTarget || undefined}
        data-cell-fill-preview={isFillPreview(r, c) || undefined}
        rowSpan={mergeInfo.rowSpan > 1 ? mergeInfo.rowSpan : undefined}
        colSpan={mergeInfo.colSpan > 1 ? mergeInfo.colSpan : undefined}
        onClick={() => onCellClick(r, c)}
        onDoubleClick={() => onCellDoubleClick(r, c)}
        onMouseDown={(e) => onCellMouseDown(r, c, e)}
        onContextMenu={() => {
          if (!activeSheetId) {
            return;
          }
          if (!isCellWithinSelection(selection, r, c, activeSheetId)) {
            onCellClick(r, c);
          }
        }}
        onMouseEnter={() => onCellMouseEnter(r, c)}
        onDragOver={(e) => {
          e.preventDefault();
          onFieldDragOver?.(r, c);
        }}
        onDragLeave={() => onFieldDragLeave?.()}
      >
        {isEditing ? (
          <input
            type="text"
            className="ss-cell-edit-input"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onBlur={onEditSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onEditSave();
              } else if (e.key === 'Escape') {
                onEditCancel();
              }
            }}
            autoFocus
          />
        ) : (
          <>
            {cell?.value != null ? String(cell.value) : ''}
            {isFillHandleCell && (
              <div
                className="ss-fill-handle"
                onMouseDown={(e) => onFillHandleMouseDown(r, c, e)}
                onDoubleClick={() => onFillHandleDoubleClick()}
              />
            )}
          </>
        )}
      </td>
    );
  }

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
        className="spreadsheet-grid"
        data-fill-dragging={fillHandleState.isFilling || undefined}
        style={{ overflow: 'auto', position: 'relative' }}
        tabIndex={0}
        role="grid"
        aria-label="Spreadsheet grid"
        onScroll={handleScroll}
        onKeyDown={(event) => {
          if (editingCell) {
            return;
          }

          const active = selectedCell ?? { row: 0, col: 0 };

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
        <div
          style={{
            width: totalWidth + ROW_HEADER_WIDTH,
            height: totalHeight,
            position: 'relative',
          }}
        >
          <table>
            <thead>
              <tr>
                <th
                  className="row-header header-corner"
                  style={{ width: ROW_HEADER_WIDTH }}
                  onClick={onSelectAll}
                  onContextMenu={() => {
                    if (selection.kind !== 'sheet') {
                      onSelectAll();
                    }
                  }}
                ></th>
                {leftSpacerWidth > 0 && <th style={{ width: leftSpacerWidth, padding: 0 }} />}
                {visibleColIndices.map((c) => (
                  <th
                    key={c}
                    style={{ width: columnWidths[c] ?? DEFAULT_COL_WIDTH }}
                    className="col-header"
                    data-col-header-active={
                      selection.kind === 'column' && selection.columns?.includes(c)
                        ? true
                        : undefined
                    }
                    data-col-filtered={filteredColumnSet.has(c) || undefined}
                    onClick={(event) => onSelectColumn(c, event.shiftKey)}
                    onContextMenu={() => {
                      if (selection.kind !== 'column' || !selection.columns?.includes(c)) {
                        onSelectColumn(c);
                      }
                    }}
                  >
                    {cellAddress(0, c).replace(/[0-9]/g, '')}
                    <div
                      className="col-resize-handle"
                      onMouseDown={(e) => onColumnResizeStart(c, e)}
                    />
                  </th>
                ))}
                {rightSpacerWidth > 0 && <th style={{ width: rightSpacerWidth, padding: 0 }} />}
              </tr>
            </thead>
            <tbody>
              {topSpacerHeight > 0 && (
                <tr style={{ height: topSpacerHeight }}>
                  <td
                    colSpan={
                      visibleColIndices.length +
                      1 +
                      (leftSpacerWidth > 0 ? 1 : 0) +
                      (rightSpacerWidth > 0 ? 1 : 0)
                    }
                  />
                </tr>
              )}
              {visibleRowIndices.map((r) => (
                <tr
                  key={r}
                  style={{ height: rowHeights[r] ?? DEFAULT_ROW_HEIGHT }}
                  className={frozen && r < (frozen.row ?? 0) ? 'frozen-row' : ''}
                >
                  <td
                    className="row-header"
                    data-row-header-active={
                      selection.kind === 'row' && selection.rows?.includes(r) ? true : undefined
                    }
                    onContextMenu={() => {
                      if (selection.kind !== 'row' || !selection.rows?.includes(r)) {
                        onSelectRow(r);
                      }
                    }}
                  >
                    <button
                      type="button"
                      className="ss-row-header-button"
                      onClick={(event) => onSelectRow(r, event.shiftKey)}
                    >
                      {r + 1}
                    </button>
                    <div
                      className="row-resize-handle"
                      onMouseDown={(e) => onRowResizeStart(r, e)}
                    />
                  </td>
                  {leftSpacerWidth > 0 && <td style={{ width: leftSpacerWidth, padding: 0 }} />}
                  {visibleColIndices.map((c) => renderCell(r, c))}
                  {rightSpacerWidth > 0 && <td style={{ width: rightSpacerWidth, padding: 0 }} />}
                </tr>
              ))}
              {bottomSpacerHeight > 0 && (
                <tr style={{ height: bottomSpacerHeight }}>
                  <td
                    colSpan={
                      visibleColIndices.length +
                      1 +
                      (leftSpacerWidth > 0 ? 1 : 0) +
                      (rightSpacerWidth > 0 ? 1 : 0)
                    }
                  />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ContextMenuTrigger>
      <SpreadsheetGridContextMenu
        actions={contextActions}
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
        hasActiveRowFilters={hasActiveRowFilters}
      />
    </ContextMenu>
  );
}
