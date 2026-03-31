import { describe, it, expect, vi } from 'vitest'
import { createEditorStore } from '../editor-store.js'
import { DEFAULT_PAPER_SETTINGS } from '../paper-settings.js'

describe('createEditorStore', () => {
  it('has correct initial state', () => {
    const store = createEditorStore()
    const state = store.getState()

    expect(state.bridge).toBeNull()
    expect(state.isReady).toBe(false)
    expect(state.isDirty).toBe(false)
    expect(state.currentPage).toBe(0)
    expect(state.totalPages).toBe(0)
    expect(state.scale).toBe(1)
    expect(state.wordCount).toBe(0)
    expect(state.paperSettings).toEqual(DEFAULT_PAPER_SETTINGS)
    expect(state.selection).toEqual({
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
    })
  })

  it('setDirty updates isDirty', () => {
    const store = createEditorStore()
    store.setDirty(true)
    expect(store.getState().isDirty).toBe(true)
    store.setDirty(false)
    expect(store.getState().isDirty).toBe(false)
  })

  it('setReady updates isReady', () => {
    const store = createEditorStore()
    store.setReady(true)
    expect(store.getState().isReady).toBe(true)
    store.setReady(false)
    expect(store.getState().isReady).toBe(false)
  })

  it('setScale updates scale', () => {
    const store = createEditorStore()
    store.setScale(1.5)
    expect(store.getState().scale).toBe(1.5)
  })

  it('setTotalPages updates totalPages', () => {
    const store = createEditorStore()
    store.setTotalPages(5)
    expect(store.getState().totalPages).toBe(5)
  })

  it('setCurrentPage updates currentPage', () => {
    const store = createEditorStore()
    store.setCurrentPage(3)
    expect(store.getState().currentPage).toBe(3)
  })

  it('setWordCount updates wordCount', () => {
    const store = createEditorStore()
    store.setWordCount(42)
    expect(store.getState().wordCount).toBe(42)
  })

  it('setSelection merges partial updates', () => {
    const store = createEditorStore()

    store.setSelection({ bold: true, font: 'Arial' })
    const state1 = store.getState().selection
    expect(state1.bold).toBe(true)
    expect(state1.font).toBe('Arial')
    expect(state1.italic).toBe(false)
    expect(state1.size).toBe(16)

    store.setSelection({ italic: true, size: 20 })
    const state2 = store.getState().selection
    expect(state2.bold).toBe(true)
    expect(state2.italic).toBe(true)
    expect(state2.size).toBe(20)
    expect(state2.font).toBe('Arial')
  })

  it('setPaperSettings replaces paper settings', () => {
    const store = createEditorStore()
    const custom = { width: 100, height: 200, direction: 'horizontal' as const, margins: [10, 20, 30, 40] as [number, number, number, number] }
    store.setPaperSettings(custom)
    expect(store.getState().paperSettings).toEqual(custom)
  })

  it('reset returns to initial state', () => {
    const store = createEditorStore()
    store.setDirty(true)
    store.setReady(true)
    store.setScale(2)
    store.setTotalPages(10)
    store.setCurrentPage(5)
    store.setWordCount(100)
    store.setSelection({ bold: true })
    store.setPaperSettings({ width: 100, height: 200, direction: 'horizontal', margins: [10, 20, 30, 40] })

    store.reset()

    const state = store.getState()
    expect(state.bridge).toBeNull()
    expect(state.isReady).toBe(false)
    expect(state.isDirty).toBe(false)
    expect(state.currentPage).toBe(0)
    expect(state.totalPages).toBe(0)
    expect(state.scale).toBe(1)
    expect(state.wordCount).toBe(0)
    expect(state.paperSettings).toEqual(DEFAULT_PAPER_SETTINGS)
    expect(state.selection.bold).toBe(false)
  })

  it('setBridge with null sets bridge to null and isReady to false', () => {
    const store = createEditorStore()
    store.setBridge(null)
    expect(store.getState().bridge).toBeNull()
    expect(store.getState().isReady).toBe(false)
  })

  it('setBridge with a mock bridge sets bridge and derives isReady', () => {
    const store = createEditorStore()
    const mockBridge = { isReady: () => true } as any
    store.setBridge(mockBridge)
    expect(store.getState().bridge).toBe(mockBridge)
    expect(store.getState().isReady).toBe(true)
  })

  it('setBridge with a bridge that is not ready sets isReady to false', () => {
    const store = createEditorStore()
    const mockBridge = { isReady: () => false } as any
    store.setBridge(mockBridge)
    expect(store.getState().bridge).toBe(mockBridge)
    expect(store.getState().isReady).toBe(false)
  })

  it('subscribe receives state updates', () => {
    const store = createEditorStore()
    const listener = vi.fn()
    const unsub = store.subscribe(listener)

    store.setDirty(true)
    expect(listener).toHaveBeenCalledTimes(1)

    unsub()
  })
})
