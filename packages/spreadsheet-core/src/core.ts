import { createStore } from 'zustand/vanilla';
import type {
  SpreadsheetConfig,
  SpreadsheetDocument,
  SpreadsheetRuntimeSnapshot,
  CellStyle,
  ClipboardData,
} from './types.js';
import { createDefaultViewport } from './types.js';
import type { SpreadsheetCommand, SpreadsheetCommandResult } from './commands.js';
import {
  applyAddComment,
  applyCellStyleChange,
  applyDeleteComment,
  applyFillDown,
  applyFillRight,
  applyFillSeries,
  applyMergeCellsCenter,
  applyMergeRange,
  applySetCellFormula,
  applySetCellStyle,
  applySetCellValue,
  applyUnmergeRange,
  applyEditComment,
} from './core/cell-operations.js';
import {
  applyClearCells,
  applyPasteCells,
  copyRangeToClipboard,
} from './core/clipboard-operations.js';
import {
  applySimpleDocumentMutation,
  buildSnapshot,
  pushUndo,
  type SpreadsheetInternalState,
} from './core/internal-state.js';
import {
  findInDocument,
  replaceAllInDocument,
  replaceInDocument,
} from './core/search-operations.js';
import {
  applyAddSheet,
  applyCopySheet,
  applyFreezePanes,
  applyHideColumn,
  applyHideRow,
  applyHideSheet,
  applyMoveSheet,
  applyProtectSheet,
  applyRemoveSheet,
  applyRenameSheet,
  applyResizeColumn,
  applyResizeRow,
  applySetSheetTabColor,
  applyUnfreezePanes,
} from './core/sheet-operations.js';
import {
  applyDeleteColumn,
  applyDeleteRow,
  applyInsertColumn,
  applyInsertRow,
} from './core/structure-operations.js';

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
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellFormula': {
          const nextDoc = applySetCellFormula(state.document, command.cell, command.formula);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellStyle': {
          const nextDoc = applySetCellStyle(state.document, command.target, command.styleId);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:resizeRow': {
          const nextDoc = applyResizeRow(state.document, command.sheetId, command.row, command.height);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:resizeColumn': {
          const nextDoc = applyResizeColumn(state.document, command.sheetId, command.col, command.width);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:mergeRange': {
          const nextDoc = applyMergeRange(state.document, command.range);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:unmergeRange': {
          const nextDoc = applyUnmergeRange(state.document, command.range);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:hideRow': {
          const nextDoc = applyHideRow(state.document, command.sheetId, command.row, command.hidden);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:hideColumn': {
          const nextDoc = applyHideColumn(state.document, command.sheetId, command.col, command.hidden);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:addSheet': {
          const nextDoc = applyAddSheet(state.document, command.name, command.index);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
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
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:moveSheet': {
          const nextDoc = applyMoveSheet(state.document, command.sheetId, command.targetIndex);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
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
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        // Insert/Delete row/column
        case 'spreadsheet:insertRow': {
          const nextDoc = applyInsertRow(state.document, command.sheetId, command.row, command.count ?? 1);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:insertColumn': {
          const nextDoc = applyInsertColumn(state.document, command.sheetId, command.col, command.count ?? 1);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:deleteRow': {
          const nextDoc = applyDeleteRow(state.document, command.sheetId, command.row, command.count ?? 1);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:deleteColumn': {
          const nextDoc = applyDeleteColumn(state.document, command.sheetId, command.col, command.count ?? 1);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
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
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellFontSize': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { fontSize: command.fontSize });
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellFontWeight': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { fontWeight: command.fontWeight });
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellFontStyle': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { fontStyle: command.fontStyle });
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellTextDecoration': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { textDecoration: command.textDecoration });
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellFontColor': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { fontColor: command.color });
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellBackgroundColor': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { backgroundColor: command.color });
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellBorder': {
          const borderPatch: Partial<CellStyle> = { borderStyle: command.border };
          if (command.color) borderPatch.borderColor = command.color;
          if (command.width) borderPatch.borderWidth = command.width;
          const nextDoc = applyCellStyleChange(state.document, command.target, borderPatch);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellTextAlign': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { textAlign: command.textAlign });
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellVerticalAlign': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { verticalAlign: command.verticalAlign });
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellWrapText': {
          const nextDoc = applyCellStyleChange(state.document, command.target, { wrapText: command.wrapText });
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setCellNumberFormat': {
          const nextDoc = applyCellStyleChange(state.document, command.target, {});
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        // Fill
        case 'spreadsheet:fillDown': {
          const nextDoc = applyFillDown(state.document, command.range);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:fillRight': {
          const nextDoc = applyFillRight(state.document, command.range);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        // Comments
        case 'spreadsheet:addComment': {
          const nextDoc = applyAddComment(state.document, command.cell, command.text, command.author);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:editComment': {
          const nextDoc = applyEditComment(state.document, command.cell, command.text);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:deleteComment': {
          const nextDoc = applyDeleteComment(state.document, command.cell);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        // P1/P2 Sheet operations
        case 'spreadsheet:copySheet': {
          const nextDoc = applyCopySheet(state.document, command.sheetId, command.name);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:setSheetTabColor': {
          const nextDoc = applySetSheetTabColor(state.document, command.sheetId, command.color);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:hideSheet': {
          const nextDoc = applyHideSheet(state.document, command.sheetId, command.hidden);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:protectSheet': {
          const nextDoc = applyProtectSheet(state.document, command.sheetId, command.password, command.options);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
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
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        // Freeze panes
        case 'spreadsheet:freezePanes': {
          const nextDoc = applyFreezePanes(state.document, command.sheetId, command.row, command.col);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        case 'spreadsheet:unfreezePanes': {
          const nextDoc = applyUnfreezePanes(state.document, command.sheetId);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
          return { ok: true, changed: true };
        }

        // Fill series
        case 'spreadsheet:fillSeries': {
          const nextDoc = applyFillSeries(state.document, command.range, command.direction);
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
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
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
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
          store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
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
