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
      <select
        value="a4"
        onChange={(e) => handlePaperSize(e.target.value)}
        className="border rounded text-sm px-1.5 py-1 max-w-[80px]"
        title="Paper Size"
      >
        {Object.entries(PAPER_SIZE_PRESETS).map(([key]) => (
          <option key={key} value={key}>
            {key.toUpperCase()}
          </option>
        ))}
      </select>
      <ToolbarButton
        icon={Rows3}
        onClick={handleOrientation}
        title={paperSettings.direction === 'vertical' ? 'Switch to Landscape' : 'Switch to Portrait'}
      />
      <ToolbarButton icon={LayoutGrid} onClick={() => setShowMarginDialog(true)} title="Set Margins" />
      <ToolbarSeparator />
      <ToolbarButton icon={FileText} onClick={() => setShowWatermarkDialog(true)} title="Watermark" />
      <ToolbarButton icon={Printer} onClick={() => bridge?.command?.executePrint()} title="Print" />
      {showMarginDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowMarginDialog(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3">Page Margins</h3>
            <div className="space-y-2">
              {(['Top', 'Right', 'Bottom', 'Left'] as const).map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-14">{label}</span>
                  <input
                    type="number"
                    value={margins[i]}
                    onChange={(e) => {
                      const newMargins = [...margins] as [number, number, number, number]
                      newMargins[i] = Number(e.target.value) || 0
                      setMargins(newMargins)
                    }}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={() => setShowMarginDialog(false)} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
              <button type="button" onClick={handleApplyMargins} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">Apply</button>
            </div>
          </div>
        </div>
      )}
      {showWatermarkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowWatermarkDialog(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3">Watermark</h3>
            <input
              type="text"
              placeholder="Watermark text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={handleDeleteWatermark} className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
                Delete
              </button>
              <button type="button" onClick={handleAddWatermark} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                Add
              </button>
              <button type="button" onClick={() => { setShowWatermarkDialog(false); setWatermarkText('') }} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolbarGroup>
  )
}
