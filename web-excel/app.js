const STORAGE_KEY = 'web-excel-state-v3';
const LEGACY_STORAGE_KEYS = ['web-excel-state-v2', 'web-excel-state-v1'];
const DEFAULT_ROWS = 30;
const DEFAULT_COLS = 16;
const MAX_ROWS = 200;
const MAX_COLS = 52;
const DEFAULT_COL_WIDTH = 120;
const DEFAULT_ROW_HEIGHT = 36;
const MIN_COL_WIDTH = 64;
const MIN_ROW_HEIGHT = 24;

const state = loadState();
const ui = {
  selecting: false,
  resizing: null,
};

const sheetWrap = document.querySelector('#sheet-wrap');
const sheetCanvas = document.querySelector('#sheet-canvas');
const grid = document.querySelector('#grid');
const selectionOverlay = document.querySelector('#selection-overlay');
const formulaInput = document.querySelector('#formula-input');
const activeCellLabel = document.querySelector('#active-cell-label');
const rowsInput = document.querySelector('#rows-input');
const colsInput = document.querySelector('#cols-input');
const statusText = document.querySelector('#status-text');
const importInput = document.querySelector('#import-input');
const sheetTabs = document.querySelector('#sheet-tabs');

const fontSizeSelect = document.querySelector('#font-size-select');
const textColorInput = document.querySelector('#text-color-input');
const fillColorInput = document.querySelector('#fill-color-input');
const boldBtn = document.querySelector('#bold-btn');
const italicBtn = document.querySelector('#italic-btn');
const underlineBtn = document.querySelector('#underline-btn');

syncSheetControls();
renderSheetTabs();
renderGrid();
syncFormulaBar();
syncToolbarFromSelection();
setStatus('已载入');

document.querySelector('#save-btn').addEventListener('click', saveToLocal);
document.querySelector('#new-sheet-btn').addEventListener('click', resetWorkbook);
document.querySelector('#resize-btn').addEventListener('click', resizeSheetDimensions);
document.querySelector('#export-json-btn').addEventListener('click', exportJson);
document.querySelector('#export-csv-btn').addEventListener('click', exportCsv);
document.querySelector('#add-sheet-btn').addEventListener('click', addSheet);
document.querySelector('#remove-sheet-btn').addEventListener('click', removeCurrentSheet);
document.querySelector('#clear-style-btn').addEventListener('click', clearSelectionStyles);
formulaInput.addEventListener('keydown', onFormulaKeydown);
formulaInput.addEventListener('blur', commitFormulaBar);
importInput.addEventListener('change', importJson);
sheetWrap.addEventListener('keydown', onGridKeydown);
sheetWrap.addEventListener('copy', onCopy);
sheetWrap.addEventListener('cut', onCut);
sheetWrap.addEventListener('paste', onPaste);
sheetWrap.addEventListener('mousedown', () => sheetWrap.focus());
grid.addEventListener('mousedown', onGridMouseDown);
grid.addEventListener('dblclick', onGridDoubleClick);
document.addEventListener('mousemove', onDocumentMouseMove);
document.addEventListener('mouseup', onDocumentMouseUp);

fontSizeSelect.addEventListener('change', () => applyStyleToSelection({ fontSize: Number(fontSizeSelect.value) || 14 }));
textColorInput.addEventListener('input', () => applyStyleToSelection({ color: textColorInput.value }));
fillColorInput.addEventListener('input', () => applyStyleToSelection({ background: fillColorInput.value }));
boldBtn.addEventListener('click', () => toggleStyleFlag('bold'));
italicBtn.addEventListener('click', () => toggleStyleFlag('italic'));
underlineBtn.addEventListener('click', () => toggleStyleFlag('underline'));

document.querySelectorAll('[data-align]').forEach((button) => {
  button.addEventListener('click', () => applyStyleToSelection({ align: button.dataset.align }));
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? loadLegacyState();
    if (!raw) {
      return createEmptyWorkbook();
    }
    return normalizeWorkbook(JSON.parse(raw));
  } catch {
    return createEmptyWorkbook();
  }
}

function loadLegacyState() {
  for (const key of LEGACY_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      return raw;
    }
  }
  return null;
}

function createEmptyWorkbook() {
  const sheet = createSheet('sheet-1', 'Sheet1', DEFAULT_ROWS, DEFAULT_COLS);
  return {
    sheets: [sheet],
    activeSheetId: sheet.id,
  };
}

function createSheet(id, name, rows, cols) {
  return {
    id,
    name,
    rows,
    cols,
    cells: {},
    colWidths: Array(cols).fill(DEFAULT_COL_WIDTH),
    rowHeights: Array(rows).fill(DEFAULT_ROW_HEIGHT),
    activeCell: 'A1',
    selectionStart: 'A1',
    selectionEnd: 'A1',
  };
}

function normalizeWorkbook(source) {
  if (Array.isArray(source?.sheets) && source.sheets.length > 0) {
    const sheets = source.sheets.map((sheet, index) => normalizeSheet(sheet, index));
    return {
      sheets,
      activeSheetId: sheets.some((sheet) => sheet.id === source?.activeSheetId) ? source.activeSheetId : sheets[0].id,
    };
  }

  const legacyRows = clampNumber(source?.rows, 5, MAX_ROWS, DEFAULT_ROWS);
  const legacyCols = clampNumber(source?.cols, 5, MAX_COLS, DEFAULT_COLS);
  const legacySheet = createSheet('sheet-1', 'Sheet1', legacyRows, legacyCols);
  legacySheet.cells = normalizeCells(source?.cells);
  legacySheet.activeCell = isValidCellIdForSize(source?.activeCell, legacyRows, legacyCols) ? source.activeCell : 'A1';
  legacySheet.selectionStart = legacySheet.activeCell;
  legacySheet.selectionEnd = legacySheet.activeCell;
  return {
    sheets: [legacySheet],
    activeSheetId: legacySheet.id,
  };
}

function normalizeSheet(sheet, index) {
  const rows = clampNumber(sheet?.rows, 5, MAX_ROWS, DEFAULT_ROWS);
  const cols = clampNumber(sheet?.cols, 5, MAX_COLS, DEFAULT_COLS);
  const activeCell = isValidCellIdForSize(sheet?.activeCell, rows, cols) ? sheet.activeCell : 'A1';
  const selectionStart = isValidCellIdForSize(sheet?.selectionStart, rows, cols) ? sheet.selectionStart : activeCell;
  const selectionEnd = isValidCellIdForSize(sheet?.selectionEnd, rows, cols) ? sheet.selectionEnd : activeCell;
  return {
    id: typeof sheet?.id === 'string' && sheet.id ? sheet.id : `sheet-${index + 1}`,
    name: typeof sheet?.name === 'string' && sheet.name.trim() ? sheet.name.trim() : `Sheet${index + 1}`,
    rows,
    cols,
    cells: normalizeCells(sheet?.cells),
    colWidths: normalizeDimensionArray(sheet?.colWidths, cols, DEFAULT_COL_WIDTH, MIN_COL_WIDTH),
    rowHeights: normalizeDimensionArray(sheet?.rowHeights, rows, DEFAULT_ROW_HEIGHT, MIN_ROW_HEIGHT),
    activeCell,
    selectionStart,
    selectionEnd,
  };
}

function normalizeCells(cells) {
  if (!cells || typeof cells !== 'object') {
    return {};
  }

  const normalized = {};
  Object.entries(cells).forEach(([cellId, value]) => {
    const cell = normalizeCellRecord(value);
    if (cell) {
      normalized[cellId] = cell;
    }
  });
  return normalized;
}

function normalizeCellRecord(value) {
  if (typeof value === 'string') {
    return value ? { raw: value, style: {} } : null;
  }

  const raw = typeof value?.raw === 'string' ? value.raw : '';
  const style = normalizeCellStyle(value?.style);
  return raw || hasStyle(style) ? { raw, style } : null;
}

function normalizeCellStyle(style) {
  if (!style || typeof style !== 'object') {
    return {};
  }

  const normalized = {};
  if (style.bold) normalized.bold = true;
  if (style.italic) normalized.italic = true;
  if (style.underline) normalized.underline = true;
  if (style.align === 'left' || style.align === 'center' || style.align === 'right') normalized.align = style.align;
  if (typeof style.color === 'string' && style.color) normalized.color = style.color;
  if (typeof style.background === 'string' && style.background) normalized.background = style.background;
  if (Number.isFinite(Number(style.fontSize))) normalized.fontSize = clampNumber(style.fontSize, 10, 32, 14);
  return normalized;
}

function normalizeDimensionArray(value, length, fallback, min) {
  const source = Array.isArray(value) ? value : [];
  const result = [];
  for (let index = 0; index < length; index += 1) {
    const next = Number(source[index]);
    result.push(Number.isFinite(next) ? Math.max(min, Math.floor(next)) : fallback);
  }
  return result;
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(numeric)));
}

function getActiveSheet() {
  return state.sheets.find((sheet) => sheet.id === state.activeSheetId) ?? state.sheets[0];
}

function syncSheetControls() {
  const sheet = getActiveSheet();
  rowsInput.value = String(sheet.rows);
  colsInput.value = String(sheet.cols);
}

function renderSheetTabs() {
  sheetTabs.innerHTML = '';
  state.sheets.forEach((sheet) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `sheet-tab${sheet.id === state.activeSheetId ? ' active' : ''}`;
    button.textContent = sheet.name;
    button.addEventListener('click', () => switchSheet(sheet.id));
    button.addEventListener('dblclick', () => renameSheet(sheet.id));
    sheetTabs.appendChild(button);
  });
}

function renderGrid() {
  const sheet = getActiveSheet();
  grid.innerHTML = '';
  updateGridMetrics();

  const corner = document.createElement('div');
  corner.className = 'corner';
  corner.addEventListener('mousedown', (event) => {
    event.preventDefault();
    selectWholeSheet();
  });
  grid.appendChild(corner);

  for (let col = 0; col < sheet.cols; col += 1) {
    const header = document.createElement('div');
    header.className = 'col-header';
    header.dataset.colIndex = String(col);

    const label = document.createElement('span');
    label.textContent = columnLabel(col);
    header.appendChild(label);

    const resizer = document.createElement('div');
    resizer.className = 'col-resizer';
    resizer.addEventListener('mousedown', (event) => startResize(event, 'col', col));
    header.appendChild(resizer);

    header.addEventListener('mousedown', (event) => {
      if (event.target === resizer) {
        return;
      }
      event.preventDefault();
      selectColumn(col);
    });

    grid.appendChild(header);
  }

  for (let row = 1; row <= sheet.rows; row += 1) {
    const rowHeader = document.createElement('div');
    rowHeader.className = 'row-header';
    rowHeader.dataset.rowIndex = String(row);

    const label = document.createElement('span');
    label.textContent = String(row);
    rowHeader.appendChild(label);

    const resizer = document.createElement('div');
    resizer.className = 'row-resizer';
    resizer.addEventListener('mousedown', (event) => startResize(event, 'row', row - 1));
    rowHeader.appendChild(resizer);

    rowHeader.addEventListener('mousedown', (event) => {
      if (event.target === resizer) {
        return;
      }
      event.preventDefault();
      selectRow(row);
    });

    grid.appendChild(rowHeader);

    for (let col = 0; col < sheet.cols; col += 1) {
      const cellId = `${columnLabel(col)}${row}`;
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.cellId = cellId;
      cell.tabIndex = -1;

      const content = document.createElement('div');
      content.className = 'cell-display';
      cell.appendChild(content);
      grid.appendChild(cell);
    }
  }

  refreshGridData();
}

function updateGridMetrics() {
  const sheet = getActiveSheet();
  grid.style.gridTemplateColumns = `56px ${sheet.colWidths.map((width) => `${width}px`).join(' ')}`;
  grid.style.gridTemplateRows = `36px ${sheet.rowHeights.map((height) => `${height}px`).join(' ')}`;
}

function refreshGridData() {
  const sheet = getActiveSheet();
  grid.querySelectorAll('.cell').forEach((cell) => {
    const cellId = cell.dataset.cellId;
    applyCellPresentation(sheet, cell, cellId);
  });
  updateSelectionUI();
  syncFormulaBar();
  syncToolbarFromSelection();
}

function applyCellPresentation(sheet, cell, cellId) {
  const content = cell.querySelector('.cell-display');
  const record = sheet.cells[cellId];
  const style = record?.style ?? {};
  content.textContent = getDisplayValue(sheet, cellId, new Set([cellId]));
  cell.classList.toggle('formula', (record?.raw ?? '').startsWith('='));
  content.style.fontWeight = style.bold ? '700' : '400';
  content.style.fontStyle = style.italic ? 'italic' : 'normal';
  content.style.textDecoration = style.underline ? 'underline' : 'none';
  content.style.textAlign = style.align ?? 'left';
  content.style.color = style.color ?? '';
  content.style.backgroundColor = style.background ?? '';
  content.style.fontSize = `${style.fontSize ?? 14}px`;
}

function getDisplayValue(sheet, cellId, visited) {
  const raw = sheet.cells[cellId]?.raw ?? '';
  if (!raw.startsWith('=')) {
    return raw;
  }
  return evaluateFormula(sheet, raw.slice(1), visited);
}

function evaluateFormula(sheet, expression, visited) {
  try {
    let prepared = expression;

    prepared = prepared.replace(/(SUM|AVG|MIN|MAX|COUNT)\(([A-Z]+\d+):([A-Z]+\d+)\)/gi, (_, fnName, start, end) => {
      const values = getRangeValues(sheet, start, end, visited);
      return String(applyRangeFunction(fnName.toUpperCase(), values));
    });

    const replaced = prepared.replace(/[A-Z]+\d+/g, (ref) => {
      if (!isValidCellIdForSize(ref, sheet.rows, sheet.cols)) {
        return '0';
      }
      if (visited.has(ref)) {
        throw new Error('circular');
      }
      const nextVisited = new Set(visited);
      nextVisited.add(ref);
      const value = getDisplayValue(sheet, ref, nextVisited);
      const numeric = Number(value);
      return Number.isFinite(numeric) ? String(numeric) : '0';
    });

    const value = Function(`"use strict"; return (${replaced});`)();
    return value == null ? '' : String(value);
  } catch {
    return '#ERROR';
  }
}

function getRangeValues(sheet, startCellId, endCellId, visited) {
  const start = parseCellId(startCellId);
  const end = parseCellId(endCellId);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const values = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const cellId = `${columnLabel(col)}${row}`;
      if (visited.has(cellId)) {
        throw new Error('circular');
      }
      const nextVisited = new Set(visited);
      nextVisited.add(cellId);
      const numeric = Number(getDisplayValue(sheet, cellId, nextVisited));
      if (Number.isFinite(numeric)) {
        values.push(numeric);
      }
    }
  }

  return values;
}

function applyRangeFunction(fnName, values) {
  if (fnName === 'COUNT') return values.length;
  if (values.length === 0) return 0;
  if (fnName === 'SUM') return values.reduce((total, value) => total + value, 0);
  if (fnName === 'AVG') return values.reduce((total, value) => total + value, 0) / values.length;
  if (fnName === 'MIN') return Math.min(...values);
  if (fnName === 'MAX') return Math.max(...values);
  return 0;
}

function onGridMouseDown(event) {
  const cell = event.target.closest('.cell');
  if (!cell || ui.resizing) {
    return;
  }

  event.preventDefault();
  const cellId = cell.dataset.cellId;
  const sheet = getActiveSheet();

  if (event.shiftKey) {
    sheet.selectionEnd = cellId;
    sheet.activeCell = cellId;
  } else {
    sheet.selectionStart = cellId;
    sheet.selectionEnd = cellId;
    sheet.activeCell = cellId;
  }

  ui.selecting = true;
  updateSelectionUI();
  syncFormulaBar();
  syncToolbarFromSelection();
  sheetWrap.focus();
}

function onGridDoubleClick(event) {
  const cell = event.target.closest('.cell');
  if (!cell) {
    return;
  }
  formulaInput.focus();
  formulaInput.select();
}

function onDocumentMouseMove(event) {
  if (ui.resizing) {
    performResize(event);
    return;
  }

  if (!ui.selecting) {
    return;
  }

  const element = document.elementFromPoint(event.clientX, event.clientY);
  const cell = element?.closest('.cell');
  if (!cell) {
    return;
  }

  const sheet = getActiveSheet();
  sheet.selectionEnd = cell.dataset.cellId;
  sheet.activeCell = cell.dataset.cellId;
  updateSelectionUI();
  syncFormulaBar();
  syncToolbarFromSelection();
}

function onDocumentMouseUp() {
  ui.selecting = false;
  if (ui.resizing) {
    ui.resizing = null;
    document.body.classList.remove('is-resizing');
    markDirty();
  }
}

function startResize(event, type, index) {
  event.preventDefault();
  event.stopPropagation();
  const sheet = getActiveSheet();
  ui.resizing = {
    type,
    index,
    startX: event.clientX,
    startY: event.clientY,
    startSize: type === 'col' ? sheet.colWidths[index] : sheet.rowHeights[index],
  };
  document.body.classList.add('is-resizing');
}

function performResize(event) {
  const sheet = getActiveSheet();
  if (!ui.resizing) {
    return;
  }

  if (ui.resizing.type === 'col') {
    const nextWidth = Math.max(MIN_COL_WIDTH, ui.resizing.startSize + (event.clientX - ui.resizing.startX));
    sheet.colWidths[ui.resizing.index] = Math.floor(nextWidth);
  } else {
    const nextHeight = Math.max(MIN_ROW_HEIGHT, ui.resizing.startSize + (event.clientY - ui.resizing.startY));
    sheet.rowHeights[ui.resizing.index] = Math.floor(nextHeight);
  }

  updateGridMetrics();
  updateSelectionOverlay();
}

function updateSelectionUI() {
  const sheet = getActiveSheet();
  const bounds = getSelectionBounds(sheet);

  grid.querySelectorAll('.selected, .active, .header-selected').forEach((node) => {
    node.classList.remove('selected', 'active', 'header-selected');
  });

  for (let row = bounds.minRow; row <= bounds.maxRow; row += 1) {
    const rowHeader = grid.querySelector(`.row-header[data-row-index="${row}"]`);
    rowHeader?.classList.add('header-selected');

    for (let col = bounds.minCol; col <= bounds.maxCol; col += 1) {
      const cell = grid.querySelector(`.cell[data-cell-id="${columnLabel(col)}${row}"]`);
      cell?.classList.add('selected');
    }
  }

  for (let col = bounds.minCol; col <= bounds.maxCol; col += 1) {
    const colHeader = grid.querySelector(`.col-header[data-col-index="${col}"]`);
    colHeader?.classList.add('header-selected');
  }

  const activeCell = grid.querySelector(`.cell[data-cell-id="${sheet.activeCell}"]`);
  activeCell?.classList.add('active');
  activeCellLabel.textContent = sheet.activeCell;
  updateSelectionOverlay();
}

function updateSelectionOverlay() {
  const sheet = getActiveSheet();
  const bounds = getSelectionBounds(sheet);
  const startCell = grid.querySelector(`.cell[data-cell-id="${columnLabel(bounds.minCol)}${bounds.minRow}"]`);
  const endCell = grid.querySelector(`.cell[data-cell-id="${columnLabel(bounds.maxCol)}${bounds.maxRow}"]`);

  if (!startCell || !endCell) {
    selectionOverlay.hidden = true;
    return;
  }

  selectionOverlay.hidden = false;
  selectionOverlay.style.left = `${startCell.offsetLeft}px`;
  selectionOverlay.style.top = `${startCell.offsetTop}px`;
  selectionOverlay.style.width = `${endCell.offsetLeft + endCell.offsetWidth - startCell.offsetLeft}px`;
  selectionOverlay.style.height = `${endCell.offsetTop + endCell.offsetHeight - startCell.offsetTop}px`;
}

function getSelectionBounds(sheet) {
  const start = parseCellId(sheet.selectionStart ?? sheet.activeCell);
  const end = parseCellId(sheet.selectionEnd ?? sheet.activeCell);
  return {
    minRow: Math.min(start.row, end.row),
    maxRow: Math.max(start.row, end.row),
    minCol: Math.min(start.col, end.col),
    maxCol: Math.max(start.col, end.col),
  };
}

function selectWholeSheet() {
  const sheet = getActiveSheet();
  sheet.selectionStart = 'A1';
  sheet.selectionEnd = `${columnLabel(sheet.cols - 1)}${sheet.rows}`;
  sheet.activeCell = 'A1';
  updateSelectionUI();
  syncFormulaBar();
  syncToolbarFromSelection();
}

function selectRow(row) {
  const sheet = getActiveSheet();
  sheet.selectionStart = `A${row}`;
  sheet.selectionEnd = `${columnLabel(sheet.cols - 1)}${row}`;
  sheet.activeCell = `A${row}`;
  updateSelectionUI();
  syncFormulaBar();
  syncToolbarFromSelection();
  sheetWrap.focus();
}

function selectColumn(col) {
  const sheet = getActiveSheet();
  const label = columnLabel(col);
  sheet.selectionStart = `${label}1`;
  sheet.selectionEnd = `${label}${sheet.rows}`;
  sheet.activeCell = `${label}1`;
  updateSelectionUI();
  syncFormulaBar();
  syncToolbarFromSelection();
  sheetWrap.focus();
}

function syncFormulaBar() {
  const sheet = getActiveSheet();
  formulaInput.value = sheet.cells[sheet.activeCell]?.raw ?? '';
}

function commitFormulaBar() {
  commitCellInput(getActiveSheet().activeCell, formulaInput.value);
}

function commitCellInput(cellId, rawValue) {
  const sheet = getActiveSheet();
  const record = ensureCellRecord(sheet, cellId, false);
  const trimmed = rawValue.trim();

  if (!trimmed) {
    if (record) {
      record.raw = '';
      cleanupCellRecord(sheet, cellId);
    }
  } else {
    ensureCellRecord(sheet, cellId, true).raw = rawValue;
  }

  refreshGridData();
  markDirty();
}

function ensureCellRecord(sheet, cellId, create) {
  if (!sheet.cells[cellId] && create) {
    sheet.cells[cellId] = { raw: '', style: {} };
  }
  return sheet.cells[cellId] ?? null;
}

function cleanupCellRecord(sheet, cellId) {
  const record = sheet.cells[cellId];
  if (!record) {
    return;
  }
  if (!record.raw && !hasStyle(record.style)) {
    delete sheet.cells[cellId];
  }
}

function hasStyle(style) {
  return Boolean(style && Object.keys(style).length > 0);
}

function onFormulaKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    commitFormulaBar();
    sheetWrap.focus();
  }
}

function onGridKeydown(event) {
  if (document.activeElement === formulaInput) {
    return;
  }

  const sheet = getActiveSheet();

  if ((event.ctrlKey || event.metaKey) && ['c', 'x', 'v'].includes(event.key.toLowerCase())) {
    return;
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    clearSelectionValues();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    moveSelection(1, 0, event.shiftKey);
    return;
  }

  if (event.key === 'Tab') {
    event.preventDefault();
    moveSelection(0, event.shiftKey ? -1 : 1, false);
    return;
  }

  if (event.key.startsWith('Arrow')) {
    event.preventDefault();
    const delta = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }[event.key];
    moveSelection(delta[0], delta[1], event.shiftKey);
    return;
  }

  if (event.key === 'F2') {
    event.preventDefault();
    formulaInput.focus();
    formulaInput.select();
    return;
  }

  if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    formulaInput.value = event.key;
    formulaInput.focus();
    formulaInput.setSelectionRange(formulaInput.value.length, formulaInput.value.length);
  }
}

function moveSelection(rowDelta, colDelta, extend) {
  const sheet = getActiveSheet();
  const current = parseCellId(sheet.activeCell);
  const nextRow = Math.max(1, Math.min(sheet.rows, current.row + rowDelta));
  const nextCol = Math.max(0, Math.min(sheet.cols - 1, current.col + colDelta));
  const nextCell = `${columnLabel(nextCol)}${nextRow}`;

  if (extend) {
    sheet.selectionEnd = nextCell;
  } else {
    sheet.selectionStart = nextCell;
    sheet.selectionEnd = nextCell;
  }

  sheet.activeCell = nextCell;
  updateSelectionUI();
  syncFormulaBar();
  syncToolbarFromSelection();
}

function clearSelectionValues() {
  const sheet = getActiveSheet();
  forEachSelectedCell(sheet, (cellId) => {
    const record = ensureCellRecord(sheet, cellId, false);
    if (!record) {
      return;
    }
    record.raw = '';
    cleanupCellRecord(sheet, cellId);
  });
  refreshGridData();
  markDirty();
}

function forEachSelectedCell(sheet, callback) {
  const bounds = getSelectionBounds(sheet);
  for (let row = bounds.minRow; row <= bounds.maxRow; row += 1) {
    for (let col = bounds.minCol; col <= bounds.maxCol; col += 1) {
      callback(`${columnLabel(col)}${row}`, row, col);
    }
  }
}

function onCopy(event) {
  if (document.activeElement === formulaInput) {
    return;
  }
  event.preventDefault();
  event.clipboardData.setData('text/plain', buildSelectionTsv());
}

function onCut(event) {
  if (document.activeElement === formulaInput) {
    return;
  }
  event.preventDefault();
  event.clipboardData.setData('text/plain', buildSelectionTsv());
  clearSelectionValues();
}

function onPaste(event) {
  if (document.activeElement === formulaInput) {
    return;
  }
  event.preventDefault();
  const text = event.clipboardData.getData('text/plain');
  applyPasteMatrix(parseClipboardMatrix(text));
}

function buildSelectionTsv() {
  const sheet = getActiveSheet();
  const bounds = getSelectionBounds(sheet);
  const lines = [];

  for (let row = bounds.minRow; row <= bounds.maxRow; row += 1) {
    const values = [];
    for (let col = bounds.minCol; col <= bounds.maxCol; col += 1) {
      const cellId = `${columnLabel(col)}${row}`;
      values.push(sheet.cells[cellId]?.raw ?? '');
    }
    lines.push(values.join('\t'));
  }

  return lines.join('\n');
}

function parseClipboardMatrix(text) {
  const normalized = String(text ?? '').replace(/\r/g, '');
  const rows = normalized.split('\n');
  if (rows.at(-1) === '') {
    rows.pop();
  }
  return rows.map((row) => row.split('\t'));
}

function applyPasteMatrix(matrix) {
  if (!matrix.length || (matrix.length === 1 && matrix[0].length === 1 && matrix[0][0] === '')) {
    return;
  }

  const sheet = getActiveSheet();
  const bounds = getSelectionBounds(sheet);
  const targetStartRow = bounds.minRow;
  const targetStartCol = bounds.minCol;
  const fillSelection = matrix.length === 1 && matrix[0].length === 1 && (bounds.maxRow > bounds.minRow || bounds.maxCol > bounds.minCol);

  if (fillSelection) {
    forEachSelectedCell(sheet, (cellId) => {
      ensureCellRecord(sheet, cellId, true).raw = matrix[0][0];
      cleanupCellRecord(sheet, cellId);
    });
  } else {
    for (let rowOffset = 0; rowOffset < matrix.length; rowOffset += 1) {
      for (let colOffset = 0; colOffset < matrix[rowOffset].length; colOffset += 1) {
        const row = targetStartRow + rowOffset;
        const col = targetStartCol + colOffset;
        if (row > sheet.rows || col >= sheet.cols) {
          continue;
        }
        const cellId = `${columnLabel(col)}${row}`;
        ensureCellRecord(sheet, cellId, true).raw = matrix[rowOffset][colOffset];
        cleanupCellRecord(sheet, cellId);
      }
    }

    const endRow = Math.min(sheet.rows, targetStartRow + matrix.length - 1);
    const endCol = Math.min(sheet.cols - 1, targetStartCol + Math.max(...matrix.map((row) => row.length)) - 1);
    sheet.selectionStart = `${columnLabel(targetStartCol)}${targetStartRow}`;
    sheet.selectionEnd = `${columnLabel(endCol)}${endRow}`;
    sheet.activeCell = sheet.selectionStart;
  }

  refreshGridData();
  markDirty();
}

function syncToolbarFromSelection() {
  const sheet = getActiveSheet();
  const style = sheet.cells[sheet.activeCell]?.style ?? {};
  fontSizeSelect.value = String(style.fontSize ?? 14);
  textColorInput.value = normalizeColor(style.color, '#152033');
  fillColorInput.value = normalizeColor(style.background, '#ffffff');
  boldBtn.classList.toggle('active', Boolean(style.bold));
  italicBtn.classList.toggle('active', Boolean(style.italic));
  underlineBtn.classList.toggle('active', Boolean(style.underline));
  document.querySelectorAll('[data-align]').forEach((button) => {
    button.classList.toggle('active', (style.align ?? 'left') === button.dataset.align);
  });
}

function normalizeColor(value, fallback) {
  const hex = String(value).trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return hex;
  }
  return fallback;
}

function toggleStyleFlag(flag) {
  const style = getActiveSheet().cells[getActiveSheet().activeCell]?.style ?? {};
  applyStyleToSelection({ [flag]: !style[flag] });
}

function applyStyleToSelection(patch) {
  const sheet = getActiveSheet();
  forEachSelectedCell(sheet, (cellId) => {
    const record = ensureCellRecord(sheet, cellId, true);
    record.style = cleanupStyle({ ...record.style, ...patch });
    cleanupCellRecord(sheet, cellId);
  });
  refreshGridData();
  markDirty();
}

function clearSelectionStyles() {
  const sheet = getActiveSheet();
  forEachSelectedCell(sheet, (cellId) => {
    const record = ensureCellRecord(sheet, cellId, false);
    if (!record) {
      return;
    }
    record.style = {};
    cleanupCellRecord(sheet, cellId);
  });
  refreshGridData();
  markDirty();
}

function cleanupStyle(style) {
  const next = normalizeCellStyle(style);
  if (next.align === 'left') {
    delete next.align;
  }
  if (next.fontSize === 14) {
    delete next.fontSize;
  }
  if (next.color === '#152033') {
    delete next.color;
  }
  if (next.background === '#ffffff') {
    delete next.background;
  }
  return next;
}

function resizeSheetDimensions() {
  const sheet = getActiveSheet();
  const nextRows = clampNumber(rowsInput.value, 5, MAX_ROWS, sheet.rows);
  const nextCols = clampNumber(colsInput.value, 5, MAX_COLS, sheet.cols);

  sheet.rows = nextRows;
  sheet.cols = nextCols;
  sheet.colWidths = normalizeDimensionArray(sheet.colWidths, nextCols, DEFAULT_COL_WIDTH, MIN_COL_WIDTH);
  sheet.rowHeights = normalizeDimensionArray(sheet.rowHeights, nextRows, DEFAULT_ROW_HEIGHT, MIN_ROW_HEIGHT);

  Object.keys(sheet.cells).forEach((cellId) => {
    if (!isValidCellIdForSize(cellId, nextRows, nextCols)) {
      delete sheet.cells[cellId];
    }
  });

  if (!isValidCellIdForSize(sheet.activeCell, nextRows, nextCols)) {
    sheet.activeCell = 'A1';
  }
  if (!isValidCellIdForSize(sheet.selectionStart, nextRows, nextCols)) {
    sheet.selectionStart = sheet.activeCell;
  }
  if (!isValidCellIdForSize(sheet.selectionEnd, nextRows, nextCols)) {
    sheet.selectionEnd = sheet.activeCell;
  }

  renderGrid();
  markDirty();
}

function resetWorkbook() {
  if (!window.confirm('确定重建整个工作簿吗？')) {
    return;
  }

  const fresh = createEmptyWorkbook();
  state.sheets = fresh.sheets;
  state.activeSheetId = fresh.activeSheetId;
  syncSheetControls();
  renderSheetTabs();
  renderGrid();
  markDirty();
}

function switchSheet(sheetId) {
  if (!state.sheets.some((sheet) => sheet.id === sheetId)) {
    return;
  }
  state.activeSheetId = sheetId;
  syncSheetControls();
  renderSheetTabs();
  renderGrid();
}

function addSheet() {
  const nextIndex = state.sheets.length + 1;
  const sheet = createSheet(`sheet-${Date.now()}`, `Sheet${nextIndex}`, DEFAULT_ROWS, DEFAULT_COLS);
  state.sheets.push(sheet);
  state.activeSheetId = sheet.id;
  syncSheetControls();
  renderSheetTabs();
  renderGrid();
  markDirty();
}

function removeCurrentSheet() {
  if (state.sheets.length === 1) {
    setStatus('至少保留一个工作表');
    return;
  }

  const currentSheet = getActiveSheet();
  if (!window.confirm(`确定删除 ${currentSheet.name} 吗？`)) {
    return;
  }

  state.sheets = state.sheets.filter((sheet) => sheet.id !== currentSheet.id);
  state.activeSheetId = state.sheets[0].id;
  syncSheetControls();
  renderSheetTabs();
  renderGrid();
  markDirty();
}

function renameSheet(sheetId) {
  const sheet = state.sheets.find((item) => item.id === sheetId);
  if (!sheet) {
    return;
  }
  const nextName = window.prompt('输入工作表名称', sheet.name)?.trim();
  if (!nextName) {
    return;
  }
  sheet.name = nextName;
  renderSheetTabs();
  markDirty();
}

function saveToLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  setStatus('已保存到浏览器本地');
}

function exportJson() {
  downloadFile('sheet.json', JSON.stringify(state, null, 2), 'application/json');
  setStatus('已导出 JSON');
}

function exportCsv() {
  const sheet = getActiveSheet();
  const lines = [];
  for (let row = 1; row <= sheet.rows; row += 1) {
    const values = [];
    for (let col = 0; col < sheet.cols; col += 1) {
      const cellId = `${columnLabel(col)}${row}`;
      values.push(csvEscape(getDisplayValue(sheet, cellId, new Set([cellId]))));
    }
    lines.push(values.join(','));
  }
  downloadFile(`${sheet.name}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  setStatus('已导出 CSV');
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

async function importJson(event) {
  const [file] = event.target.files ?? [];
  if (!file) {
    return;
  }

  try {
    const incoming = normalizeWorkbook(JSON.parse(await file.text()));
    state.sheets = incoming.sheets;
    state.activeSheetId = incoming.activeSheetId;
    syncSheetControls();
    renderSheetTabs();
    renderGrid();
    markDirty();
    setStatus('已导入 JSON');
  } catch {
    setStatus('导入失败');
  } finally {
    importInput.value = '';
  }
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function setStatus(text) {
  statusText.textContent = text;
}

function markDirty() {
  setStatus('未保存');
}

function parseCellId(cellId) {
  const match = /^([A-Z]+)(\d+)$/.exec(cellId);
  if (!match) {
    return { row: 1, col: 0 };
  }
  return {
    col: labelToColumn(match[1]),
    row: Number(match[2]),
  };
}

function labelToColumn(label) {
  let result = 0;
  for (let index = 0; index < label.length; index += 1) {
    result = result * 26 + (label.charCodeAt(index) - 64);
  }
  return result - 1;
}

function columnLabel(index) {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
}

function isValidCellIdForSize(value, rows, cols) {
  if (typeof value !== 'string') {
    return false;
  }
  const match = /^([A-Z]+)(\d+)$/.exec(value);
  if (!match) {
    return false;
  }
  const col = labelToColumn(match[1]);
  const row = Number(match[2]);
  return row >= 1 && row <= rows && col >= 0 && col < cols;
}
