import type { GraphDocument, TreeDocument } from '../types';
import { cloneDocument } from './clone';

function cloneTreeDocument(tree: TreeDocument | undefined): TreeDocument | undefined {
  return tree ? (JSON.parse(JSON.stringify(tree)) as TreeDocument) : undefined;
}

export interface HistoryEntry {
  doc: GraphDocument;
  revision: number;
  treeDocument?: TreeDocument;
}

export interface DesignerHistoryState {
  history: HistoryEntry[];
  historyIndex: number;
}

export function createHistoryState(
  doc: GraphDocument,
  revision: number,
  treeDocument?: TreeDocument,
): DesignerHistoryState {
  return {
    history: [{ doc: cloneDocument(doc), revision, treeDocument: cloneTreeDocument(treeDocument) }],
    historyIndex: 0,
  };
}

export function canUndoHistory(state: DesignerHistoryState): boolean {
  return state.historyIndex > 0;
}

export function canRedoHistory(state: DesignerHistoryState): boolean {
  return state.historyIndex < state.history.length - 1;
}

export function pushHistoryEntry(
  state: DesignerHistoryState,
  doc: GraphDocument,
  revision: number,
  maxHistorySize: number,
  treeDocument?: TreeDocument,
): DesignerHistoryState {
  let history = state.history;
  let historyIndex = state.historyIndex;

  if (historyIndex < history.length - 1) {
    history = history.slice(0, historyIndex + 1);
  }

  history = [
    ...history,
    { doc: cloneDocument(doc), revision, treeDocument: cloneTreeDocument(treeDocument) },
  ];
  if (history.length > maxHistorySize) {
    history = history.slice(1);
  } else {
    historyIndex += 1;
  }

  return { history, historyIndex };
}

export function undoHistory(
  state: DesignerHistoryState,
): { state: DesignerHistoryState; entry: HistoryEntry } | null {
  if (!canUndoHistory(state)) {
    return null;
  }

  const historyIndex = state.historyIndex - 1;
  return {
    state: {
      history: state.history,
      historyIndex,
    },
    entry: state.history[historyIndex],
  };
}

export function redoHistory(
  state: DesignerHistoryState,
): { state: DesignerHistoryState; entry: HistoryEntry } | null {
  if (!canRedoHistory(state)) {
    return null;
  }

  const historyIndex = state.historyIndex + 1;
  return {
    state: {
      history: state.history,
      historyIndex,
    },
    entry: state.history[historyIndex],
  };
}

export function getCurrentRevision(state: DesignerHistoryState): number | undefined {
  return state.history[state.historyIndex]?.revision;
}
