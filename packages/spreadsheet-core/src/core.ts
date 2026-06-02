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
  const initialDocument = cloneSpreadsheetDocument(document);
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
      const state = store.getState();
      if (!state.editing) return;
      store.setState({
        editing: { ...state.editing, draftValue: value, saveStatus: 'idle' },
      });
    },

    setEditSaveStatus(status: EditSaveStatus, message?: string) {
      const state = store.getState();
      if (!state.editing) return;
      store.setState({
        editing: { ...state.editing, saveStatus: status, saveMessage: message },
      });
    },

    clearEditing() {
      store.setState({ editing: undefined });
    },
  };
}
