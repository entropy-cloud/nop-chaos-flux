import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n'
import { DocPreviewPage } from '../preview/DocPreviewPage.js'

const bridgeState = {
  mountedDocs: [] as string[],
  wordCountResolvers: [] as Array<(value: number) => void>,
}

vi.mock('@nop-chaos/word-editor-core', async () => {
  class CanvasEditorBridge {
    mount(_container: HTMLDivElement, editorData: { main: Array<{ value?: string }> }) {
      bridgeState.mountedDocs.push(String(editorData.main[0]?.value ?? ''))
    }

    applyPaperSettings() {}

    getWordCount() {
      return new Promise<number>((resolve) => {
        bridgeState.wordCountResolvers.push(resolve)
      })
    }

    unmount() {}
  }

  return {
    CanvasEditorBridge,
    DEFAULT_PAPER_SETTINGS: { width: 794, height: 1123 }
  }
})

describe('DocPreviewPage', () => {
  it('ignores stale word-count results after switching documents', async () => {
    resetFluxI18n()
    initFluxI18n()
    await changeLanguage('zh-CN')
    bridgeState.mountedDocs.length = 0
    bridgeState.wordCountResolvers.length = 0

    const { rerender } = render(
      <DocPreviewPage
        documentData={{ header: [], main: [{ value: 'Doc A' }], footer: [] } as any}
        onBack={vi.fn()}
      />
    )

    rerender(
      <DocPreviewPage
        documentData={{ header: [], main: [{ value: 'Doc B' }], footer: [] } as any}
        onBack={vi.fn()}
      />
    )

    expect(bridgeState.mountedDocs).toEqual(['Doc A', 'Doc B'])

    bridgeState.wordCountResolvers[0]?.(11)
    bridgeState.wordCountResolvers[1]?.(22)

    await waitFor(() => {
      expect(screen.getByText('22 个词')).toBeTruthy()
    })
  })
})
