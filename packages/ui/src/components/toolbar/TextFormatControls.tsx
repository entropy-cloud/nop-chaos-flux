import * as React from "react"
import { BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon } from "lucide-react"
import { Button } from "../ui/button"
import { cn } from "../../lib/utils"

interface TextFormatControlsProps {
  onStyle: (tool: "bold" | "italic" | "underline" | "strikethrough") => void
  getActive?: (tool: "bold" | "italic" | "underline" | "strikethrough") => boolean
  disabled?: boolean
  className?: string
}

function TextFormatControls({ onStyle, getActive, disabled, className }: TextFormatControlsProps) {
  const tools = [
    { key: "bold" as const, Icon: BoldIcon, label: "Bold" },
    { key: "italic" as const, Icon: ItalicIcon, label: "Italic" },
    { key: "underline" as const, Icon: UnderlineIcon, label: "Underline" },
    { key: "strikethrough" as const, Icon: StrikethroughIcon, label: "Strikethrough" },
  ]

  return (
    <div className={cn("flex items-center", className)}>
      {tools.map(({ key, Icon, label }) => {
        const active = getActive?.(key) ?? false
        return (
          <Button
            key={key}
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            className={cn(active && "bg-accent text-accent-foreground")}
            onClick={() => onStyle(key)}
          >
            <Icon />
          </Button>
        )
      })}
    </div>
  )
}

export { TextFormatControls, type TextFormatControlsProps }
