import { cellAddress } from '@nop-chaos/spreadsheet-core';
import type { CSSProperties } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { Button } from '@nop-chaos/ui';
import { mapCellStyle } from '../cell-style-map.js';
import {
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  ROW_HEADER_WIDTH,
  isCellWithinSelection,
} from './constants.js';
import { SpreadsheetCellEditor } from './inline-controls.js';
import type { SpreadsheetGridProps } from './types.js';
import type { SpreadsheetGridViewportState } from './viewport.js';

export interface PendingKeyboardContextMenuRequest {
  axis: 'row' | 'column';
  index: number;
  element: HTMLElement;
}

export interface SpreadsheetGridTableShellProps {
  snapshot: SpreadsheetGridProps['snapshot'];
  viewport: SpreadsheetGridViewportState;
  activeSheetId: string;
  selectedCell: SpreadsheetGridProps['selectedCell'];
  selection: SpreadsheetGridProps['selection'];
  selectedRange: ReturnType<SpreadsheetGridProps['getSelectedRange']>;
  editingCell: SpreadsheetGridProps['editingCell'];
  editValue: SpreadsheetGridProps['editValue'];
  columnWidths: SpreadsheetGridProps['columnWidths'];
  rowHeights: SpreadsheetGridProps['rowHeights'];
  filteredColumnSet: Set<number>;
  dropTargetCell: SpreadsheetGridProps['dropTargetCell'];
  draggingField: SpreadsheetGridProps['draggingField'];
  readonly?: SpreadsheetGridProps['readonly'];
  getMergeInfo: SpreadsheetGridProps['getMergeInfo'];
  getCellMetadata?: SpreadsheetGridProps['getCellMetadata'];
  isInRange: SpreadsheetGridProps['isInRange'];
  isFillPreview: SpreadsheetGridProps['isFillPreview'];
  onCellClick: SpreadsheetGridProps['onCellClick'];
  onCellDoubleClick: SpreadsheetGridProps['onCellDoubleClick'];
  onCellMouseDown: SpreadsheetGridProps['onCellMouseDown'];
  onCellMouseEnter: SpreadsheetGridProps['onCellMouseEnter'];
  onSelectRow: SpreadsheetGridProps['onSelectRow'];
  onSelectColumn: SpreadsheetGridProps['onSelectColumn'];
  onSelectAll: SpreadsheetGridProps['onSelectAll'];
  onColumnResizeStart: SpreadsheetGridProps['onColumnResizeStart'];
  onRowResizeStart: SpreadsheetGridProps['onRowResizeStart'];
  onFillHandleMouseDown: SpreadsheetGridProps['onFillHandleMouseDown'];
  onFillHandleDoubleClick: SpreadsheetGridProps['onFillHandleDoubleClick'];
  onEditValueChange: SpreadsheetGridProps['onEditValueChange'];
  onEditSave: SpreadsheetGridProps['onEditSave'];
  onEditCancel: SpreadsheetGridProps['onEditCancel'];
  onFieldDragOver?: SpreadsheetGridProps['onFieldDragOver'];
  onFieldDragLeave?: SpreadsheetGridProps['onFieldDragLeave'];
  onKeyboardContextMenuRequest: (request: PendingKeyboardContextMenuRequest) => void;
}

function getVisibleColumnLabel(col: number) {
  return cellAddress(0, col).replace(/[0-9]/g, '');
}

function getSpacerColSpan(viewport: SpreadsheetGridViewportState) {
  return (
    viewport.visibleColIndices.length +
    1 +
    (viewport.leftSpacerWidth > 0 ? 1 : 0) +
    (viewport.rightSpacerWidth > 0 ? 1 : 0)
  );
}

function SpreadsheetGridCell({
  row,
  col,
  snapshot,
  activeSheetId,
  selectedCell,
  selection,
  selectedRange,
  editingCell,
  editValue,
  columnWidths,
  dropTargetCell,
  draggingField,
  readonly,
  getMergeInfo,
  getCellMetadata,
  isInRange,
  isFillPreview,
  onCellClick,
  onCellDoubleClick,
  onCellMouseDown,
  onCellMouseEnter,
  onFillHandleMouseDown,
  onFillHandleDoubleClick,
  onEditValueChange,
  onEditSave,
  onEditCancel,
  onFieldDragOver,
  onFieldDragLeave,
}: {
  row: number;
  col: number;
  snapshot: SpreadsheetGridProps['snapshot'];
  activeSheetId: string;
  selectedCell: SpreadsheetGridProps['selectedCell'];
  selection: SpreadsheetGridProps['selection'];
  selectedRange: ReturnType<SpreadsheetGridProps['getSelectedRange']>;
  editingCell: SpreadsheetGridProps['editingCell'];
  editValue: SpreadsheetGridProps['editValue'];
  columnWidths: SpreadsheetGridProps['columnWidths'];
  dropTargetCell: SpreadsheetGridProps['dropTargetCell'];
  draggingField: SpreadsheetGridProps['draggingField'];
  readonly?: SpreadsheetGridProps['readonly'];
  getMergeInfo: SpreadsheetGridProps['getMergeInfo'];
  getCellMetadata?: SpreadsheetGridProps['getCellMetadata'];
  isInRange: SpreadsheetGridProps['isInRange'];
  isFillPreview: SpreadsheetGridProps['isFillPreview'];
  onCellClick: SpreadsheetGridProps['onCellClick'];
  onCellDoubleClick: SpreadsheetGridProps['onCellDoubleClick'];
  onCellMouseDown: SpreadsheetGridProps['onCellMouseDown'];
  onCellMouseEnter: SpreadsheetGridProps['onCellMouseEnter'];
  onFillHandleMouseDown: SpreadsheetGridProps['onFillHandleMouseDown'];
  onFillHandleDoubleClick: SpreadsheetGridProps['onFillHandleDoubleClick'];
  onEditValueChange: SpreadsheetGridProps['onEditValueChange'];
  onEditSave: SpreadsheetGridProps['onEditSave'];
  onEditCancel: SpreadsheetGridProps['onEditCancel'];
  onFieldDragOver?: SpreadsheetGridProps['onFieldDragOver'];
  onFieldDragLeave?: SpreadsheetGridProps['onFieldDragLeave'];
}) {
  const addr = cellAddress(row, col);
  const cell = snapshot.activeSheet?.cells?.[addr];
  const isSelected = selectedCell?.row === row && selectedCell?.col === col;
  const inRange = isInRange(row, col);
  const hasComment = !!cell?.comment;
  const hasBinding = getCellMetadata ? getCellMetadata(row, col) : undefined;
  const frozen = snapshot.activeSheet?.frozen;
  const isFrozenCell = frozen && (row < (frozen.row ?? 0) || col < (frozen.col ?? 0));
  const mergeInfo = getMergeInfo(row, col);
  const isEditing = editingCell?.row === row && editingCell?.col === col;
  const isDropTarget = dropTargetCell?.row === row && dropTargetCell?.col === col && !!draggingField;
  const isFillHandleCell = selectedRange && row === selectedRange.endRow && col === selectedRange.endCol && !isEditing;

  if (mergeInfo.isMerged && !mergeInfo.isTopLeft) {
    return null;
  }

  const cellStyle = mapCellStyle(cell?.style);
  const style: CSSProperties = {
    ...cellStyle.style,
    width: columnWidths[col] ?? DEFAULT_COL_WIDTH,
  };

  return (
    <td
      key={col}
      id={`spreadsheet-cell-${addr}`}
      role="gridcell"
      aria-rowindex={row + 1}
      aria-colindex={col + 1}
      className={cellStyle.className}
      style={style}
      tabIndex={isSelected ? 0 : -1}
      aria-selected={isSelected || inRange || undefined}
      data-row={row}
      data-col={col}
      data-cell-active={isSelected || undefined}
      data-cell-selected={isSelected || undefined}
      data-range-highlight={inRange || undefined}
      data-cell-bound={hasBinding ? true : undefined}
      data-cell-comment={hasComment || undefined}
      data-cell-frozen={isFrozenCell || undefined}
      data-cell-merged={mergeInfo.isMerged || undefined}
      data-cell-editing={isEditing || undefined}
      data-cell-drop-target={isDropTarget || undefined}
      data-cell-fill-preview={isFillPreview(row, col) || undefined}
      rowSpan={mergeInfo.rowSpan > 1 ? mergeInfo.rowSpan : undefined}
      colSpan={mergeInfo.colSpan > 1 ? mergeInfo.colSpan : undefined}
      onClick={() => onCellClick(row, col)}
      onDoubleClick={() => onCellDoubleClick(row, col)}
      onMouseDown={(event) => onCellMouseDown(row, col, event)}
      onContextMenu={() => {
        if (!activeSheetId) {
          return;
        }
        if (!isCellWithinSelection(selection, row, col, activeSheetId)) {
          onCellClick(row, col);
        }
      }}
      onMouseEnter={() => onCellMouseEnter(row, col)}
      onDragOver={(event) => {
        event.preventDefault();
        if (readonly) {
          return;
        }
        onFieldDragOver?.(row, col);
      }}
      onDragLeave={() => onFieldDragLeave?.()}
    >
      {isEditing ? (
        <SpreadsheetCellEditor
          value={editValue}
          readOnly={readonly}
          onChange={onEditValueChange}
          onSave={onEditSave}
          onCancel={onEditCancel}
        />
      ) : (
        <>
          {cell?.value != null ? String(cell.value) : ''}
          {isFillHandleCell ? (
            <div
              className="ss-fill-handle"
              aria-hidden="true"
              onMouseDown={(event) => onFillHandleMouseDown(row, col, event)}
              onDoubleClick={() => onFillHandleDoubleClick()}
            />
          ) : null}
        </>
      )}
    </td>
  );
}

export function SpreadsheetGridTableShell({
  snapshot,
  viewport,
  activeSheetId,
  selectedCell,
  selection,
  selectedRange,
  editingCell,
  editValue,
  columnWidths,
  rowHeights,
  filteredColumnSet,
  dropTargetCell,
  draggingField,
  readonly,
  getMergeInfo,
  getCellMetadata,
  isInRange,
  isFillPreview,
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
  onFieldDragOver,
  onFieldDragLeave,
  onKeyboardContextMenuRequest,
}: SpreadsheetGridTableShellProps) {
  const spacerColSpan = getSpacerColSpan(viewport);
  const frozen = snapshot.activeSheet?.frozen;

  return (
    <div
      style={{
        width: viewport.totalWidth + ROW_HEADER_WIDTH,
        height: viewport.totalHeight,
        position: 'relative',
      }}
    >
      <table key={activeSheetId}>
        <thead>
          <tr>
            <th
              className="ss-header-corner"
              data-slot="spreadsheet-corner-header"
              data-sheet-header-active={selection.kind === 'sheet' || undefined}
              style={{ width: ROW_HEADER_WIDTH }}
              onContextMenu={() => {
                if (selection.kind !== 'sheet') {
                  onSelectAll();
                }
              }}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ss-header-button"
                data-slot="spreadsheet-header-button"
                aria-label={t('flux.sheet.selectAllAriaLabel')}
                onClick={onSelectAll}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectAll();
                  }
                }}
              />
            </th>
            {viewport.leftSpacerWidth > 0 ? <th style={{ width: viewport.leftSpacerWidth, padding: 0 }} /> : null}
            {viewport.visibleColIndices.map((col) => {
              const columnLabel = getVisibleColumnLabel(col);
              return (
                <th
                  key={col}
                  style={{ width: columnWidths[col] ?? DEFAULT_COL_WIDTH }}
                  data-slot="spreadsheet-column-header"
                  data-col-header-active={
                    selection.kind === 'column' && selection.columns?.includes(col) ? true : undefined
                  }
                  data-col-filtered={filteredColumnSet.has(col) || undefined}
                  onContextMenu={() => {
                    if (selection.kind !== 'column' || !selection.columns?.includes(col)) {
                      onSelectColumn(col);
                    }
                  }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ss-header-button"
                    data-slot="spreadsheet-header-button"
                     aria-label={t('flux.sheet.selectColumnAriaLabel', { name: columnLabel })}
                    onClick={(event) => onSelectColumn(col, event.shiftKey)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectColumn(col, event.shiftKey);
                        return;
                      }
                      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                        event.preventDefault();
                        onSelectColumn(col);
                        onKeyboardContextMenuRequest({
                          axis: 'column',
                          index: col,
                          element: event.currentTarget,
                        });
                      }
                    }}
                  >
                    {columnLabel}
                  </Button>
                  <div
                    className="ss-col-resize-handle"
                    data-slot="spreadsheet-column-resize-handle"
                    aria-hidden="true"
                    onMouseDown={(event) => onColumnResizeStart(col, event)}
                  />
                </th>
              );
            })}
            {viewport.rightSpacerWidth > 0 ? <th style={{ width: viewport.rightSpacerWidth, padding: 0 }} /> : null}
          </tr>
        </thead>
        <tbody>
          {viewport.topSpacerHeight > 0 ? (
            <tr style={{ height: viewport.topSpacerHeight }}>
              <td colSpan={spacerColSpan} />
            </tr>
          ) : null}
          {viewport.visibleRowIndices.map((row) => (
            <tr
              key={row}
              role="row"
              aria-rowindex={row + 1}
              style={{ height: rowHeights[row] ?? DEFAULT_ROW_HEIGHT }}
              className={frozen && row < (frozen.row ?? 0) ? 'frozen-row' : ''}
            >
              <td
                data-slot="spreadsheet-row-header"
                data-row-header-active={selection.kind === 'row' && selection.rows?.includes(row) ? true : undefined}
                onContextMenu={() => {
                  if (selection.kind !== 'row' || !selection.rows?.includes(row)) {
                    onSelectRow(row);
                  }
                }}
              >
                <Button
                  type="button"
                  className="ss-row-header-button"
                  data-slot="spreadsheet-header-button"
                  variant="ghost"
                  size="sm"
                   aria-label={t('flux.sheet.selectRowAriaLabel', { index: row + 1 })}
                  onClick={(event) => onSelectRow(row, event.shiftKey)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectRow(row, event.shiftKey);
                      return;
                    }
                    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                      event.preventDefault();
                      onSelectRow(row);
                      onKeyboardContextMenuRequest({
                        axis: 'row',
                        index: row,
                        element: event.currentTarget,
                      });
                    }
                  }}
                >
                  {row + 1}
                </Button>
                <div
                  className="ss-row-resize-handle"
                  data-slot="spreadsheet-row-resize-handle"
                  aria-hidden="true"
                  onMouseDown={(event) => onRowResizeStart(row, event)}
                />
              </td>
              {viewport.leftSpacerWidth > 0 ? <td style={{ width: viewport.leftSpacerWidth, padding: 0 }} /> : null}
              {viewport.visibleColIndices.map((col) => (
                <SpreadsheetGridCell
                  key={`${row}-${col}`}
                  row={row}
                  col={col}
                  snapshot={snapshot}
                  activeSheetId={activeSheetId}
                  selectedCell={selectedCell}
                  selection={selection}
                  selectedRange={selectedRange}
                  editingCell={editingCell}
                  editValue={editValue}
                  columnWidths={columnWidths}
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
                  onFillHandleMouseDown={onFillHandleMouseDown}
                  onFillHandleDoubleClick={onFillHandleDoubleClick}
                  onEditValueChange={onEditValueChange}
                  onEditSave={onEditSave}
                  onEditCancel={onEditCancel}
                  onFieldDragOver={onFieldDragOver}
                  onFieldDragLeave={onFieldDragLeave}
                />
              ))}
              {viewport.rightSpacerWidth > 0 ? <td style={{ width: viewport.rightSpacerWidth, padding: 0 }} /> : null}
            </tr>
          ))}
          {viewport.bottomSpacerHeight > 0 ? (
            <tr style={{ height: viewport.bottomSpacerHeight }}>
              <td colSpan={spacerColSpan} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
