import type { ComponentType } from 'react'
import { Button, Separator } from '@nop-chaos/ui'
import { cn } from '@nop-chaos/ui'

export interface ToolbarButtonProps {
  icon?: ComponentType<{ className?: string }>
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  label?: string
}

export function ToolbarButton({
  icon: Icon,
  onClick,
  active,
  disabled,
  title,
  label
}: ToolbarButtonProps) {
  if (label) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-pressed={active}
        className={cn('flex-shrink-0', active && 'bg-accent text-accent-foreground')}
      >
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </Button>
    )
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={cn('flex-shrink-0', active && 'bg-accent text-accent-foreground')}
    >
      {Icon && <Icon className="w-4 h-4" />}
    </Button>
  )
}

export function ToolbarSeparator() {
  return <Separator orientation="vertical" className="h-6 mx-1 flex-shrink-0" />
}

export function ToolbarGroup({
  children
}: {
  children: React.ReactNode
}) {
  return <div className="flex items-center gap-0.5">{children}</div>
}
