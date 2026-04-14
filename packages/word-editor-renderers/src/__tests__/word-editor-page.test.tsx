import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { WordEditorPage } from '../WordEditorPage.js'

vi.mock('@nop-chaos/word-editor-core', async () => {
  class CanvasEditorBridge {}
  const state = { isDirty: false, wordCount: 0 }
  const editorStore = {
    subscribe: () => () => undefined,
    getState: () => state,
    setDirty: vi.fn(),
  }
  const datasetStore = {
    load: vi.fn(),
    getAll: vi.fn(() => []),
    getById: vi.fn(() => null),
    add: vi.fn(),
    update: vi.fn(),
  }
  return {
    CanvasEditorBridge,
    createEditorStore: () => editorStore,
    createDatasetStore: () => datasetStore,
    saveDocument: vi.fn(() => true),
    loadDocument: vi.fn(() => null),
    saveDatasets: vi.fn(),
    loadDatasets: vi.fn(() => []),
  }
})

vi.mock('../EditorCanvas.js', () => ({
  EditorCanvas: () => <div data-testid="editor-canvas" />,
}))

vi.mock('../toolbar/RibbonToolbar.js', () => ({
  RibbonToolbar: () => <div data-testid="ribbon-toolbar" />,
}))

vi.mock('../panels/OutlinePanel.js', () => ({
  OutlinePanel: () => <div data-testid="outline-panel" />,
}))

vi.mock('../panels/DatasetPanel.js', () => ({
  DatasetPanel: () => <div data-testid="dataset-panel" />,
}))

vi.mock('../panels/FieldList.js', () => ({
  FieldList: () => <div data-testid="field-list" />,
}))

vi.mock('../dialogs/DatasetDialog.js', () => ({
  DatasetDialog: () => <div data-testid="dataset-dialog" />,
}))

vi.mock('../hooks/useWordEditorShortcuts.js', () => ({
  useWordEditorShortcuts: () => undefined,
}))

describe('WordEditorPage', () => {
  it('keeps the semantic root marker on the page shell', () => {
    const { container } = render(<WordEditorPage onBack={vi.fn()} />)
    expect(container.querySelector('.nop-word-editor')).toBeTruthy()
    expect(screen.getByTestId('editor-canvas')).toBeTruthy()
    expect(screen.getByTestId('ribbon-toolbar')).toBeTruthy()
  })
})
