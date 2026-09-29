import { createStore } from 'zustand/vanilla';
import type { EditorZone } from './canvas-editor-types.js';
import type { CanvasEditorBridge } from './canvas-editor-bridge.js';
import type { PaperSettings } from './paper-settings.js';
import { DEFAULT_PAPER_SETTINGS } from './paper-settings.js';

export interface EditorSelectionState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeout: boolean;
  superscript: boolean;
  subscript: boolean;
  font: string | null;
  size: number;
  color: string | null;
  highlight: string | null;
  rowFlex: string | null;
  level: string | null;
  listType: string | null;
  listStyle: string | null;
  rowMargin: number;
  undo: boolean;
  redo: boolean;
}

const DEFAULT_SELECTION: EditorSelectionState = {
  bold: false,
  italic: false,
  underline: false,
  strikeout: false,
  superscript: false,
  subscript: false,
  font: null,
  size: 16,
  color: null,
  highlight: null,
  rowFlex: null,
  level: null,
  listType: null,
  listStyle: null,
  rowMargin: 0,
  undo: false,
  redo: false,
};

export interface EditorState {
  bridge: CanvasEditorBridge | null;
  isReady: boolean;
  isDirty: boolean;
  pageMode: string;
  paperSettings: PaperSettings;
  selection: EditorSelectionState;
  activeZone: EditorZone;
  currentPage: number;
  totalPages: number;
  scale: number;
  wordCount: number;
}

const initialState: EditorState = {
  bridge: null,
  isReady: false,
  isDirty: false,
  pageMode: 'paging',
  paperSettings: { ...DEFAULT_PAPER_SETTINGS },
  selection: { ...DEFAULT_SELECTION },
  activeZone: 'main' as EditorZone,
  currentPage: 0,
  totalPages: 0,
  scale: 1,
  wordCount: 0,
};

export function createEditorStore() {
  const store = createStore<EditorState>(() => ({ ...initialState }));

  return {
    getState: store.getState,
    subscribe: store.subscribe,

    setBridge(bridge: CanvasEditorBridge | null) {
      store.setState({ bridge, isReady: bridge !== null && bridge.isReady() });
    },

    setReady(isReady: boolean) {
      store.setState({ isReady });
    },

    setDirty(isDirty: boolean) {
      store.setState({ isDirty });
    },

    setPageMode(pageMode: string) {
      store.setState({ pageMode });
    },

    setTotalPages(total: number) {
      store.setState({ totalPages: total });
    },

    setCurrentPage(page: number) {
      store.setState({ currentPage: page });
    },

    setScale(scale: number) {
      store.setState({ scale });
    },

    setPaperSettings(settings: PaperSettings) {
      store.setState({ paperSettings: settings });
    },

    setSelection(selection: Partial<EditorSelectionState>) {
      store.setState((state) => {
        const nextSelection = { ...state.selection, ...selection };
        // Cursor moves fire at caret rate; an identity-stable selection keeps
        // Object.is subscribers (toolbar, hostScopeData) from re-rendering on
        // every bridge tick that carries the same selection.
        for (const key of Object.keys(nextSelection) as Array<keyof EditorSelectionState>) {
          if (nextSelection[key] !== state.selection[key]) {
            return { selection: nextSelection };
          }
        }
        return state;
      });
    },

    setActiveZone(zone: EditorZone) {
      store.setState({ activeZone: zone });
    },

    setWordCount(wordCount: number) {
      store.setState({ wordCount });
    },

    reset() {
      store.setState({ ...initialState });
    },
  };
}

export type EditorStoreApi = ReturnType<typeof createEditorStore>;
