import { useRef, useEffect } from 'react'
import type { IEditorData } from '@hufe921/canvas-editor'
import type { EditorStoreApi } from '@nop-chaos/word-editor-core'
import type { CanvasEditorBridge } from '@nop-chaos/word-editor-core'
import { DEFAULT_PAPER_SETTINGS } from '@nop-chaos/word-editor-core'
import type { PaperSettings, SavedDocumentData } from '@nop-chaos/word-editor-core'
import { loadDocument } from '@nop-chaos/word-editor-core'


export interface EditorCanvasProps {
  editorStore: EditorStoreApi
  bridge: CanvasEditorBridge
}

export function EditorCanvas({ editorStore, bridge }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let saveTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const debouncedSave = () => {
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        const value = bridge.getValue()
        if (value) {
          const editorValue = value.data
          const paperSettings = bridge.getPaperSettings()
          const saved: SavedDocumentData = {
            data: {
              header: editorValue.header ?? [],
              main: editorValue.main,
              footer: editorValue.footer ?? []
            },
            paperSettings: paperSettings ?? { ...DEFAULT_PAPER_SETTINGS },
            savedAt: new Date().toISOString()
          }
          localStorage.setItem('nop-word-editor-document', JSON.stringify(saved))
          editorStore.setDirty(false)
        }
      }, 500)
    }

    const savedDocument = loadDocument()
    let editorData: IEditorData
    let paperSettings: PaperSettings

    if (savedDocument) {
      const header = savedDocument.data.header || []
      const footer = savedDocument.data.footer || []
      editorData = {
        header,
        main: savedDocument.data.main,
        footer
      }
      paperSettings = savedDocument.paperSettings
    } else {
      editorData = {
        header: [],
        main: [{ value: 'Hello World' }],
        footer: []
      }
      paperSettings = { ...DEFAULT_PAPER_SETTINGS }
    }

    bridge.mount(container, editorData, {
      onContentChange: () => {
        debouncedSave()
        editorStore.setDirty(true)
      },
      onRangeStyleChange: (payload) => {
        editorStore.setSelection({
          bold: payload.bold,
          italic: payload.italic,
          underline: payload.underline,
          strikeout: payload.strikeout,
          font: payload.font,
          size: payload.size,
          color: payload.color,
          highlight: payload.highlight,
          rowFlex: payload.rowFlex ?? null,
          level: payload.level ?? null,
          listType: payload.listType ?? null,
          listStyle: payload.listStyle ?? null,
          rowMargin: payload.rowMargin ?? 0,
          undo: payload.undo ?? false,
          redo: payload.redo ?? false
        })
      },
      onPageSizeChange: (payload) => {
        editorStore.setTotalPages(payload)
      },
      onPageScaleChange: (payload) => {
        editorStore.setScale(payload)
      }
    })

    bridge.applyPaperSettings(paperSettings)

    editorStore.setBridge(bridge)

    if (savedDocument) {
      editorStore.setPaperSettings(paperSettings)
      editorStore.setDirty(false)
    }

    const wordCountPromise = bridge.getWordCount()
    wordCountPromise.then((count) => {
      if (!cancelled) editorStore.setWordCount(count)
    })

    return () => {
      cancelled = true
      if (saveTimer) clearTimeout(saveTimer)
      bridge.unmount()
      editorStore.setBridge(null)
      editorStore.setReady(false)
    }
  }, [bridge, editorStore])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
