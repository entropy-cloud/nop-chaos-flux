import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { cellAddress } from '@nop-chaos/spreadsheet-core';
export function SpreadsheetGrid({ snapshot, rows, cols, columnWidths, rowHeights, selectedCell, editingCell, editValue, fillHandleState, isInRange, isFillPreview, getSelectedRange, getMergeInfo, onCellClick, onCellDoubleClick, onCellMouseDown, onCellMouseEnter, onColumnResizeStart, onRowResizeStart, onFillHandleMouseDown, onEditValueChange, onEditSave, onEditCancel, dropTargetCell, draggingField, getCellMetadata, onFieldDragOver, onFieldDragLeave, }) {
    const frozen = snapshot.activeSheet?.frozen;
    return (_jsx("div", { className: "spreadsheet-grid", "data-fill-dragging": fillHandleState.isFilling || undefined, children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "row-header header-corner", style: { width: 40 } }), Array.from({ length: cols }, (_, c) => (_jsxs("th", { style: { width: columnWidths[c] ?? 80 }, className: "col-header", children: [String.fromCharCode(65 + c), _jsx("div", { className: "col-resize-handle", onMouseDown: (e) => onColumnResizeStart(c, e) })] }, c)))] }) }), _jsx("tbody", { children: Array.from({ length: rows }, (_, r) => (_jsxs("tr", { style: { height: rowHeights[r] ?? 24 }, className: frozen && r < (frozen.row ?? 0) ? 'frozen-row' : '', children: [_jsxs("td", { className: "row-header", children: [r + 1, _jsx("div", { className: "row-resize-handle", onMouseDown: (e) => onRowResizeStart(r, e) })] }), Array.from({ length: cols }, (_, c) => {
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
                                const selectedRange = getSelectedRange();
                                const isFillHandleCell = selectedRange &&
                                    r === selectedRange.endRow &&
                                    c === selectedRange.endCol &&
                                    !isEditing;
                                if (mergeInfo.isMerged && !mergeInfo.isTopLeft) {
                                    return null;
                                }
                                const style = {
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
                                return (_jsx("td", { className: "ss-cell", style: style, "data-row": r, "data-col": c, "data-cell-active": isSelected || undefined, "data-cell-selected": isSelected || undefined, "data-range-highlight": inRange || undefined, "data-cell-bound": hasBinding || undefined, "data-cell-comment": hasComment || undefined, "data-cell-frozen": isFrozen || undefined, "data-cell-merged": mergeInfo.isMerged || undefined, "data-cell-editing": isEditing || undefined, "data-cell-drop-target": isDropTarget || undefined, "data-cell-fill-preview": isFillPreview(r, c) || undefined, rowSpan: mergeInfo.rowSpan > 1 ? mergeInfo.rowSpan : undefined, colSpan: mergeInfo.colSpan > 1 ? mergeInfo.colSpan : undefined, onClick: () => onCellClick(r, c), onDoubleClick: () => onCellDoubleClick(r, c), onMouseDown: (e) => onCellMouseDown(r, c, e), onMouseEnter: () => onCellMouseEnter(r, c), onDragOver: (e) => { e.preventDefault(); onFieldDragOver?.(r, c); }, onDragLeave: () => onFieldDragLeave?.(), children: isEditing ? (_jsx("input", { type: "text", className: "ss-cell-edit-input", value: editValue, onChange: (e) => onEditValueChange(e.target.value), onBlur: onEditSave, onKeyDown: (e) => {
                                            if (e.key === 'Enter') {
                                                onEditSave();
                                            }
                                            else if (e.key === 'Escape') {
                                                onEditCancel();
                                            }
                                        }, autoFocus: true })) : (_jsxs(_Fragment, { children: [cell?.value != null ? String(cell.value) : '', isFillHandleCell && (_jsx("div", { className: "ss-fill-handle", onMouseDown: (e) => onFillHandleMouseDown(r, c, e) }))] })) }, c));
                            })] }, r))) })] }) }));
}
//# sourceMappingURL=spreadsheet-grid.js.map