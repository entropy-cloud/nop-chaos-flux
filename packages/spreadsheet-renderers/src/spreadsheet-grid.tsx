import { cellAddress, type SpreadsheetRange, type SpreadsheetFrozenPane } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetHostSnapshot, SpreadsheetBridge } from './bridge.js';

export interface SpreadsheetGridProps {
  snapshot: SpreadsheetHostSnapshot;
  bridge: SpreadsheetBridge;
  rows: number;
  cols: number;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  selectedCell: { row: number; col: number } | null;
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
  onColumnResizeStart: (col: number, e: React.MouseEvent) => void;
  onRowResizeStart: (row: number, e: React.MouseEvent) => void;
  onFillHandleMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
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
  rows,
  cols,
  columnWidths,
  rowHeights,
  selectedCell,
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
  onColumnResizeStart,
  onRowResizeStart,
  onFillHandleMouseDown,
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
  const selectedRange = getSelectedRange();

  return (
    <div className="spreadsheet-grid" data-fill-dragging={fillHandleState.isFilling || undefined}>
      <table>
        <thead>
          <tr>
            <th className="row-header header-corner" style={{ width: 40 }}></th>
            {Array.from({ length: cols }, (_, c) => (
              <th
                key={c}
                style={{ width: columnWidths[c] ?? 80 }}
                className="col-header"
              >
                {cellAddress(0, c).replace(/[0-9]/g, '')}
                <div
                  className="col-resize-handle"
                  onMouseDown={(e) => onColumnResizeStart(c, e)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr
              key={r}
              style={{ height: rowHeights[r] ?? 24 }}
              className={frozen && r < (frozen.row ?? 0) ? 'frozen-row' : ''}
            >
              <td className="row-header">
                {r + 1}
                <div
                  className="row-resize-handle"
                  onMouseDown={(e) => onRowResizeStart(r, e)}
                />
              </td>
              {Array.from({ length: cols }, (_, c) => {
                const addr = cellAddress(r, c);
                const cell = snapshot.activeSheet?.cells?.[addr];
                const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                const inRange = isInRange(r, c);
                const hasComment = !!cell?.comment;
                const hasBinding = getCellMetadata ? getCellMetadata(r, c) : undefined;
                const isFrozen = frozen && (r < (frozen.row ?? 0) || c < (frozen.col ?? 0));
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

                const style: React.CSSProperties = {
                  width: columnWidths[c] ?? 80,
                  fontWeight: cell?.style?.fontWeight,
                  fontStyle: cell?.style?.fontStyle,
                  textDecoration: cell?.style?.textDecoration,
                  color: cell?.style?.fontColor,
                  backgroundColor: cell?.style?.backgroundColor,
                  textAlign: cell?.style?.textAlign,
                  verticalAlign: cell?.style?.verticalAlign,
                  borderStyle: cell?.style?.borderStyle === 'all' ? 'solid' : undefined,
                  borderColor: cell?.style?.borderColor,
                };

                return (
                  <td
                    key={c}
                    className="ss-cell"
                    style={style}
                    data-row={r}
                    data-col={c}
                    data-cell-active={isSelected || undefined}
                    data-cell-selected={isSelected || undefined}
                    data-range-highlight={inRange || undefined}
                    data-cell-bound={hasBinding || undefined}
                    data-cell-comment={hasComment || undefined}
                    data-cell-frozen={isFrozen || undefined}
                    data-cell-merged={mergeInfo.isMerged || undefined}
                    data-cell-editing={isEditing || undefined}
                    data-cell-drop-target={isDropTarget || undefined}
                    data-cell-fill-preview={isFillPreview(r, c) || undefined}
                    rowSpan={mergeInfo.rowSpan > 1 ? mergeInfo.rowSpan : undefined}
                    colSpan={mergeInfo.colSpan > 1 ? mergeInfo.colSpan : undefined}
                    onClick={() => onCellClick(r, c)}
                    onDoubleClick={() => onCellDoubleClick(r, c)}
                    onMouseDown={(e) => onCellMouseDown(r, c, e)}
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
                          />
                        )}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
