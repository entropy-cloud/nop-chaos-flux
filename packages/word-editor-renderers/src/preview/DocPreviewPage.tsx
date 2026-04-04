import { useRef, useEffect, useState } from 'react'
import { ArrowLeft, FileText } from 'lucide-react'
import { CanvasEditorBridge, DEFAULT_PAPER_SETTINGS } from '@nop-chaos/word-editor-core'
import type { DocumentData, PaperSettings } from '@nop-chaos/word-editor-core'
import { Button } from '@nop-chaos/ui'

export interface DocPreviewPageProps {
  documentData: DocumentData | null
  paperSettings?: PaperSettings
  onBack: () => void
}

export function DocPreviewPage({ documentData, paperSettings, onBack }: DocPreviewPageProps) {
  const bridge = useRef<CanvasEditorBridge>(new CanvasEditorBridge())
  const containerRef = useRef<HTMLDivElement>(null)
  const [wordCount, setWordCount] = useState<number>(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !documentData) return

    const editorData = {
      header: documentData.header ?? [],
      main: documentData.main,
      footer: documentData.footer ?? []
    }

    const settings = paperSettings ?? { ...DEFAULT_PAPER_SETTINGS }

    const instance = bridge.current
    instance.mount(container, editorData, {
      onContentChange: () => {
      },
      onRangeStyleChange: () => {
      },
      onPageSizeChange: () => {
      },
      onPageScaleChange: () => {
      }
    })

    instance.applyPaperSettings(settings)

    const wordCountPromise = instance.getWordCount()
    wordCountPromise.then((count) => {
      setWordCount(count)
    })

    return () => {
      instance.unmount()
    }
  }, [documentData, paperSettings])

  if (!documentData) {
    return (
      <main className="flex flex-col h-screen bg-[var(--nop-app-bg)]">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--nop-border)] bg-[var(--nop-nav-surface)]">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onBack}
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--nop-accent)]" />
            <h1 className="text-lg font-semibold text-[var(--nop-text-strong)]">Document Preview</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center text-[var(--nop-body-copy)]">
          No document data available
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col h-screen bg-[var(--nop-app-bg)]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--nop-border)] bg-[var(--nop-nav-surface)]">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onBack}
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--nop-accent)]" />
            <h1 className="text-lg font-semibold text-[var(--nop-text-strong)]">Document Preview</h1>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--nop-body-copy)]">
            <span className="tabular-nums">{wordCount.toLocaleString()} words</span>
          </div>
        </div>
      </header>

      <section className="flex-1 min-w-0 bg-[var(--nop-playground-stage-bg)] overflow-auto">
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </section>
    </main>
  )
}
