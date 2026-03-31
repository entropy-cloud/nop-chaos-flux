import { useState } from 'react'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
import { Search } from 'lucide-react'
import type { CanvasEditorBridge } from '@nop-chaos/word-editor-core'
import type { EditorStoreApi } from '@nop-chaos/word-editor-core'
import { FontControls } from './FontControls.js'
import { ParagraphControls } from './ParagraphControls.js'
import { InsertControls } from './InsertControls.js'
import { TemplateControls } from './TemplateControls.js'
import { PageControls } from './PageControls.js'
import { SearchReplace } from './SearchReplace.js'
import { ToolbarButton, ToolbarSeparator } from './shared.js'

interface RibbonToolbarProps {
  bridge: CanvasEditorBridge | null
  store: EditorStoreApi
  onInsertExpr: (expr: string) => void
  onInsertTag: (tagName: string) => void
}

export function RibbonToolbar({ bridge, store, onInsertExpr, onInsertTag }: RibbonToolbarProps) {
  const [showSearch, setShowSearch] = useState(false)

  const selection = useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    (state) => state.selection
  )

  return (
    <div className="border-b bg-white/95">
      <div className="flex flex-row gap-1 p-2 items-center overflow-x-auto">
        <FontControls bridge={bridge} selection={selection} />
        <ToolbarSeparator />
        <ParagraphControls bridge={bridge} selection={selection} />
        <ToolbarSeparator />
        <InsertControls bridge={bridge} />
        <ToolbarSeparator />
        <TemplateControls onInsertExpr={onInsertExpr} onInsertTag={onInsertTag} />
        <ToolbarSeparator />
        <PageControls bridge={bridge} store={store} />
        <ToolbarSeparator />
        <ToolbarButton icon={Search} onClick={() => setShowSearch(!showSearch)} active={showSearch} title="Search & Replace" />
      </div>
      <SearchReplace bridge={bridge} visible={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  )
}
