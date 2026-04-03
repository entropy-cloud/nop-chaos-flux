import type {
  SpreadsheetDocument,
  SpreadsheetRuntimeSnapshot,
  SpreadsheetSelection,
  SpreadsheetEditingState,
  ClipboardData,
} from '../types.js';
import { createDefaultLayout } from '../types.js';

export interface SpreadsheetInternalState {
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

export function buildSnapshot(state: SpreadsheetInternalState): SpreadsheetRuntimeSnapshot {
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

export function pushUndo(state: SpreadsheetInternalState): SpreadsheetInternalState {
  const maxDepth = 100;
  const undoStack = [...state.undoStack, state.document];
  if (undoStack.length > maxDepth) {
    undoStack.shift();
  }
  return { ...state, undoStack, redoStack: [] };
}

export function applySimpleDocumentMutation(
  state: SpreadsheetInternalState,
  nextDoc: SpreadsheetDocument,
): SpreadsheetInternalState {
  return {
    ...pushUndo(state),
    document: nextDoc,
    dirty: true,
  };
}
