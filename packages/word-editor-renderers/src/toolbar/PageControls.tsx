import { useState } from 'react'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
import {
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize,
  LayoutGrid,
  Printer,
  Rows3
} from 'lucide-react'
import type { CanvasEditorBridge, EditorStoreApi } from '@nop-chaos/word-editor-core'
import { PAPER_SIZE_PRESETS, PageMode, PaperDirection } from '@nop-chaos/word-editor-core'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  NativeSelect,
  NativeSelectOption
} from '@nop-chaos/ui'
import { ToolbarButton, ToolbarSeparator, ToolbarGroup } from './shared.js'

interface PageControlsProps {
  bridge: CanvasEditorBridge | null
  store: EditorStoreApi
}

export function PageControls({ bridge, store }: PageControlsProps) {
  const scale = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    (state) => state.scale
  )

  const paperSettings = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    (state) => state.paperSettings
  )

  const [showMarginDialog, setShowMarginDialog] = useState(false)
  const [showWatermarkDialog, setShowWatermarkDialog] = useState(false)
  const [margins, setMargins] = useState<[number, number, number, number]>([100, 120, 100, 120])
  const [watermarkText, setWatermarkText] = useState('')

  const handleZoomIn = () => bridge?.command?.executePageScaleAdd()
  const handleZoomOut = () => bridge?.command?.executePageScaleMinus()
  const handleZoomReset = () => bridge?.command?.executePageScaleRecovery()

  const [pageMode, setPageMode] = useState<string>(PageMode.PAGING)

  const handlePageModeToggle = () => {
    const nextMode = pageMode === PageMode.PAGING ? PageMode.CONTINUITY : PageMode.PAGING
    bridge?.command?.executePageMode(nextMode)
    setPageMode(nextMode)
  }

  const handlePaperSize = (key: string) => {
    const preset = PAPER_SIZE_PRESETS[key]
    if (preset) {
      bridge?.command?.executePaperSize(preset.width, preset.height)
    }
  }

  const handleOrientation = () => {
    const newDir = paperSettings.direction === 'vertical'
      ? PaperDirection.HORIZONTAL
      : PaperDirection.VERTICAL
    bridge?.command?.executePaperDirection(newDir)
  }

  const handleApplyMargins = () => {
    bridge?.command?.executeSetPaperMargin(margins)
    setShowMarginDialog(false)
  }

  const handleAddWatermark = () => {
    if (watermarkText.trim()) {
      bridge?.command?.executeAddWatermark({ data: watermarkText.trim() })
    }
    setShowWatermarkDialog(false)
    setWatermarkText('')
  }

  const handleDeleteWatermark = () => {
    bridge?.command?.executeDeleteWatermark()
    setShowWatermarkDialog(false)
    setWatermarkText('')
  }

  return (
    <ToolbarGroup>
      <ToolbarButton icon={FileText} onClick={handlePageModeToggle} title="Toggle Page Mode" />
      <ToolbarSeparator />
      <ToolbarButton icon={ZoomOut} onClick={handleZoomOut} title="Zoom Out" />
      <span className="text-xs text-gray-500 w-10 text-center">{Math.round(scale * 100)}%</span>
      <ToolbarButton icon={ZoomIn} onClick={handleZoomIn} title="Zoom In" />
      <ToolbarButton icon={Maximize} onClick={handleZoomReset} title="Reset Zoom" />
      <ToolbarSeparator />
      <NativeSelect
        value="a4"
        onChange={(e) => handlePaperSize(e.target.value)}
        title="Paper Size"
        size="xs"
        className="max-w-[80px]"
      >
        {Object.entries(PAPER_SIZE_PRESETS).map(([key]) => (
          <NativeSelectOption key={key} value={key}>
            {key.toUpperCase()}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <ToolbarButton
        icon={Rows3}
        onClick={handleOrientation}
        title={paperSettings.direction === 'vertical' ? 'Switch to Landscape' : 'Switch to Portrait'}
      />
      <ToolbarButton icon={LayoutGrid} onClick={() => setShowMarginDialog(true)} title="Set Margins" />
      <ToolbarSeparator />
      <ToolbarButton icon={FileText} onClick={() => setShowWatermarkDialog(true)} title="Watermark" />
      <ToolbarButton icon={Printer} onClick={() => bridge?.command?.executePrint()} title="Print" />

      <Dialog open={showMarginDialog} onOpenChange={(open) => { if (!open) setShowMarginDialog(false) }}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Page Margins</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(['Top', 'Right', 'Bottom', 'Left'] as const).map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-14">{label}</span>
                <Input
                  type="number"
                  value={margins[i]}
                  onChange={(e) => {
                    const newMargins = [...margins] as [number, number, number, number]
                    newMargins[i] = Number(e.target.value) || 0
                    setMargins(newMargins)
                  }}
                  size="sm"
                  className="flex-1"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => setShowMarginDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleApplyMargins}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWatermarkDialog} onOpenChange={(open) => { if (!open) { setShowWatermarkDialog(false); setWatermarkText('') } }}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Watermark</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Watermark text"
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            size="sm"
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="destructive" size="sm" onClick={handleDeleteWatermark}>
              Delete
            </Button>
            <Button size="sm" onClick={handleAddWatermark} disabled={!watermarkText.trim()}>
              Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowWatermarkDialog(false); setWatermarkText('') }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ToolbarGroup>
  )
}
