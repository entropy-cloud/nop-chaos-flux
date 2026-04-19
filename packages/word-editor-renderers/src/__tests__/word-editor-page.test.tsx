// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { createFormulaCompiler } from '@nop-chaos/flux-formula'
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n'
import { createDefaultRegistry, createSchemaRenderer } from '@nop-chaos/flux-react'
import type { RendererEnv } from '@nop-chaos/flux-core'
import { registerWordEditorRenderers, defineWordEditorPageSchema } from '../index.js'

vi.mock('@nop-chaos/word-editor-core', async () => {
  class CanvasEditorBridge {}
  const state = {
    isReady: true,
    isDirty: false,
    wordCount: 0,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    selection: {
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
    },
  }
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

vi.mock('../editor-canvas.js', () => ({
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
    resetFluxI18n()
    initFluxI18n()
    const registry = createDefaultRegistry()
    registerWordEditorRenderers(registry)
    const SchemaRenderer = createSchemaRenderer()
    const env: RendererEnv = {
      fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
      notify: () => undefined,
    }
    const schema = defineWordEditorPageSchema({
      type: 'word-editor-page',
      title: 'Word Editor',
    })
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://word-editor/page"
        schema={schema}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{}}
      />
    )
    expect(container.querySelector('.nop-word-editor-page')).toBeTruthy()
    expect(screen.getByTestId('editor-canvas')).toBeTruthy()
    expect(screen.getByTestId('ribbon-toolbar')).toBeTruthy()
  })
})
