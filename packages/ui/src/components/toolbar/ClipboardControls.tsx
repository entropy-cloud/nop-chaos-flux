import * as React from "react"
import { CopyIcon, ScissorsIcon, ClipboardPasteIcon, Trash2Icon } from "lucide-react"
import { Button } from "../ui/button"
import { cn } from "../../lib/utils"

interface ClipboardControlsProps {
  onCopy?: () => void
  onCut?: () => void
  onPaste?: () => void
  onClear?: () => void
  disabled?: boolean
  className?: string
}

function ClipboardControls({ onCopy, onCut, onPaste, onClear, disabled, className }: ClipboardControlsProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {onCopy !== undefined && (
        <Button variant="ghost" size="icon-xs" disabled={disabled} aria-label="Copy" onClick={onCopy}>
          <CopyIcon />
        </Button>
      )}
      {onCut !== undefined && (
        <Button variant="ghost" size="icon-xs" disabled={disabled} aria-label="Cut" onClick={onCut}>
          <ScissorsIcon />
        </Button>
      )}
      {onPaste !== undefined && (
        <Button variant="ghost" size="icon-xs" disabled={disabled} aria-label="Paste" onClick={onPaste}>
          <ClipboardPasteIcon />
        </Button>
      )}
      {onClear !== undefined && (
        <Button variant="ghost" size="icon-xs" disabled={disabled} aria-label="Clear" onClick={onClear}>
          <Trash2Icon />
        </Button>
      )}
    </div>
  )
}

export { ClipboardControls, type ClipboardControlsProps }
