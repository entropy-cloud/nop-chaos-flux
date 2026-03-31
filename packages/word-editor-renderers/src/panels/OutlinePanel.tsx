import { useEffect, useState, useCallback } from 'react'
import { ChevronRight, ChevronDown, FileText } from 'lucide-react'
import type { CanvasEditorBridge } from '@nop-chaos/word-editor-core'
import { ScrollArea } from '@nop-chaos/ui'
import type { IElement, TitleLevel } from '@hufe921/canvas-editor'

interface OutlinePanelProps {
  bridge: CanvasEditorBridge | null
}

interface HeadingItem {
  id: string
  name: string
  level: TitleLevel
  pageNo?: number
  subCatalog: HeadingItem[]
  expanded: boolean
}

const TITLE_LEVEL_ORDER: Record<TitleLevel, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6
}

export function OutlinePanel({ bridge }: OutlinePanelProps) {
  const [outline, setOutline] = useState<HeadingItem[]>([])

  const refreshOutline = useCallback(() => {
    if (!bridge?.command?.getValue) {
      setOutline([])
      return
    }

    try {
      const result = bridge.command.getValue()
      if (!result?.data?.main) {
        setOutline([])
        return
      }

      const extractHeadings = (elements: IElement[]): HeadingItem[] => {
        const headings: HeadingItem[] = []

        for (const element of elements) {
          if (element.level) {
            headings.push({
              id: element.titleId || element.id || Math.random().toString(),
              name: element.value || 'Untitled',
              level: element.level,
              pageNo: 1,
              subCatalog: [],
              expanded: element.level === 'first' || element.level === 'second'
            })
          }
        }

        return headings
      }

      const buildHeadingTree = (headings: HeadingItem[]): HeadingItem[] => {
        const result: HeadingItem[] = []
        const stack: HeadingItem[] = []

        for (const heading of headings) {
          while (stack.length > 0 && TITLE_LEVEL_ORDER[stack[stack.length - 1].level] >= TITLE_LEVEL_ORDER[heading.level]) {
            stack.pop()
          }

          if (stack.length === 0) {
            result.push(heading)
          } else {
            stack[stack.length - 1].subCatalog.push(heading)
          }

          stack.push(heading)
        }

        return result
      }

      const allHeadings = extractHeadings(result.data.main)
      const tree = buildHeadingTree(allHeadings)

      setOutline(tree)
    } catch (error) {
      console.error('Failed to fetch outline:', error)
      setOutline([])
    }
  }, [bridge])

  useEffect(() => {
    refreshOutline()
  }, [refreshOutline])

  const toggleExpanded = useCallback((itemIndex: number) => {
    setOutline(prev => {
      const newOutline = [...prev]
      newOutline[itemIndex].expanded = !newOutline[itemIndex].expanded
      return newOutline
    })
  }, [])

  useEffect(() => {
    if (!bridge?.listener) return

    const originalOnContentChange = bridge.listener.contentChange

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    bridge.listener!.contentChange = () => {
      if (originalOnContentChange) {
        originalOnContentChange()
      }

      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        refreshOutline()
      }, 500)
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      if (originalOnContentChange) {
        bridge.listener!.contentChange = originalOnContentChange
      }
    }
  }, [bridge, refreshOutline])

  const navigateToHeading = useCallback((item: HeadingItem) => {
    if (!bridge?.command?.executeLocationCatalog) return

    try {
      bridge.command.executeLocationCatalog(item.id)
    } catch (error) {
      console.error('Failed to navigate to heading:', error)
    }
  }, [bridge])

  const getLevelTextSize = (level: string) => {
    const levelMap: Record<string, string> = {
      first: 'text-[13px] font-semibold',
      second: 'text-[12px] font-medium',
      third: 'text-[12px] font-normal',
      fourth: 'text-[11px] font-normal',
      fifth: 'text-[11px] font-normal',
      sixth: 'text-[11px] font-normal'
    }
    return levelMap[level] || 'text-[12px] font-normal'
  }

  const renderSubCatalog = (items: HeadingItem[], level: number): React.ReactNode => {
    if (!items || items.length === 0) return null

    return (
      <div className="ml-3 mt-1">
        {items.map((subItem) => (
          <div key={subItem.id} className="py-0.5">
            <button
              type="button"
              onClick={() => navigateToHeading(subItem)}
              className={`flex items-center gap-1.5 w-full text-left ${getLevelTextSize(subItem.level)} text-[var(--nop-body-copy)] hover:text-[var(--nop-accent)] hover:bg-[var(--nop-surface-soft)] rounded px-2 py-1 transition-colors outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30`}
            >
              <span className="truncate flex-1">{subItem.name}</span>
            </button>
            {subItem.subCatalog && subItem.subCatalog.length > 0 && (
              renderSubCatalog(subItem.subCatalog, level + 1)
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--nop-border)]">
        <h2 className="text-sm font-semibold text-[var(--nop-text-strong)]">Outline</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3">
          {outline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <FileText className="w-8 h-8 text-[var(--nop-body-copy)] opacity-50 mb-2" />
              <p className="text-xs text-[var(--nop-body-copy)] opacity-70">
                No headings found
              </p>
              <p className="text-[10px] text-[var(--nop-body-copy)] opacity-50 mt-1">
                Add headings to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {outline.map((item, index) => (
                <div key={item.id}>
                  <div className="flex items-center gap-0.5 py-0.5">
                    {item.subCatalog && item.subCatalog.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(index)}
                        className="p-0.5 rounded hover:bg-[var(--nop-surface-soft)] transition-colors outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30"
                      >
                        {item.expanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-[var(--nop-body-copy)]" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-[var(--nop-body-copy)]" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigateToHeading(item)}
                      className={`flex items-center gap-1.5 w-full text-left flex-1 ${getLevelTextSize(item.level)} text-[var(--nop-body-copy)] hover:text-[var(--nop-accent)] hover:bg-[var(--nop-surface-soft)] rounded px-2 py-1 transition-colors outline-none focus:ring-2 focus:ring-[var(--nop-accent)] focus:ring-opacity-30`}
                    >
                      <span className="truncate">{item.name}</span>
                    </button>
                  </div>
                  {item.expanded && item.subCatalog && item.subCatalog.length > 0 && (
                    renderSubCatalog(item.subCatalog, 2)
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
