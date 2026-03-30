export function createDefaultSelection() {
    return { kind: 'none' };
}
export function createDefaultViewport() {
    return { scrollX: 0, scrollY: 0, zoom: 1 };
}
export function createDefaultHistory() {
    return { canUndo: false, canRedo: false, undoDepth: 0, redoDepth: 0 };
}
export function createDefaultLayout() {
    return {
        visibleRange: {
            sheetId: '',
            startRow: 0,
            startCol: 0,
            endRow: 100,
            endCol: 26,
        },
    };
}
export function cellAddress(row, col) {
    let result = '';
    let c = col;
    while (c >= 0) {
        result = String.fromCharCode(65 + (c % 26)) + result;
        c = Math.floor(c / 26) - 1;
    }
    return `${result}${row + 1}`;
}
export function parseCellAddress(address) {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match)
        throw new Error(`Invalid cell address: ${address}`);
    const colStr = match[1];
    const rowStr = match[2];
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
        col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    return { row: parseInt(rowStr, 10) - 1, col: col - 1 };
}
export function isSameCellRef(a, b) {
    return a.sheetId === b.sheetId && a.row === b.row && a.col === b.col;
}
export function isRangeEmpty(range) {
    return range.startRow === range.endRow && range.startCol === range.endCol;
}
export function rangeContainsCell(range, cell) {
    if (range.sheetId !== cell.sheetId)
        return false;
    return (cell.row >= range.startRow &&
        cell.row <= range.endRow &&
        cell.col >= range.startCol &&
        cell.col <= range.endCol);
}
export function normalizeRange(range) {
    return {
        sheetId: range.sheetId,
        startRow: Math.min(range.startRow, range.endRow),
        startCol: Math.min(range.startCol, range.endCol),
        endRow: Math.max(range.startRow, range.endRow),
        endCol: Math.max(range.startCol, range.endCol),
    };
}
export function rangeSize(range) {
    const normalized = normalizeRange(range);
    return {
        rows: normalized.endRow - normalized.startRow + 1,
        cols: normalized.endCol - normalized.startCol + 1,
    };
}
export function createEmptyDocument(id) {
    return {
        id: id ?? crypto.randomUUID(),
        kind: 'spreadsheet',
        name: 'Untitled',
        version: '1.0.0',
        workbook: {
            sheets: [
                {
                    id: crypto.randomUUID(),
                    name: 'Sheet1',
                    order: 0,
                },
            ],
        },
    };
}
export function mergeCellStyle(existing, patch) {
    return { ...(existing ?? {}), ...patch };
}
export function getCellsInRange(range) {
    const normalized = normalizeRange(range);
    const cells = [];
    for (let r = normalized.startRow; r <= normalized.endRow; r++) {
        for (let c = normalized.startCol; c <= normalized.endCol; c++) {
            cells.push({ row: r, col: c });
        }
    }
    return cells;
}
export function rangeIntersects(a, b) {
    if (a.sheetId !== b.sheetId)
        return false;
    const na = normalizeRange(a);
    const nb = normalizeRange(b);
    return !(na.endRow < nb.startRow ||
        na.startRow > nb.endRow ||
        na.endCol < nb.startCol ||
        na.startCol > nb.endCol);
}
//# sourceMappingURL=types.js.map