import { createStore } from 'zustand/vanilla';
import type {
  SpreadsheetConfig,
  SpreadsheetDocument,
  SpreadsheetRuntimeSnapshot,
  SpreadsheetSelection,
  SpreadsheetEditingState,
  SpreadsheetCellRef,
  SpreadsheetRange,
  WorksheetDocument,
  CellDocument,
  CellStyle,
  ClipboardData,
  ClipboardCell,
} from './types.js';
import { createDefaultViewport, createDefaultLayout, cellAddress, normalizeRange } from './types.js';
import type { SpreadsheetCommand, SpreadsheetCommandResult } from './commands.js';

export interface SpreadsheetCore {
  getSnapshot(): SpreadsheetRuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: SpreadsheetCommand): Promise<SpreadsheetCommandResult>;
  replaceDocument(nextDocument: SpreadsheetDocument): void;
  exportDocument(): SpreadsheetDocument;
  getClipboard(): ClipboardData | null;
}

export interface CreateSpreadsheetCoreOptions {
  document: SpreadsheetDocument;
  config?: SpreadsheetConfig;
  readonly?: boolean;
}

interface SpreadsheetInternalState {
  document: SpreadsheetDocument;
  activeSheetId: string;
  selection: SpreadsheetSelection;
  editing: SpreadsheetEditingState | undefined;
  viewport: { scrollX: number; scrollY: number; zoom: number };
  readonly: boolean;
  dirty: boolean;
  undoStack: SpreadsheetDocument[];
  redoStack: SpreadsheetDocument[];
  transactionDoc: SpreadsheetDocument | null;
  clipboard: ClipboardData | null;
}

function buildSnapshot(state: SpreadsheetInternalState): SpreadsheetRuntimeSnapshot {
  return {
    document: state.document,
    activeSheetId: state.activeSheetId,
    selection: state.selection,
    editing: state.editing,
    history: {
      canUndo: state.undoStack.length > 0,
      canRedo: state.redoStack.length > 0,
      undoDepth: state.undoStack.length,
      redoDepth: state.redoStack.length,
    },
    viewport: state.viewport,
    layout: createDefaultLayout(),
    readonly: state.readonly,
    dirty: state.dirty,
  };
}

function ensureSheetCells(
  doc: SpreadsheetDocument,
  sheetId: string,
): { doc: SpreadsheetDocument; sheet: WorksheetDocument; sheetIdx: number } {
  const workbook = { ...doc.workbook, sheets: [...doc.workbook.sheets] };
  const idx = workbook.sheets.findIndex((s) => s.id === sheetId);
  if (idx === -1) throw new Error(`Sheet not found: ${sheetId}`);
  let sheet = workbook.sheets[idx];
  if (!sheet.cells) {
    sheet = { ...sheet, cells: {} };
    workbook.sheets[idx] = sheet;
  }
  if (!sheet.rows) {
    sheet = { ...sheet, rows: {} };
    workbook.sheets[idx] = sheet;
  }
  if (!sheet.columns) {
    sheet = { ...sheet, columns: {} };
    workbook.sheets[idx] = sheet;
  }
  return { doc: { ...doc, workbook }, sheet, sheetIdx: idx };
}

function getCell(sheet: WorksheetDocument, row: number, col: number): CellDocument | undefined {
  return sheet.cells?.[cellAddress(row, col)];
}

function setCell(sheet: WorksheetDocument, row: number, col: number, cell: CellDocument): WorksheetDocument {
  const cells = { ...sheet.cells, [cellAddress(row, col)]: cell };
  return { ...sheet, cells };
}

function updateCellStyle(
  sheet: WorksheetDocument,
  row: number,
  col: number,
  stylePatch: Partial<CellStyle>,
): WorksheetDocument {
  const existing = getCell(sheet, row, col) ?? { address: cellAddress(row, col), row, col };
  const mergedStyle = { ...(existing.style ?? {}), ...stylePatch };
  return setCell(sheet, row, col, { ...existing, style: mergedStyle });
}

function applySetCellValue(
  doc: SpreadsheetDocument,
  cell: SpreadsheetCellRef,
  value: unknown,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  const newCell: CellDocument = {
    ...(existing ?? { address: key, row: cell.row, col: cell.col }),
    value,
    address: key,
    row: cell.row,
    col: cell.col,
  };
  const cells = { ...sheet.cells, [key]: newCell };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === cell.sheetId ? { ...s, cells } : s,
  ) };
  return { ...updated, workbook };
}

function applySetCellFormula(
  doc: SpreadsheetDocument,
  cell: SpreadsheetCellRef,
  formula: string | undefined,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  let newCell: CellDocument;
  if (formula === undefined) {
    const rest = { ...existing };
    delete rest.formula;
    newCell = rest as CellDocument;
  } else {
    newCell = {
      ...(existing ?? { address: key, row: cell.row, col: cell.col }),
      formula,
      address: key,
      row: cell.row,
      col: cell.col,
    };
  }
  const cells = { ...sheet.cells, [key]: newCell };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === cell.sheetId ? { ...s, cells } : s,
  ) };
  return { ...updated, workbook };
}

function applySetCellStyle(
  doc: SpreadsheetDocument,
  target: SpreadsheetCellRef | SpreadsheetRange,
  styleId: string,
): SpreadsheetDocument {
  if ('startRow' in target) {
    const range = normalizeRange(target as SpreadsheetRange);
    const { doc: updated, sheet } = ensureSheetCells(doc, range.sheetId);
    let newSheet = sheet;
    for (let r = range.startRow; r <= range.endRow; r++) {
      for (let c = range.startCol; c <= range.endCol; c++) {
        const key = cellAddress(r, c);
        const existing = newSheet.cells?.[key];
        newSheet = setCell(newSheet, r, c, {
          ...(existing ?? { address: key, row: r, col: c }),
          styleId,
          address: key,
          row: r,
          col: c,
        });
      }
    }
    const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
      s.id === range.sheetId ? newSheet : s,
    ) };
    return { ...updated, workbook };
  }
  const cell = target as SpreadsheetCellRef;
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  const newCell: CellDocument = {
    ...(existing ?? { address: key, row: cell.row, col: cell.col }),
    styleId,
    address: key,
    row: cell.row,
    col: cell.col,
  };
  const cells = { ...sheet.cells, [key]: newCell };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === cell.sheetId ? { ...s, cells } : s,
  ) };
  return { ...updated, workbook };
}

function applyCellStyleChange(
  doc: SpreadsheetDocument,
  target: SpreadsheetCellRef | SpreadsheetRange,
  stylePatch: Partial<CellStyle>,
): SpreadsheetDocument {
  if ('startRow' in target) {
    const range = normalizeRange(target as SpreadsheetRange);
    const { doc: updated, sheet } = ensureSheetCells(doc, range.sheetId);
    let newSheet = sheet;
    for (let r = range.startRow; r <= range.endRow; r++) {
      for (let c = range.startCol; c <= range.endCol; c++) {
        newSheet = updateCellStyle(newSheet, r, c, stylePatch);
      }
    }
    const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
      s.id === range.sheetId ? newSheet : s,
    ) };
    return { ...updated, workbook };
  }
  const cell = target as SpreadsheetCellRef;
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const newSheet = updateCellStyle(sheet, cell.row, cell.col, stylePatch);
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === cell.sheetId ? newSheet : s,
  ) };
  return { ...updated, workbook };
}

function applyMergeRange(doc: SpreadsheetDocument, range: SpreadsheetRange): SpreadsheetDocument {
  const normalized = normalizeRange(range);
  const { doc: updated, sheet } = ensureSheetCells(doc, normalized.sheetId);
  const merges = [...(sheet.merges ?? [])];
  const exists = merges.some(
    (m) =>
      m.startRow === normalized.startRow &&
      m.startCol === normalized.startCol &&
      m.endRow === normalized.endRow &&
      m.endCol === normalized.endCol,
  );
  if (!exists) {
    merges.push(normalized);
  }
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === normalized.sheetId ? { ...s, merges } : s,
  ) };
  return { ...updated, workbook };
}

function applyUnmergeRange(doc: SpreadsheetDocument, range: SpreadsheetRange): SpreadsheetDocument {
  const normalized = normalizeRange(range);
  const { doc: updated, sheet } = ensureSheetCells(doc, normalized.sheetId);
  const merges = (sheet.merges ?? []).filter(
    (m) =>
      !(
        m.startRow === normalized.startRow &&
        m.startCol === normalized.startCol &&
        m.endRow === normalized.endRow &&
        m.endCol === normalized.endCol
      ),
  );
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === normalized.sheetId ? { ...s, merges } : s,
  ) };
  return { ...updated, workbook };
}

function applyResizeRow(
  doc: SpreadsheetDocument,
  sheetId: string,
  row: number,
  height: number,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const rows = { ...sheet.rows! };
  const key = String(row);
  rows[key] = { ...(rows[key] ?? { index: row }), index: row, height };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === sheetId ? { ...s, rows } : s,
  ) };
  return { ...updated, workbook };
}

function applyResizeColumn(
  doc: SpreadsheetDocument,
  sheetId: string,
  col: number,
  width: number,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const columns = { ...sheet.columns! };
  const key = String(col);
  columns[key] = { ...(columns[key] ?? { index: col }), index: col, width };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === sheetId ? { ...s, columns } : s,
  ) };
  return { ...updated, workbook };
}

function applyHideRow(
  doc: SpreadsheetDocument,
  sheetId: string,
  row: number,
  hidden: boolean,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const rows = { ...sheet.rows! };
  const key = String(row);
  rows[key] = { ...(rows[key] ?? { index: row }), index: row, hidden };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === sheetId ? { ...s, rows } : s,
  ) };
  return { ...updated, workbook };
}

function applyHideColumn(
  doc: SpreadsheetDocument,
  sheetId: string,
  col: number,
  hidden: boolean,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const columns = { ...sheet.columns! };
  const key = String(col);
  columns[key] = { ...(columns[key] ?? { index: col }), index: col, hidden };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === sheetId ? { ...s, columns } : s,
  ) };
  return { ...updated, workbook };
}

function applyAddSheet(
  doc: SpreadsheetDocument,
  name?: string,
  index?: number,
): SpreadsheetDocument {
  const id = crypto.randomUUID();
  const sheetName = name ?? `Sheet${doc.workbook.sheets.length + 1}`;
  const newSheet: WorksheetDocument = {
    id,
    name: sheetName,
    order: index ?? doc.workbook.sheets.length,
  };
  const sheets = [...doc.workbook.sheets];
  if (index !== undefined && index >= 0 && index <= sheets.length) {
    sheets.splice(index, 0, newSheet);
  } else {
    sheets.push(newSheet);
  }
  for (let i = 0; i < sheets.length; i++) {
    sheets[i] = { ...sheets[i], order: i };
  }
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

function applyRemoveSheet(doc: SpreadsheetDocument, sheetId: string): SpreadsheetDocument {
  if (doc.workbook.sheets.length <= 1) {
    throw new Error('Cannot remove the last sheet');
  }
  const sheets = doc.workbook.sheets.filter((s) => s.id !== sheetId);
  for (let i = 0; i < sheets.length; i++) {
    sheets[i] = { ...sheets[i], order: i };
  }
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

function applyRenameSheet(doc: SpreadsheetDocument, sheetId: string, name: string): SpreadsheetDocument {
  const sheets = doc.workbook.sheets.map((s) =>
    s.id === sheetId ? { ...s, name } : s,
  );
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

function applyMoveSheet(doc: SpreadsheetDocument, sheetId: string, targetIndex: number): SpreadsheetDocument {
  const sheets = [...doc.workbook.sheets];
  const fromIdx = sheets.findIndex((s) => s.id === sheetId);
  if (fromIdx === -1) throw new Error(`Sheet not found: ${sheetId}`);
  const [moved] = sheets.splice(fromIdx, 1);
  const insertIdx = Math.max(0, Math.min(targetIndex, sheets.length));
  sheets.splice(insertIdx, 0, moved);
  for (let i = 0; i < sheets.length; i++) {
    sheets[i] = { ...sheets[i], order: i };
  }
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

// P1/P2 Sheet operations
function applyCopySheet(doc: SpreadsheetDocument, sheetId: string, name?: string): SpreadsheetDocument {
  const srcSheet = doc.workbook.sheets.find((s) => s.id === sheetId);
  if (!srcSheet) throw new Error(`Sheet not found: ${sheetId}`);
  const newId = crypto.randomUUID();
  const newName = name ?? `${srcSheet.name} Copy`;
  const newSheet: WorksheetDocument = {
    ...JSON.parse(JSON.stringify(srcSheet)),
    id: newId,
    name: newName,
    order: doc.workbook.sheets.length,
  };
  const sheets = [...doc.workbook.sheets, newSheet];
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

function applySetSheetTabColor(doc: SpreadsheetDocument, sheetId: string, color: string): SpreadsheetDocument {
  const sheets = doc.workbook.sheets.map((s) =>
    s.id === sheetId ? { ...s, tabColor: color } : s,
  );
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

function applyHideSheet(doc: SpreadsheetDocument, sheetId: string, hidden: boolean): SpreadsheetDocument {
  const sheets = doc.workbook.sheets.map((s) =>
    s.id === sheetId ? { ...s, hidden } : s,
  );
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

function applyProtectSheet(
  doc: SpreadsheetDocument,
  sheetId: string,
  password?: string,
  options?: import('./types.js').SheetProtectionOptions,
): SpreadsheetDocument {
  const sheets = doc.workbook.sheets.map((s) =>
    s.id === sheetId ? { ...s, protected: true, protectionOptions: options } : s,
  );
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

function applyFreezePanes(doc: SpreadsheetDocument, sheetId: string, row?: number, col?: number): SpreadsheetDocument {
  const sheets = doc.workbook.sheets.map((s) =>
    s.id === sheetId ? { ...s, frozen: { row: row ?? 0, col: col ?? 0 } } : s,
  );
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

function applyUnfreezePanes(doc: SpreadsheetDocument, sheetId: string): SpreadsheetDocument {
  const sheets = doc.workbook.sheets.map((s) =>
    s.id === sheetId ? { ...s, frozen: undefined } : s,
  );
  return { ...doc, workbook: { ...doc.workbook, sheets } };
}

function applyMergeCellsCenter(doc: SpreadsheetDocument, range: SpreadsheetRange): SpreadsheetDocument {
  let result = applyMergeRange(doc, range);
  result = applyCellStyleChange(result, range, { textAlign: 'center', verticalAlign: 'middle' });
  return result;
}

function incrementSeriesValue(value: unknown, step: number): unknown {
  if (typeof value === 'number') {
    return value + step;
  }
  const str = String(value ?? '');
  if (str === '') return value;
  const num = Number(str);
  if (!isNaN(num) && str.trim() !== '') {
    return num + step;
  }
  const match = str.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const digits = match[2];
    const numPart = parseInt(digits, 10);
    const incremented = numPart + step;
    const padded = incremented.toString().padStart(digits.length, '0');
    return prefix + padded;
  }
  return value;
}

function applyFillSeries(
  doc: SpreadsheetDocument,
  range: SpreadsheetRange,
  direction: 'down' | 'right',
): SpreadsheetDocument {
  const normalized = normalizeRange(range);
  const { doc: updated, sheet } = ensureSheetCells(doc, normalized.sheetId);
  let newSheet = sheet;

  if (direction === 'down') {
    for (let c = normalized.startCol; c <= normalized.endCol; c++) {
      const srcCell = newSheet.cells?.[cellAddress(normalized.startRow, c)];
      if (srcCell) {
        for (let r = normalized.startRow + 1; r <= normalized.endRow; r++) {
          const step = r - normalized.startRow;
          const newValue = incrementSeriesValue(srcCell.value, step);
          const key = cellAddress(r, c);
          const existing = newSheet.cells?.[key];
          newSheet = setCell(newSheet, r, c, {
            ...(existing ?? { address: key, row: r, col: c }),
            value: newValue,
            style: srcCell.style,
            address: key,
            row: r,
            col: c,
          });
        }
      }
    }
  } else {
    for (let r = normalized.startRow; r <= normalized.endRow; r++) {
      const srcCell = newSheet.cells?.[cellAddress(r, normalized.startCol)];
      if (srcCell) {
        for (let c = normalized.startCol + 1; c <= normalized.endCol; c++) {
          const step = c - normalized.startCol;
          const newValue = incrementSeriesValue(srcCell.value, step);
          const key = cellAddress(r, c);
          const existing = newSheet.cells?.[key];
          newSheet = setCell(newSheet, r, c, {
            ...(existing ?? { address: key, row: r, col: c }),
            value: newValue,
            style: srcCell.style,
            address: key,
            row: r,
            col: c,
          });
        }
      }
    }
  }

  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === normalized.sheetId ? newSheet : s,
  ) };
  return { ...updated, workbook };
}

// Find operations
function findInDocument(
  doc: SpreadsheetDocument,
  sheetId: string | undefined,
  query: string,
  options: { matchCase?: boolean; matchWholeCell?: boolean; useRegex?: boolean },
  fromRow?: number,
  fromCol?: number,
): import('./commands.js').FindResult | null {
  const sheets = sheetId
    ? doc.workbook.sheets.filter((s) => s.id === sheetId)
    : doc.workbook.sheets;

  for (const sheet of sheets) {
    if (!sheet.cells) continue;
    const entries = Object.entries(sheet.cells);
    for (const [addr, cell] of entries) {
      const value = String(cell.value ?? '');
      let matches = false;
      let matchStart = 0;
      let matchEnd = 0;

      if (options.useRegex) {
        try {
          const regex = new RegExp(query, options.matchCase ? '' : 'i');
          const match = value.match(regex);
          if (match) {
            matches = true;
            matchStart = match.index ?? 0;
            matchEnd = matchStart + match[0].length;
          }
        } catch {
          // Invalid regex, skip
        }
      } else if (options.matchWholeCell) {
        const compareValue = options.matchCase ? value : value.toLowerCase();
        const compareQuery = options.matchCase ? query : query.toLowerCase();
        if (compareValue === compareQuery) {
          matches = true;
          matchStart = 0;
          matchEnd = value.length;
        }
      } else {
        const compareValue = options.matchCase ? value : value.toLowerCase();
        const compareQuery = options.matchCase ? query : query.toLowerCase();
        const idx = compareValue.indexOf(compareQuery);
        if (idx !== -1) {
          matches = true;
          matchStart = idx;
          matchEnd = idx + query.length;
        }
      }

      if (matches) {
        // If from position is specified, skip results before it
        if (fromRow !== undefined && fromCol !== undefined) {
          if (cell.row < fromRow || (cell.row === fromRow && cell.col <= fromCol)) {
            continue;
          }
        }
        return {
          sheetId: sheet.id,
          address: addr,
          row: cell.row,
          col: cell.col,
          value,
          matchStart,
          matchEnd,
        };
      }
    }
  }
  return null;
}

function replaceInDocument(
  doc: SpreadsheetDocument,
  cell: SpreadsheetCellRef,
  query: string,
  replacement: string,
  options: { matchCase?: boolean; matchWholeCell?: boolean },
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  if (!existing) return doc;

  let newValue = String(existing.value ?? '');
  if (options.matchWholeCell) {
    const compareValue = options.matchCase ? newValue : newValue.toLowerCase();
    const compareQuery = options.matchCase ? query : query.toLowerCase();
    if (compareValue === compareQuery) {
      newValue = replacement;
    }
  } else {
    const flags = options.matchCase ? 'g' : 'gi';
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    newValue = newValue.replace(new RegExp(escapedQuery, flags), replacement);
  }

  const newCell = { ...existing, value: newValue };
  const cells = { ...sheet.cells, [key]: newCell };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === cell.sheetId ? { ...s, cells } : s,
  ) };
  return { ...updated, workbook };
}

function replaceAllInDocument(
  doc: SpreadsheetDocument,
  query: string,
  replacement: string,
  options: { matchCase?: boolean; matchWholeCell?: boolean; searchScope?: 'sheet' | 'workbook' },
  sheetId?: string,
): { doc: SpreadsheetDocument; count: number } {
  let count = 0;
  let result = doc;
  const sheets = options.searchScope === 'workbook' || !sheetId
    ? doc.workbook.sheets
    : doc.workbook.sheets.filter((s) => s.id === sheetId);

  for (const sheet of sheets) {
    if (!sheet.cells) continue;
    for (const [addr, cell] of Object.entries(sheet.cells)) {
      const value = String(cell.value ?? '');
      const shouldReplace = options.matchWholeCell
        ? (() => {
        const compareValue = options.matchCase ? value : value.toLowerCase();
        const compareQuery = options.matchCase ? query : query.toLowerCase();
          return compareValue === compareQuery;
        })()
        : (() => {
          const compareValue = options.matchCase ? value : value.toLowerCase();
          const compareQuery = options.matchCase ? query : query.toLowerCase();
          return compareValue.includes(compareQuery);
        })();

      if (shouldReplace) {
        result = replaceInDocument(result, { sheetId: sheet.id, address: addr, row: cell.row, col: cell.col }, query, replacement, options);
        count++;
      }
    }
  }

  return { doc: result, count };
}

// Clipboard operations
function copyRangeToClipboard(
  doc: SpreadsheetDocument,
  sheetId: string,
  range: SpreadsheetRange,
  type: 'copy' | 'cut',
): ClipboardData {
  const sheet = doc.workbook.sheets.find((s) => s.id === sheetId);
  if (!sheet) throw new Error(`Sheet not found: ${sheetId}`);
  const normalized = normalizeRange(range);
  const rows = normalized.endRow - normalized.startRow + 1;
  const cols = normalized.endCol - normalized.startCol + 1;
  const cells: ClipboardCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: ClipboardCell[] = [];
    for (let c = 0; c < cols; c++) {
      const srcCell = sheet.cells?.[cellAddress(normalized.startRow + r, normalized.startCol + c)];
      row.push({
        value: srcCell?.value,
        formula: srcCell?.formula,
        style: srcCell?.style,
        comment: srcCell?.comment,
        linkUrl: srcCell?.linkUrl,
        numberFormat: srcCell?.numberFormat,
      });
    }
    cells.push(row);
  }
  return { type, sourceSheetId: sheetId, range: normalized, cells, timestamp: Date.now() };
}

function applyPasteCells(
  doc: SpreadsheetDocument,
  clipboard: ClipboardData,
  target: SpreadsheetCellRef,
): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, target.sheetId);
  let newSheet = sheet;
  for (let r = 0; r < clipboard.cells.length; r++) {
    for (let c = 0; c < clipboard.cells[r].length; c++) {
      const targetRow = target.row + r;
      const targetCol = target.col + c;
      const srcCell = clipboard.cells[r][c];
      const key = cellAddress(targetRow, targetCol);
      const existing = newSheet.cells?.[key];
      newSheet = setCell(newSheet, targetRow, targetCol, {
        ...(existing ?? { address: key, row: targetRow, col: targetCol }),
        value: srcCell.value,
        formula: srcCell.formula,
        style: srcCell.style,
        comment: srcCell.comment,
        linkUrl: srcCell.linkUrl,
        numberFormat: srcCell.numberFormat,
        address: key,
        row: targetRow,
        col: targetCol,
      });
    }
  }
  if (clipboard.type === 'cut') {
    const srcSheetId = clipboard.sourceSheetId;
    const isSameSheet = srcSheetId === target.sheetId;
    
    if (isSameSheet) {
      // Same sheet: clear from newSheet (which already has pasted values)
      for (let r = clipboard.range.startRow; r <= clipboard.range.endRow; r++) {
        for (let c = clipboard.range.startCol; c <= clipboard.range.endCol; c++) {
          const key = cellAddress(r, c);
          // Only clear if not in the target area
          const pasteEndRow = target.row + clipboard.cells.length - 1;
          const pasteEndCol = target.col + (clipboard.cells[0]?.length ?? 1) - 1;
          if (r < target.row || r > pasteEndRow || c < target.col || c > pasteEndCol) {
            if (newSheet.cells?.[key]) {
              const cells = { ...newSheet.cells };
              delete cells[key];
              newSheet = { ...newSheet, cells };
            }
          }
        }
      }
    } else {
      // Different sheets: clear source sheet
      const srcSheet = updated.workbook.sheets.find((s) => s.id === srcSheetId);
      if (srcSheet) {
        let clearedSheet = srcSheet;
        for (let r = clipboard.range.startRow; r <= clipboard.range.endRow; r++) {
          for (let c = clipboard.range.startCol; c <= clipboard.range.endCol; c++) {
            const key = cellAddress(r, c);
            if (clearedSheet.cells?.[key]) {
              const cells = { ...clearedSheet.cells };
              delete cells[key];
              clearedSheet = { ...clearedSheet, cells };
            }
          }
        }
        const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
          s.id === srcSheetId ? clearedSheet : s.id === target.sheetId ? newSheet : s,
        ) };
        return { ...updated, workbook };
      }
    }
  }
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === target.sheetId ? newSheet : s,
  ) };
  return { ...updated, workbook };
}

function applyClearCells(
  doc: SpreadsheetDocument,
  target: SpreadsheetCellRef | SpreadsheetRange,
  clearValues: boolean,
  clearFormats: boolean,
  clearComments: boolean,
): SpreadsheetDocument {
  if ('startRow' in target) {
    const range = normalizeRange(target as SpreadsheetRange);
    const { doc: updated, sheet } = ensureSheetCells(doc, range.sheetId);
    let newSheet = sheet;
    for (let r = range.startRow; r <= range.endRow; r++) {
      for (let c = range.startCol; c <= range.endCol; c++) {
        const key = cellAddress(r, c);
        const existing = newSheet.cells?.[key];
        if (existing) {
          const cleared: CellDocument = { address: key, row: r, col: c };
          if (!clearValues) {
            cleared.value = existing.value;
            cleared.formula = existing.formula;
          }
          if (!clearFormats) {
            cleared.style = existing.style;
            cleared.styleId = existing.styleId;
          }
          if (!clearComments) {
            cleared.comment = existing.comment;
          }
          newSheet = setCell(newSheet, r, c, cleared);
        }
      }
    }
    const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
      s.id === range.sheetId ? newSheet : s,
    ) };
    return { ...updated, workbook };
  }
  const cell = target as SpreadsheetCellRef;
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  if (existing) {
    const cleared: CellDocument = { address: key, row: cell.row, col: cell.col };
    if (!clearValues) {
      cleared.value = existing.value;
      cleared.formula = existing.formula;
    }
    if (!clearFormats) {
      cleared.style = existing.style;
      cleared.styleId = existing.styleId;
    }
    if (!clearComments) {
      cleared.comment = existing.comment;
    }
    const newSheet = setCell(sheet, cell.row, cell.col, cleared);
    const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
      s.id === cell.sheetId ? newSheet : s,
    ) };
    return { ...updated, workbook };
  }
  return doc;
}

// Insert/Delete row/column
function applyInsertRow(doc: SpreadsheetDocument, sheetId: string, row: number, count: number): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const cells = { ...sheet.cells };
  const rows = { ...sheet.rows };
  const merges = [...(sheet.merges ?? [])];

  // Shift cells down
  const newCells: Record<string, CellDocument> = {};
  for (const [key, cell] of Object.entries(cells)) {
    if (cell.row >= row) {
      const newKey = cellAddress(cell.row + count, cell.col);
      newCells[newKey] = { ...cell, row: cell.row + count, address: newKey };
    } else {
      newCells[key] = cell;
    }
  }

  // Shift rows
  const newRows: Record<string, typeof rows[string]> = {};
  for (const [key, rowDoc] of Object.entries(rows)) {
    if (rowDoc.index >= row) {
      newRows[String(rowDoc.index + count)] = { ...rowDoc, index: rowDoc.index + count };
    } else {
      newRows[key] = rowDoc;
    }
  }

  // Shift merges
  const newMerges = merges.map((m) => ({
    ...m,
    startRow: m.startRow >= row ? m.startRow + count : m.startRow,
    endRow: m.endRow >= row ? m.endRow + count : m.endRow,
  }));

  const newSheet = { ...sheet, cells: newCells, rows: newRows, merges: newMerges };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === sheetId ? newSheet : s,
  ) };
  return { ...updated, workbook };
}

function applyInsertColumn(doc: SpreadsheetDocument, sheetId: string, col: number, count: number): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const cells = { ...sheet.cells };
  const columns = { ...sheet.columns };
  const merges = [...(sheet.merges ?? [])];

  // Shift cells right
  const newCells: Record<string, CellDocument> = {};
  for (const [key, cell] of Object.entries(cells)) {
    if (cell.col >= col) {
      const newKey = cellAddress(cell.row, cell.col + count);
      newCells[newKey] = { ...cell, col: cell.col + count, address: newKey };
    } else {
      newCells[key] = cell;
    }
  }

  // Shift columns
  const newColumns: Record<string, typeof columns[string]> = {};
  for (const [key, colDoc] of Object.entries(columns)) {
    if (colDoc.index >= col) {
      newColumns[String(colDoc.index + count)] = { ...colDoc, index: colDoc.index + count };
    } else {
      newColumns[key] = colDoc;
    }
  }

  // Shift merges
  const newMerges = merges.map((m) => ({
    ...m,
    startCol: m.startCol >= col ? m.startCol + count : m.startCol,
    endCol: m.endCol >= col ? m.endCol + count : m.endCol,
  }));

  const newSheet = { ...sheet, cells: newCells, columns: newColumns, merges: newMerges };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === sheetId ? newSheet : s,
  ) };
  return { ...updated, workbook };
}

function applyDeleteRow(doc: SpreadsheetDocument, sheetId: string, row: number, count: number): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const cells = { ...sheet.cells };
  const rows = { ...sheet.rows };
  const merges = [...(sheet.merges ?? [])];

  // Remove cells in deleted rows and shift remaining cells up
  const newCells: Record<string, CellDocument> = {};
  for (const [key, cell] of Object.entries(cells)) {
    if (cell.row < row) {
      newCells[key] = cell;
    } else if (cell.row >= row + count) {
      const newKey = cellAddress(cell.row - count, cell.col);
      newCells[newKey] = { ...cell, row: cell.row - count, address: newKey };
    }
  }

  // Remove/shift rows
  const newRows: Record<string, typeof rows[string]> = {};
  for (const [key, rowDoc] of Object.entries(rows)) {
    if (rowDoc.index < row) {
      newRows[key] = rowDoc;
    } else if (rowDoc.index >= row + count) {
      newRows[String(rowDoc.index - count)] = { ...rowDoc, index: rowDoc.index - count };
    }
  }

  // Remove/shift merges
  const newMerges = merges
    .filter((m) => m.startRow < row || m.startRow >= row + count)
    .map((m) => ({
      ...m,
      startRow: m.startRow >= row + count ? m.startRow - count : m.startRow,
      endRow: m.endRow >= row + count ? m.endRow - count : m.endRow,
    }));

  const newSheet = { ...sheet, cells: newCells, rows: newRows, merges: newMerges };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === sheetId ? newSheet : s,
  ) };
  return { ...updated, workbook };
}

function applyDeleteColumn(doc: SpreadsheetDocument, sheetId: string, col: number, count: number): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, sheetId);
  const cells = { ...sheet.cells };
  const columns = { ...sheet.columns };
  const merges = [...(sheet.merges ?? [])];

  // Remove cells in deleted columns and shift remaining cells left
  const newCells: Record<string, CellDocument> = {};
  for (const [key, cell] of Object.entries(cells)) {
    if (cell.col < col) {
      newCells[key] = cell;
    } else if (cell.col >= col + count) {
      const newKey = cellAddress(cell.row, cell.col - count);
      newCells[newKey] = { ...cell, col: cell.col - count, address: newKey };
    }
  }

  // Remove/shift columns
  const newColumns: Record<string, typeof columns[string]> = {};
  for (const [key, colDoc] of Object.entries(columns)) {
    if (colDoc.index < col) {
      newColumns[key] = colDoc;
    } else if (colDoc.index >= col + count) {
      newColumns[String(colDoc.index - count)] = { ...colDoc, index: colDoc.index - count };
    }
  }

  // Remove/shift merges
  const newMerges = merges
    .filter((m) => m.startCol < col || m.startCol >= col + count)
    .map((m) => ({
      ...m,
      startCol: m.startCol >= col + count ? m.startCol - count : m.startCol,
      endCol: m.endCol >= col + count ? m.endCol - count : m.endCol,
    }));

  const newSheet = { ...sheet, cells: newCells, columns: newColumns, merges: newMerges };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === sheetId ? newSheet : s,
  ) };
  return { ...updated, workbook };
}

// Fill operations
function applyFillDown(doc: SpreadsheetDocument, range: SpreadsheetRange): SpreadsheetDocument {
  const normalized = normalizeRange(range);
  const { doc: updated, sheet } = ensureSheetCells(doc, normalized.sheetId);
  let newSheet = sheet;
  for (let c = normalized.startCol; c <= normalized.endCol; c++) {
    const srcCell = newSheet.cells?.[cellAddress(normalized.startRow, c)];
    if (srcCell) {
      for (let r = normalized.startRow + 1; r <= normalized.endRow; r++) {
        newSheet = setCell(newSheet, r, c, {
          ...srcCell,
          address: cellAddress(r, c),
          row: r,
          col: c,
        });
      }
    }
  }
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === normalized.sheetId ? newSheet : s,
  ) };
  return { ...updated, workbook };
}

function applyFillRight(doc: SpreadsheetDocument, range: SpreadsheetRange): SpreadsheetDocument {
  const normalized = normalizeRange(range);
  const { doc: updated, sheet } = ensureSheetCells(doc, normalized.sheetId);
  let newSheet = sheet;
  for (let r = normalized.startRow; r <= normalized.endRow; r++) {
    const srcCell = newSheet.cells?.[cellAddress(r, normalized.startCol)];
    if (srcCell) {
      for (let c = normalized.startCol + 1; c <= normalized.endCol; c++) {
        newSheet = setCell(newSheet, r, c, {
          ...srcCell,
          address: cellAddress(r, c),
          row: r,
          col: c,
        });
      }
    }
  }
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === normalized.sheetId ? newSheet : s,
  ) };
  return { ...updated, workbook };
}

// Comment operations
function applyAddComment(doc: SpreadsheetDocument, cell: SpreadsheetCellRef, text: string, author?: string): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  const newCell: CellDocument = {
    ...(existing ?? { address: key, row: cell.row, col: cell.col }),
    comment: { text, author, createdAt: new Date().toISOString() },
    address: key,
    row: cell.row,
    col: cell.col,
  };
  const cells = { ...sheet.cells, [key]: newCell };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === cell.sheetId ? { ...s, cells } : s,
  ) };
  return { ...updated, workbook };
}

function applyEditComment(doc: SpreadsheetDocument, cell: SpreadsheetCellRef, text: string): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  if (!existing?.comment) return doc;
  const existingComment = typeof existing.comment === 'string'
    ? { text: existing.comment }
    : existing.comment;
  const newCell: CellDocument = {
    ...existing,
    comment: { ...existingComment, text },
  };
  const cells = { ...sheet.cells, [key]: newCell };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === cell.sheetId ? { ...s, cells } : s,
  ) };
  return { ...updated, workbook };
}

function applyDeleteComment(doc: SpreadsheetDocument, cell: SpreadsheetCellRef): SpreadsheetDocument {
  const { doc: updated, sheet } = ensureSheetCells(doc, cell.sheetId);
  const key = cellAddress(cell.row, cell.col);
  const existing = sheet.cells?.[key];
  if (!existing) return doc;
  const newCell: CellDocument = { ...existing };
  delete newCell.comment;
  const cells = { ...sheet.cells, [key]: newCell };
  const workbook = { ...updated.workbook, sheets: updated.workbook.sheets.map((s) =>
    s.id === cell.sheetId ? { ...s, cells } : s,
  ) };
  return { ...updated, workbook };
}

function pushUndo(state: SpreadsheetInternalState): SpreadsheetInternalState {
  const maxDepth = 100;
  const undoStack = [...state.undoStack, state.document];
  if (undoStack.length > maxDepth) {
    undoStack.shift();
  }
  return { ...state, undoStack, redoStack: [] };
}

export function createSpreadsheetCore(
  options: CreateSpreadsheetCoreOptions,
): SpreadsheetCore {
  const { document, readonly = false } = options;
  const firstSheetId = document.workbook.sheets[0]?.id ?? '';

  const store = createStore<SpreadsheetInternalState>(() => ({
    document,
    activeSheetId: firstSheetId,
    selection: { kind: 'none' },
    editing: undefined,
    viewport: createDefaultViewport(),
    readonly,
    dirty: false,
    undoStack: [],
    redoStack: [],
    transactionDoc: null,
    clipboard: null,
  }));
  let cachedState = store.getState();
  let cachedSnapshot = buildSnapshot(cachedState);

  async function dispatch(command: SpreadsheetCommand): Promise<SpreadsheetCommandResult> {
    const state = store.getState();
    const readOnlyCommands = new Set([
      'spreadsheet:setActiveSheet', 'spreadsheet:setSelection',
      'spreadsheet:copyCells', 'spreadsheet:selectAll',
      'spreadsheet:selectRow', 'spreadsheet:selectColumn',
      'spreadsheet:undo', 'spreadsheet:redo',
    ]);
    if (state.readonly && !readOnlyCommands.has(command.type)) {
      return { ok: false, changed: false, error: 'Document is readonly' };
    }

    try {
      switch (command.type) {
        case 'spreadsheet:setActiveSheet': {
          const sheet = state.document.workbook.sheets.find((s) => s.id === command.sheetId);
          if (!sheet) return { ok: false, changed: false, error: `Sheet not found: ${command.sheetId}` };
          store.setState({ activeSheetId: command.sheetId, selection: { kind: 'none' }, editing: undefined });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setSelection': {
          store.setState({ selection: command.selection, editing: undefined });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellValue': {
          const nextDoc = applySetCellValue(state.document, command.cell, command.value);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellFormula': {
          const nextDoc = applySetCellFormula(state.document, command.cell, command.formula);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellStyle': {
          const nextDoc = applySetCellStyle(state.document, command.target, command.styleId);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:resizeRow': {
          const nextDoc = applyResizeRow(state.document, command.sheetId, command.row, command.height);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:resizeColumn': {
          const nextDoc = applyResizeColumn(state.document, command.sheetId, command.col, command.width);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:mergeRange': {
          const nextDoc = applyMergeRange(state.document, command.range);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:unmergeRange': {
          const nextDoc = applyUnmergeRange(state.document, command.range);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:hideRow': {
          const nextDoc = applyHideRow(state.document, command.sheetId, command.row, command.hidden);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:hideColumn': {
          const nextDoc = applyHideColumn(state.document, command.sheetId, command.col, command.hidden);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:addSheet': {
          const nextDoc = applyAddSheet(state.document, command.name, command.index);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:removeSheet': {
          const nextDoc = applyRemoveSheet(state.document, command.sheetId);
          const updated = pushUndo(store.getState());
          let activeSheetId = state.activeSheetId;
          if (activeSheetId === command.sheetId) {
            activeSheetId = nextDoc.workbook.sheets[0]?.id ?? '';
          }
          store.setState({ ...updated, document: nextDoc, activeSheetId, selection: { kind: 'none' }, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:renameSheet': {
          const nextDoc = applyRenameSheet(state.document, command.sheetId, command.name);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:moveSheet': {
          const nextDoc = applyMoveSheet(state.document, command.sheetId, command.targetIndex);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:beginTransaction': {
          store.setState({ transactionDoc: state.document });
          return { ok: true, changed: false };
        }

        case 'spreadsheet:commitTransaction': {
          if (state.transactionDoc) {
            const updated = pushUndo(store.getState());
            store.setState({ ...updated, transactionDoc: null });
          }
          return { ok: true, changed: false };
        }

        case 'spreadsheet:rollbackTransaction': {
          if (state.transactionDoc) {
            store.setState({ document: state.transactionDoc, transactionDoc: null });
          }
          return { ok: true, changed: true };
        }

        case 'spreadsheet:undo': {
          const current = store.getState();
          if (current.undoStack.length === 0) return { ok: false, changed: false, error: 'Nothing to undo' };
          const prevDoc = current.undoStack[current.undoStack.length - 1];
          const undoStack = current.undoStack.slice(0, -1);
          store.setState({
            document: prevDoc,
            undoStack,
            redoStack: [...current.redoStack, current.document],
            dirty: true,
          });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:redo': {
          const current = store.getState();
          if (current.redoStack.length === 0) return { ok: false, changed: false, error: 'Nothing to redo' };
          const nextDoc = current.redoStack[current.redoStack.length - 1];
          const redoStack = current.redoStack.slice(0, -1);
          store.setState({
            document: nextDoc,
            undoStack: [...current.undoStack, current.document],
            redoStack,
            dirty: true,
          });
          return { ok: true, changed: true };
        }

        // Clipboard commands
        case 'spreadsheet:copyCells': {
          const clipboard = copyRangeToClipboard(state.document, command.range.sheetId, command.range, 'copy');
          store.setState({ clipboard });
          return { ok: true, changed: false, data: clipboard };
        }

        case 'spreadsheet:cutCells': {
          const clipboard = copyRangeToClipboard(state.document, command.range.sheetId, command.range, 'cut');
          store.setState({ clipboard });
          return { ok: true, changed: false, data: clipboard };
        }

        case 'spreadsheet:pasteCells': {
          if (!state.clipboard) return { ok: false, changed: false, error: 'Clipboard is empty' };
          const nextDoc = applyPasteCells(state.document, state.clipboard, command.target);
          const updated = pushUndo(store.getState());
          const newClipboard = state.clipboard.type === 'cut' ? null : state.clipboard;
          store.setState({ ...updated, document: nextDoc, clipboard: newClipboard, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:clearCells': {
          const nextDoc = applyClearCells(
            state.document,
            command.target,
            command.clearValues ?? true,
            command.clearFormats ?? false,
            command.clearComments ?? false,
          );
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        // Insert/Delete row/column
        case 'spreadsheet:insertRow': {
          const nextDoc = applyInsertRow(state.document, command.sheetId, command.row, command.count ?? 1);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:insertColumn': {
          const nextDoc = applyInsertColumn(state.document, command.sheetId, command.col, command.count ?? 1);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:deleteRow': {
          const nextDoc = applyDeleteRow(state.document, command.sheetId, command.row, command.count ?? 1);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:deleteColumn': {
          const nextDoc = applyDeleteColumn(state.document, command.sheetId, command.col, command.count ?? 1);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        // Selection
        case 'spreadsheet:selectAll': {
          store.setState({
            selection: {
              kind: 'sheet',
              sheetId: command.sheetId,
            },
          });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:selectRow': {
          const current = state.selection;
          if (command.extend && current.kind === 'row' && current.sheetId === command.sheetId && current.rows) {
            const rows = [...new Set([...current.rows, command.row])].sort((a, b) => a - b);
            store.setState({ selection: { kind: 'row', sheetId: command.sheetId, rows } });
          } else {
            store.setState({ selection: { kind: 'row', sheetId: command.sheetId, rows: [command.row] } });
          }
          return { ok: true, changed: true };
        }

        case 'spreadsheet:selectColumn': {
          const current = state.selection;
          if (command.extend && current.kind === 'column' && current.sheetId === command.sheetId && current.columns) {
            const columns = [...new Set([...current.columns, command.col])].sort((a, b) => a - b);
            store.setState({ selection: { kind: 'column', sheetId: command.sheetId, columns } });
          } else {
            store.setState({ selection: { kind: 'column', sheetId: command.sheetId, columns: [command.col] } });
          }
          return { ok: true, changed: true };
        }

        // Cell style commands
        case 'spreadsheet:setCellFontFamily': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { fontFamily: command.fontFamily });
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellFontSize': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { fontSize: command.fontSize });
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellFontWeight': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { fontWeight: command.fontWeight });
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellFontStyle': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { fontStyle: command.fontStyle });
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellTextDecoration': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { textDecoration: command.textDecoration });
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellFontColor': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { fontColor: command.color });
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellBackgroundColor': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { backgroundColor: command.color });
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellBorder': {
          const borderPatch: Partial<CellStyle> = { borderStyle: command.border };
          if (command.color) borderPatch.borderColor = command.color;
          if (command.width) borderPatch.borderWidth = command.width;
          const nextDoc = applyCellStyleChange(state.document, command.target, borderPatch);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellTextAlign': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { textAlign: command.textAlign });
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellVerticalAlign': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { verticalAlign: command.verticalAlign });
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellWrapText': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { wrapText: command.wrapText });
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellNumberFormat': {
          const nextDoc = applyCellStyleChange(state.document, command.target, {});
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        // Fill
        case 'spreadsheet:fillDown': {
          const nextDoc = applyFillDown(state.document, command.range);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:fillRight': {
          const nextDoc = applyFillRight(state.document, command.range);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        // Comments
        case 'spreadsheet:addComment': {
          const nextDoc = applyAddComment(state.document, command.cell, command.text, command.author);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:editComment': {
          const nextDoc = applyEditComment(state.document, command.cell, command.text);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:deleteComment': {
          const nextDoc = applyDeleteComment(state.document, command.cell);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        // P1/P2 Sheet operations
        case 'spreadsheet:copySheet': {
          const nextDoc = applyCopySheet(state.document, command.sheetId, command.name);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setSheetTabColor': {
          const nextDoc = applySetSheetTabColor(state.document, command.sheetId, command.color);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:hideSheet': {
          const nextDoc = applyHideSheet(state.document, command.sheetId, command.hidden);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:protectSheet': {
          const nextDoc = applyProtectSheet(state.document, command.sheetId, command.password, command.options);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        // Auto-fit (placeholder - actual measurement needs UI)
        case 'spreadsheet:autoFitRow': {
          return { ok: false, changed: false, error: new Error('autoFitRow requires host measurement support') };
        }

        case 'spreadsheet:autoFitColumn': {
          return { ok: false, changed: false, error: new Error('autoFitColumn requires host measurement support') };
        }

        // Merge options
        case 'spreadsheet:mergeCellsCenter': {
          const nextDoc = applyMergeCellsCenter(state.document, command.range);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        // Freeze panes
        case 'spreadsheet:freezePanes': {
          const nextDoc = applyFreezePanes(state.document, command.sheetId, command.row, command.col);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:unfreezePanes': {
          const nextDoc = applyUnfreezePanes(state.document, command.sheetId);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        // Fill series
        case 'spreadsheet:fillSeries': {
          const nextDoc = applyFillSeries(state.document, command.range, command.direction);
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        // Find/Replace
        case 'spreadsheet:find': {
          const result = findInDocument(
            state.document,
            command.options.searchScope === 'sheet' ? state.activeSheetId : undefined,
            command.options.query,
            command.options,
          );
          return { ok: result !== null, changed: false, data: result };
        }

        case 'spreadsheet:findNext': {
          const fromRow = command.from?.row;
          const fromCol = command.from?.col;
          const result = findInDocument(
            state.document,
            command.options.searchScope === 'sheet' ? state.activeSheetId : undefined,
            command.options.query,
            command.options,
            fromRow,
            fromCol,
          );
          return { ok: result !== null, changed: false, data: result };
        }

        case 'spreadsheet:replace': {
          const nextDoc = replaceInDocument(
            state.document,
            command.cell,
            command.options.query,
            command.replacement,
            command.options,
          );
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true };
        }

        case 'spreadsheet:replaceAll': {
          const { doc: nextDoc, count } = replaceAllInDocument(
            state.document,
            command.options.query,
            command.replacement,
            command.options,
            state.activeSheetId,
          );
          const updated = pushUndo(store.getState());
          store.setState({ ...updated, document: nextDoc, dirty: true });
          return { ok: true, changed: true, data: { count } };
        }

        default:
          return { ok: false, changed: false, error: `Unknown command: ${(command as any).type}` };
      }
    } catch (err) {
      return { ok: false, changed: false, error: err };
    }
  }

  return {
    getSnapshot() {
      const state = store.getState();
      if (state !== cachedState) {
        cachedState = state;
        cachedSnapshot = buildSnapshot(state);
      }
      return cachedSnapshot;
    },

    subscribe(listener: () => void) {
      return store.subscribe(listener);
    },

    dispatch,

    replaceDocument(nextDocument: SpreadsheetDocument) {
      const activeSheetId = nextDocument.workbook.sheets[0]?.id ?? '';
      store.setState({
        document: nextDocument,
        activeSheetId,
        selection: { kind: 'none' },
        editing: undefined,
        dirty: false,
        undoStack: [],
        redoStack: [],
      });
    },

    exportDocument() {
      return store.getState().document;
    },

    getClipboard() {
      return store.getState().clipboard;
    },
  };
}
