import * as React from "react"
import { Undo2Icon, Redo2Icon } from "lucide-react"
import { Button } from "../ui/button"
import { cn } from "../../lib/utils"

interface UndoRedoControlsProps {
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  disabled?: boolean
  className?: string
}

function UndoRedoControls({ onUndo, onRedo, canUndo = true, canRedo = true, disabled, className }: UndoRedoControlsProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={disabled || !canUndo}
        aria-label="Undo"
        onClick={onUndo}
      >
        <Undo2Icon />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={disabled || !canRedo}
        aria-label="Redo"
        onClick={onRedo}
      >
        <Redo2Icon />
      </Button>
    </div>
  )
}

export { UndoRedoControls, type UndoRedoControlsProps }
