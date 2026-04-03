import { useState, useEffect, useRef } from 'react'
import { Search, ArrowLeft, ArrowRight, X, ReplaceAll } from 'lucide-react'
import type { CanvasEditorBridge } from '@nop-chaos/word-editor-core'
import { Button, Input } from '@nop-chaos/ui'
import { ToolbarButton, ToolbarSeparator } from './shared.js'

interface SearchReplaceProps {
  bridge: CanvasEditorBridge | null
  visible: boolean
  onClose: () => void
}

export function SearchReplace({ bridge, visible, onClose }: SearchReplaceProps) {
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultCount = searchText ? 1 : 0

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchText) {
      bridge?.command?.executeSearch(null)
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      bridge?.command?.executeSearch(searchText)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchText, bridge])

  const handlePrev = () => {
    bridge?.command?.executeSearchNavigatePre()
  }

  const handleNext = () => {
    bridge?.command?.executeSearchNavigateNext()
  }

  const handleReplace = () => {
    bridge?.command?.executeReplace(replaceText)
  }

  const handleClose = () => {
    setSearchText('')
    setReplaceText('')
    bridge?.command?.executeSearch(null)
    onClose()
  }

  if (!visible) return null

  return (
    <div className="flex items-center gap-1 p-2 border-l bg-gray-50">
      <div className="flex items-center gap-1 flex-1">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search..."
            size="sm"
            className="pl-7 w-32"
          />
        </div>
        <ToolbarButton icon={ArrowLeft} onClick={handlePrev} disabled={!searchText} title="Previous" />
        <ToolbarButton icon={ArrowRight} onClick={handleNext} disabled={!searchText} title="Next" />
        {resultCount > 0 && <span className="text-xs text-muted-foreground">{resultCount}</span>}
      </div>
      <ToolbarSeparator />
      <div className="flex items-center gap-1 flex-1">
        <div className="relative">
          <ReplaceAll className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replace..."
            size="sm"
            className="pl-7 w-32"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleReplace}
          disabled={!searchText}
        >
          Replace
        </Button>
      </div>
      <ToolbarSeparator />
      <ToolbarButton icon={X} onClick={handleClose} title="Close" />
    </div>
  )
}
