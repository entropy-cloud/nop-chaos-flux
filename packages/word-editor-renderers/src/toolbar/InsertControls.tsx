import { useState, useRef } from 'react'
import { Table, ImagePlus, Link2, SeparatorHorizontal, ArrowDownToLine, BarChart3, QrCode } from 'lucide-react'
import type { CanvasEditorBridge, DocChart, DocCode } from '@nop-chaos/word-editor-core'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input
} from '@nop-chaos/ui'
import { ToolbarButton, ToolbarGroup } from './shared.js'
import { ChartDialog } from '../dialogs/ChartDialog.js'
import { CodeDialog } from '../dialogs/CodeDialog.js'

interface InsertControlsProps {
  bridge: CanvasEditorBridge | null
  onChartSave?: (chart: DocChart) => void
  onCodeSave?: (code: DocCode) => void
}

export function InsertControls({ bridge, onChartSave, onCodeSave }: InsertControlsProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showChartDialog, setShowChartDialog] = useState(false)
  const [showCodeDialog, setShowCodeDialog] = useState(false)
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

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setShowLinkDialog(false)
      setHyperlinkUrl('')
      setHyperlinkDisplay('')
    }
  }

  return (
    <ToolbarGroup>
      <ToolbarButton icon={Table} onClick={() => bridge?.command?.executeInsertTable(3, 3)} title="Insert Table (3×3)" />
      <ToolbarButton icon={ImagePlus} onClick={() => imageInputRef.current?.click()} title="Insert Image" />
      <ToolbarButton icon={Link2} onClick={() => setShowLinkDialog(true)} title="Insert Hyperlink" />
      <ToolbarButton icon={BarChart3} onClick={() => setShowChartDialog(true)} title="Insert Chart" />
      <ToolbarButton icon={QrCode} onClick={() => setShowCodeDialog(true)} title="Insert Barcode/QR Code" />
      <ToolbarButton icon={SeparatorHorizontal} onClick={() => bridge?.command?.executeSeparator([])} title="Separator" />
      <ToolbarButton icon={ArrowDownToLine} onClick={() => bridge?.command?.executePageBreak()} title="Page Break" />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        hidden
      />
      <Dialog open={showLinkDialog} onOpenChange={handleDialogClose}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Insert Hyperlink</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Display text"
              value={hyperlinkDisplay}
              onChange={(e) => setHyperlinkDisplay(e.target.value)}
              size="sm"
            />
            <Input
              placeholder="URL (https://...)"
              value={hyperlinkUrl}
              onChange={(e) => setHyperlinkUrl(e.target.value)}
              size="sm"
            />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleInsertHyperlink} disabled={!hyperlinkUrl.trim()}>
              Insert
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ChartDialog
        open={showChartDialog}
        onClose={() => setShowChartDialog(false)}
        onSave={(chart) => {
          onChartSave?.(chart)
          setShowChartDialog(false)
        }}
      />

      <CodeDialog
        open={showCodeDialog}
        onClose={() => setShowCodeDialog(false)}
        onSave={(code) => {
          onCodeSave?.(code)
          setShowCodeDialog(false)
        }}
      />
    </ToolbarGroup>
  )
}
