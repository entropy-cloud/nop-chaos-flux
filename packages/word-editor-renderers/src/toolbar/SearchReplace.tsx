import { useState, useEffect, useRef } from 'react'
import { Search, ArrowLeft, ArrowRight, X, ReplaceAll } from 'lucide-react'
import type { CanvasEditorBridge } from '@nop-chaos/word-editor-core'
import { ToolbarButton, ToolbarSeparator } from './shared.js'

interface SearchReplaceProps {
  bridge: CanvasEditorBridge | null
  visible: boolean
  onClose: () => void
}

export function SearchReplace({ bridge, visible, onClose }: SearchReplaceProps) {
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [resultCount, setResultCount] = useState(0)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!visible) {
      setSearchText('')
      setReplaceText('')
      setResultCount(0)
      bridge?.command?.executeSearch(null)
      return
    }
  }, [visible, bridge])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchText) {
      setResultCount(0)
      bridge?.command?.executeSearch(null)
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      bridge?.command?.executeSearch(searchText)
      setResultCount(1)
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
    bridge?.command?.executeSearch(null)
    onClose()
  }

  if (!visible) return null

  return (
    <div className="flex items-center gap-1 p-2 border-l bg-gray-50">
      <div className="flex items-center gap-1 flex-1">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search..."
            className="pl-7 pr-2 py-1 border rounded text-sm w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <ToolbarButton icon={ArrowLeft} onClick={handlePrev} disabled={!searchText} title="Previous" />
        <ToolbarButton icon={ArrowRight} onClick={handleNext} disabled={!searchText} title="Next" />
        {resultCount > 0 && <span className="text-xs text-gray-600">{resultCount}</span>}
      </div>
      <ToolbarSeparator />
      <div className="flex items-center gap-1 flex-1">
        <div className="relative">
          <ReplaceAll className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replace..."
            className="pl-7 pr-2 py-1 border rounded text-sm w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={handleReplace}
          disabled={!searchText}
          className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700"
        >
          Replace
        </button>
      </div>
      <ToolbarSeparator />
      <ToolbarButton icon={X} onClick={handleClose} title="Close" />
    </div>
  )
}
