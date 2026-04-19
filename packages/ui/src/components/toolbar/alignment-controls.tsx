import * as React from "react"
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from "lucide-react"
import { Button } from "../ui/button"
import { cn } from "../../lib/utils"

interface AlignmentControlsProps {
  onAlign: (align: "left" | "center" | "right") => void
  getActive?: (align: "left" | "center" | "right") => boolean
  disabled?: boolean
  className?: string
}

function AlignmentControls({ onAlign, getActive, disabled, className }: AlignmentControlsProps) {
  const aligns = [
    { key: "left" as const, Icon: AlignLeftIcon, label: "Align Left" },
    { key: "center" as const, Icon: AlignCenterIcon, label: "Align Center" },
    { key: "right" as const, Icon: AlignRightIcon, label: "Align Right" },
  ]

  return (
    <div className={cn("flex items-center", className)}>
      {aligns.map(({ key, Icon, label }) => {
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
            onClick={() => onAlign(key)}
          >
            <Icon />
          </Button>
        )
      })}
    </div>
  )
}

export { AlignmentControls, type AlignmentControlsProps }
