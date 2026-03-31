import type { ComponentType } from 'react'

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
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition cursor-pointer flex-shrink-0 flex items-center gap-1 text-sm ${
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : active
            ? 'bg-blue-50 text-blue-600'
            : 'hover:bg-gray-100 text-gray-700'
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label && <span>{label}</span>}
    </button>
  )
}

export function ToolbarSeparator() {
  return <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0" />
}

export function ToolbarGroup({
  children
}: {
  children: React.ReactNode
}) {
  return <div className="flex items-center gap-0.5">{children}</div>
}
