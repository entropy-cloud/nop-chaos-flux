import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cellAddress, type SpreadsheetRange, type SpreadsheetFrozenPane } from '@nop-chaos/spreadsheet-core';
import { t } from '@nop-chaos/flux-i18n';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from '@nop-chaos/ui';
import type { SpreadsheetHostSnapshot, SpreadsheetBridge } from './bridge.js';
import { mapCellStyle } from './cell-style-map.js';

const DEFAULT_ROW_HEIGHT = 24;
const DEFAULT_COL_WIDTH = 80;
const ROW_HEADER_WIDTH = 40;
const OVERSCAN = 5;

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
  fillHandleState: { isFilling: boolean; startRow: number; startCol: number; endRow: number; endCol: number; currentRow: number; currentCol: number };
  isInRange: (row: number, col: number) => boolean;
  isFillPreview: (row: number, col: number) => boolean;
  getSelectedRange: () => SpreadsheetRange | null;
  getMergeInfo: (row: number, col: number) => { isMerged: boolean; isTopLeft: boolean; rowSpan: number; colSpan: number };
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

function computeRowOffsets(rows: number, rowHeights: Record<number, number>): number[] {
  const offsets = new Array<number>(rows + 1);
  offsets[0] = 0;
  for (let r = 0; r < rows; r++) {
    offsets[r + 1] = offsets[r] + (rowHeights[r] ?? DEFAULT_ROW_HEIGHT);
  }
  return offsets;
}

function computeColOffsets(cols: number, colWidths: Record<number, number>): number[] {
  const offsets = new Array<number>(cols + 1);
  offsets[0] = 0;
  for (let c = 0; c < cols; c++) {
    offsets[c + 1] = offsets[c] + (colWidths[c] ?? DEFAULT_COL_WIDTH);
  }
  return offsets;
}

function findFirstVisible(offsets: number[], scrollPos: number): number {
  let lo = 0;
  let hi = offsets.length - 2;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (offsets[mid + 1] <= scrollPos) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function isCellWithinSelection(
  selection: SpreadsheetHostSnapshot['selection'],
  row: number,
  col: number,
  sheetId: string,
) {
  if (selection.sheetId && selection.sheetId !== sheetId) {
    return false;
  }

  if (selection.kind === 'cell') {
    return selection.anchor?.row === row && selection.anchor?.col === col;
  }

  if (selection.kind === 'range' && selection.range) {
    return row >= selection.range.startRow
      && row <= selection.range.endRow
      && col >= selection.range.startCol
      && col <= selection.range.endCol;
  }

  if (selection.kind === 'row') {
    return selection.rows?.includes(row) ?? false;
  }

  if (selection.kind === 'column') {
    return selection.columns?.includes(col) ?? false;
  }

  if (selection.kind === 'sheet') {
    return true;
  }

  return false;
}

function getAnchorCellFromSelection(selection: SpreadsheetHostSnapshot['selection']) {
  if (selection.kind === 'cell' && selection.anchor) {
    return { row: selection.anchor.row, col: selection.anchor.col };
  }

  if (selection.kind === 'range' && selection.range) {
    return { row: selection.range.startRow, col: selection.range.startCol };
  }

  if (selection.kind === 'row' && selection.rows?.length) {
    const row = [...selection.rows].sort((a, b) => a - b)[0]!;
    return { row, col: 0 };
  }

  if (selection.kind === 'column' && selection.columns?.length) {
    const col = [...selection.columns].sort((a, b) => a - b)[0]!;
    return { row: 0, col };
  }

  if (selection.kind === 'sheet') {
    return { row: 0, col: 0 };
  }

  return null;
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
  const frozen: SpreadsheetFrozenPane | undefined = snapshot.activeSheet?.frozen;
  const activeSheetId = snapshot.activeSheet?.id ?? '';
  const selectedRange = getSelectedRange();
  const selectionAnchorCell = useMemo(() => getAnchorCellFromSelection(selection), [selection]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [viewportWidth, setViewportWidth] = useState(800);

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

  const visStartRow = Math.max(frozenRows, findFirstVisible(rowOffsets, effectiveScrollTop + frozenRowHeight) - OVERSCAN);
  const visEndRow = Math.min(rows - 1, findFirstVisible(rowOffsets, effectiveScrollTop + frozenRowHeight + viewportHeight) + OVERSCAN);
  const visStartCol = Math.max(frozenCols, findFirstVisible(colOffsets, effectiveScrollLeft + frozenColWidth) - OVERSCAN);
  const visEndCol = Math.min(cols - 1, findFirstVisible(colOffsets, effectiveScrollLeft + frozenColWidth + viewportWidth) + OVERSCAN);

  const topSpacerHeight = frozenRows < visStartRow ? rowOffsets[visStartRow] - rowOffsets[frozenRows] : 0;
  const bottomSpacerHeight = visEndRow < rows - 1 ? rowOffsets[rows] - rowOffsets[visEndRow + 1] : 0;
  const leftSpacerWidth = frozenCols < visStartCol ? colOffsets[visStartCol] - colOffsets[frozenCols] : 0;
  const rightSpacerWidth = visEndCol < cols - 1 ? colOffsets[cols] - colOffsets[visEndCol + 1] : 0;

  const visibleColIndices: number[] = [];
  for (let c = 0; c < frozenCols; c++) visibleColIndices.push(c);
  for (let c = visStartCol; c <= visEndCol; c++) visibleColIndices.push(c);

  const visibleRowIndices: number[] = [];
  for (let r = 0; r < frozenRows; r++) visibleRowIndices.push(r);
  for (let r = visStartRow; r <= visEndRow; r++) visibleRowIndices.push(r);

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

    const isFillHandleCell = selectedRange &&
      r === selectedRange.endRow &&
      c === selectedRange.endCol &&
      !isEditing;

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
        onDragOver={(e) => { e.preventDefault(); onFieldDragOver?.(r, c); }}
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

  const handleContextCopy = useCallback(async () => {
    if (!selectedRange) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:copyCells', range: selectedRange });
  }, [bridge, selectedRange]);

  const handleContextCut = useCallback(async () => {
    if (!selectedRange) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:cutCells', range: selectedRange });
  }, [bridge, selectedRange]);

  const handleContextPaste = useCallback(async () => {
    const targetCell = selectionAnchorCell;
    if (!targetCell || !activeSheetId) {
      return;
    }

    await bridge.dispatch({
      type: 'spreadsheet:pasteCells',
      target: {
        sheetId: activeSheetId,
        address: cellAddress(targetCell.row, targetCell.col),
        row: targetCell.row,
        col: targetCell.col,
      },
    });
  }, [activeSheetId, bridge, selectionAnchorCell]);

  const handleContextClear = useCallback(async () => {
    if (!selectedRange) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:clearCells', target: selectedRange });
  }, [bridge, selectedRange]);

  const handleContextInsertRow = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    const row = selection.kind === 'row' && selection.rows?.length
      ? [...selection.rows].sort((a, b) => a - b)[0]!
      : selectionAnchorCell?.row;
    if (row == null) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:insertRow', sheetId: activeSheetId, row });
  }, [activeSheetId, bridge, selection, selectionAnchorCell]);

  const handleContextInsertRowBelow = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    const row = selection.kind === 'row' && selection.rows?.length
      ? [...selection.rows].sort((a, b) => a - b).at(-1)
      : selectionAnchorCell?.row;
    if (row == null) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:insertRow', sheetId: activeSheetId, row: row + 1 });
  }, [activeSheetId, bridge, selection, selectionAnchorCell]);

  const handleContextDeleteRow = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    const row = selection.kind === 'row' && selection.rows?.length
      ? [...selection.rows].sort((a, b) => a - b)[0]!
      : selectionAnchorCell?.row;
    if (row == null) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:deleteRow', sheetId: activeSheetId, row });
  }, [activeSheetId, bridge, selection, selectionAnchorCell]);

  const handleContextInsertColumn = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    const col = selection.kind === 'column' && selection.columns?.length
      ? [...selection.columns].sort((a, b) => a - b)[0]!
      : selectionAnchorCell?.col;
    if (col == null) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:insertColumn', sheetId: activeSheetId, col });
  }, [activeSheetId, bridge, selection, selectionAnchorCell]);

  const handleContextInsertColumnRight = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    const col = selection.kind === 'column' && selection.columns?.length
      ? [...selection.columns].sort((a, b) => a - b).at(-1)
      : selectionAnchorCell?.col;
    if (col == null) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:insertColumn', sheetId: activeSheetId, col: col + 1 });
  }, [activeSheetId, bridge, selection, selectionAnchorCell]);

  const handleContextDeleteColumn = useCallback(async () => {
    if (!activeSheetId) {
      return;
    }
    const col = selection.kind === 'column' && selection.columns?.length
      ? [...selection.columns].sort((a, b) => a - b)[0]!
      : selectionAnchorCell?.col;
    if (col == null) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:deleteColumn', sheetId: activeSheetId, col });
  }, [activeSheetId, bridge, selection, selectionAnchorCell]);

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
        onScroll={handleScroll}
        onMouseDown={(e) => {
          if (e.button === 0 && (e.target as HTMLElement).closest('td[data-row][data-col]')) {
            isDraggingRef.current = true;
            lastDragCellRef.current = null;
          }
        }}
      >
        <div style={{ width: totalWidth + ROW_HEADER_WIDTH, height: totalHeight, position: 'relative' }}>
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
                  data-col-header-active={selection.kind === 'column' && selection.columns?.includes(c) ? true : undefined}
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
                <td colSpan={visibleColIndices.length + 1 + (leftSpacerWidth > 0 ? 1 : 0) + (rightSpacerWidth > 0 ? 1 : 0)} />
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
                  data-row-header-active={selection.kind === 'row' && selection.rows?.includes(r) ? true : undefined}
                  onContextMenu={() => {
                    if (selection.kind !== 'row' || !selection.rows?.includes(r)) {
                      onSelectRow(r);
                    }
                  }}
                >
                  <button type="button" className="ss-row-header-button" onClick={(event) => onSelectRow(r, event.shiftKey)}>
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
                <td colSpan={visibleColIndices.length + 1 + (leftSpacerWidth > 0 ? 1 : 0) + (rightSpacerWidth > 0 ? 1 : 0)} />
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </ContextMenuTrigger>
        <ContextMenuContent>
        <ContextMenuItem onClick={() => void handleContextCopy()} disabled={!selectedRange}>
          {t('flux.spreadsheet.copy')}
          <ContextMenuShortcut>{t('flux.spreadsheet.copyShortcut').replace(/^.*\s/, '')}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void handleContextCut()} disabled={!selectedRange}>
          {t('flux.spreadsheet.cut')}
          <ContextMenuShortcut>{t('flux.spreadsheet.cutShortcut').replace(/^.*\s/, '')}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void handleContextPaste()} disabled={!selectionAnchorCell || !activeSheetId}>
          {t('flux.spreadsheet.paste')}
          <ContextMenuShortcut>{t('flux.spreadsheet.pasteShortcut').replace(/^.*\s/, '')}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem data-testid="spreadsheet-context-clear" onClick={() => void handleContextClear()} disabled={!selectedRange}>
          {t('flux.common.clear')}
          <ContextMenuShortcut>{t('flux.spreadsheet.clearShortcut').replace(/^.*\s/, '')}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem data-testid="spreadsheet-context-insert-row-above" onClick={() => void handleContextInsertRow()} disabled={!selectionAnchorCell || !activeSheetId}>
          {t('flux.spreadsheet.insertRowAbove')}
        </ContextMenuItem>
        <ContextMenuItem data-testid="spreadsheet-context-insert-row-below" onClick={() => void handleContextInsertRowBelow()} disabled={!selectionAnchorCell || !activeSheetId}>
          {t('flux.spreadsheet.insertRowBelow')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void handleContextDeleteRow()} disabled={!selectionAnchorCell || !activeSheetId}>
          {t('flux.spreadsheet.deleteRow')}
        </ContextMenuItem>
        <ContextMenuItem data-testid="spreadsheet-context-insert-column-left" onClick={() => void handleContextInsertColumn()} disabled={!selectionAnchorCell || !activeSheetId}>
          {t('flux.spreadsheet.insertColumnLeft')}
        </ContextMenuItem>
        <ContextMenuItem data-testid="spreadsheet-context-insert-column-right" onClick={() => void handleContextInsertColumnRight()} disabled={!selectionAnchorCell || !activeSheetId}>
          {t('flux.spreadsheet.insertColumnRight')}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void handleContextDeleteColumn()} disabled={!selectionAnchorCell || !activeSheetId}>
          {t('flux.spreadsheet.deleteColumn')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
