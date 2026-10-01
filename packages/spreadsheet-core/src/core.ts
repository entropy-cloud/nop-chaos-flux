import { createStore } from 'zustand/vanilla';
import type {
  SpreadsheetConfig,
  SpreadsheetDocument,
  SpreadsheetRuntimeSnapshot,
  SpreadsheetCellRef,
  EditSaveStatus,
  ClipboardData,
} from './types.js';
import { createDefaultViewport } from './types.js';
import type { SpreadsheetCommand, SpreadsheetCommandResult } from './commands.js';
import {
  buildSnapshot,
  cloneSpreadsheetDocument,
  type SpreadsheetInternalState,
} from './core/internal-state.js';
import { dispatchSpreadsheetCommand } from './core-dispatch.js';
import { recalcDocument } from './formula/recalc-document.js';

export interface SpreadsheetCore {
  getSnapshot(): SpreadsheetRuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: SpreadsheetCommand): Promise<SpreadsheetCommandResult>;
  replaceDocument(nextDocument: SpreadsheetDocument): void;
  acceptCurrentDocumentAsSaved(): void;
  exportDocument(): SpreadsheetDocument;
  getClipboard(): ClipboardData | null;
  startEditing(cell: SpreadsheetCellRef, initialValue: unknown): void;
  updateEditValue(value: unknown): void;
  getEditValue(): string;
  commitEditValue(): string;
  setEditSaveStatus(status: EditSaveStatus, message?: string): void;
  clearEditing(): void;
}

export interface CreateSpreadsheetCoreOptions {
  document: SpreadsheetDocument;
  config?: SpreadsheetConfig;
  readonly?: boolean;
}

export function createSpreadsheetCore(options: CreateSpreadsheetCoreOptions): SpreadsheetCore {
  const { document, config, readonly = false } = options;
  // 装载求值（ux-r4）：种子文档含公式时打开即见计算值（不经命令通路）
  const initialDocument = recalcDocument(cloneSpreadsheetDocument(document));
  const firstSheetId = initialDocument.workbook.sheets[0]?.id ?? '';

  const store = createStore<SpreadsheetInternalState>(() => ({
    document: initialDocument,
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
    maxUndoDepth: config?.maxUndoDepth ?? 100,
  }));
  // Keystroke-path edit draft. Held outside the store so each character does
  // not re-render the whole grid page; the store copy is synced only at the
  // save boundary via commitEditValue().
  let editDraft = '';
  let cachedState = store.getState();
  let cachedSnapshot = buildSnapshot(cachedState);

  async function dispatch(command: SpreadsheetCommand): Promise<SpreadsheetCommandResult> {
    return dispatchSpreadsheetCommand(store, command);
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
      const replacedDocument = cloneSpreadsheetDocument(nextDocument);
      const activeSheetId = replacedDocument.workbook.sheets[0]?.id ?? '';
      store.setState({
        document: replacedDocument,
        activeSheetId,
        selection: { kind: 'none' },
        editing: undefined,
        dirty: false,
        undoStack: [],
        redoStack: [],
        transactionDoc: null,
      });
    },

    acceptCurrentDocumentAsSaved() {
      const state = store.getState();
      if (!state.dirty) {
        return;
      }

      store.setState({
        ...state,
        dirty: false,
      });
    },

    exportDocument() {
      return cloneSpreadsheetDocument(store.getState().document);
    },

    getClipboard() {
      return store.getState().clipboard;
    },

    startEditing(cell: SpreadsheetCellRef, initialValue: unknown) {
      editDraft = String(initialValue ?? '');
      store.setState({
        editing: {
          cell,
          initialValue,
          draftValue: initialValue,
          saveStatus: 'idle',
        },
      });
    },

    updateEditValue(value: unknown) {
      editDraft = String(value ?? '');
    },

    getEditValue() {
      return String(editDraft ?? '');
    },

    commitEditValue() {
      const state = store.getState();
      if (!state.editing) {
        return '';
      }
      const value = String(editDraft ?? '');
      store.setState({
        editing: { ...state.editing, draftValue: value, saveStatus: 'idle' },
      });
      return value;
    },

    setEditSaveStatus(status: EditSaveStatus, message?: string) {
      const state = store.getState();
      if (!state.editing) return;
      store.setState({
        editing: { ...state.editing, saveStatus: status, saveMessage: message },
      });
    },

    clearEditing() {
      editDraft = '';
      store.setState({ editing: undefined });
    },
  };
}
