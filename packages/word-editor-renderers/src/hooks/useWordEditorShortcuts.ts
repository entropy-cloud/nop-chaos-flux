import { useEffect } from 'react'
import type { CanvasEditorBridge } from '@nop-chaos/word-editor-core'
import { RowFlex } from '@nop-chaos/word-editor-core'

interface UseWordEditorShortcutsOptions {
  bridge: CanvasEditorBridge | null
  onSave?: () => void
}

export function useWordEditorShortcuts(options: UseWordEditorShortcutsOptions): void {
  const { bridge, onSave } = options

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return

      const key = event.key.toLowerCase()

      switch (key) {
        case 'b':
          event.preventDefault()
          bridge?.command?.executeBold()
          break
        case 'i':
          event.preventDefault()
          bridge?.command?.executeItalic()
          break
        case 'u':
          event.preventDefault()
          bridge?.command?.executeUnderline()
          break
        case 'z': {
          event.preventDefault()
          if (event.shiftKey) {
            bridge?.command?.executeRedo()
          } else {
            bridge?.command?.executeUndo()
          }
          break
        }
        case 'y':
          event.preventDefault()
          bridge?.command?.executeRedo()
          break
        case 's':
          event.preventDefault()
          onSave?.()
          break
        case 'f':
          event.preventDefault()
          break
        case 'p':
          event.preventDefault()
          bridge?.command?.executePrint()
          break
        case 'l':
          event.preventDefault()
          bridge?.command?.executeRowFlex(RowFlex.LEFT)
          break
        case 'e':
          event.preventDefault()
          bridge?.command?.executeRowFlex(RowFlex.CENTER)
          break
        case 'r':
          event.preventDefault()
          bridge?.command?.executeRowFlex(RowFlex.RIGHT)
          break
        case '[':
          event.preventDefault()
          bridge?.command?.executeSizeMinus()
          break
        case ']':
          event.preventDefault()
          bridge?.command?.executeSizeAdd()
          break
        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [bridge, onSave])
}
