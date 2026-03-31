import { createStore } from 'zustand/vanilla'
import type { CanvasEditorBridge } from './canvas-editor-bridge.js'
import type { PaperSettings } from './paper-settings.js'
import { DEFAULT_PAPER_SETTINGS } from './paper-settings.js'

export interface EditorSelectionState {
  bold: boolean
  italic: boolean
  underline: boolean
  strikeout: boolean
  superscript: boolean
  subscript: boolean
  font: string | null
  size: number
  color: string | null
  highlight: string | null
  rowFlex: string | null
  level: string | null
  listType: string | null
  listStyle: string | null
  rowMargin: number
  undo: boolean
  redo: boolean
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
  redo: false
}

export interface EditorState {
  bridge: CanvasEditorBridge | null
  isReady: boolean
  isDirty: boolean
  paperSettings: PaperSettings
  selection: EditorSelectionState
  currentPage: number
  totalPages: number
  scale: number
  wordCount: number
}

const initialState: EditorState = {
  bridge: null,
  isReady: false,
  isDirty: false,
  paperSettings: { ...DEFAULT_PAPER_SETTINGS },
  selection: { ...DEFAULT_SELECTION },
  currentPage: 0,
  totalPages: 0,
  scale: 1,
  wordCount: 0
}

export function createEditorStore() {
  const store = createStore<EditorState>(() => ({ ...initialState }))

  return {
    getState: store.getState,
    subscribe: store.subscribe,

    setBridge(bridge: CanvasEditorBridge | null) {
      store.setState({ bridge, isReady: bridge !== null && bridge.isReady() })
    },

    setReady(isReady: boolean) {
      store.setState({ isReady })
    },

    setDirty(isDirty: boolean) {
      store.setState({ isDirty })
    },

    setTotalPages(total: number) {
      store.setState({ totalPages: total })
    },

    setCurrentPage(page: number) {
      store.setState({ currentPage: page })
    },

    setScale(scale: number) {
      store.setState({ scale })
    },

    setPaperSettings(settings: PaperSettings) {
      store.setState({ paperSettings: settings })
    },

    setSelection(selection: Partial<EditorSelectionState>) {
      store.setState((state) => ({
        selection: { ...state.selection, ...selection }
      }))
    },

    setWordCount(wordCount: number) {
      store.setState({ wordCount })
    },

    reset() {
      store.setState({ ...initialState })
    }
  }
}

export type EditorStoreApi = ReturnType<typeof createEditorStore>
