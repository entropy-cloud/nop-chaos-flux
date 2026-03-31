import { useState, useRef } from 'react'
import { Table, ImagePlus, Link2, SeparatorHorizontal, ArrowDownToLine } from 'lucide-react'
import type { CanvasEditorBridge } from '@nop-chaos/word-editor-core'
import { ToolbarButton, ToolbarGroup } from './shared.js'

interface InsertControlsProps {
  bridge: CanvasEditorBridge | null
}

export function InsertControls({ bridge }: InsertControlsProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [hyperlinkUrl, setHyperlinkUrl] = useState('')
  const [hyperlinkDisplay, setHyperlinkDisplay] = useState('')

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      bridge?.command?.executeImage({
        value: dataUrl,
        width: 0,
        height: 0
      })
    }
    reader.readAsDataURL(file)
  }

  const handleInsertHyperlink = () => {
    if (!hyperlinkUrl.trim()) return
    bridge?.command?.executeHyperlink({
      valueList: [{ value: hyperlinkDisplay.trim() || hyperlinkUrl.trim() }],
      url: hyperlinkUrl.trim()
    })
    setShowLinkDialog(false)
    setHyperlinkUrl('')
    setHyperlinkDisplay('')
  }

  return (
    <ToolbarGroup>
      <ToolbarButton icon={Table} onClick={() => bridge?.command?.executeInsertTable(3, 3)} title="Insert Table (3×3)" />
      <ToolbarButton icon={ImagePlus} onClick={() => imageInputRef.current?.click()} title="Insert Image" />
      <ToolbarButton icon={Link2} onClick={() => setShowLinkDialog(true)} title="Insert Hyperlink" />
      <ToolbarButton icon={SeparatorHorizontal} onClick={() => bridge?.command?.executeSeparator([])} title="Separator" />
      <ToolbarButton icon={ArrowDownToLine} onClick={() => bridge?.command?.executePageBreak()} title="Page Break" />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        hidden
      />
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLinkDialog(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3">Insert Hyperlink</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Display text"
                value={hyperlinkDisplay}
                onChange={(e) => setHyperlinkDisplay(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <input
                type="text"
                placeholder="URL (https://...)"
                value={hyperlinkUrl}
                onChange={(e) => setHyperlinkUrl(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={() => setShowLinkDialog(false)} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
                Cancel
              </button>
              <button type="button" onClick={handleInsertHyperlink} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolbarGroup>
  )
}
