import React from 'react';
import { cn } from '@nop-chaos/ui';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import type { BoardItem } from './kanban.types.js';

export interface KanbanColumnHeaderProps {
  column: BoardItem;
  cardCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
  columnHeaderRegion?: { render: () => React.ReactNode } | null;
  columnHeaderToolbarRegion?: { render: () => React.ReactNode } | null;
  dndEnabled?: boolean;
  onResizeStart?: (e: React.PointerEvent) => void;
  wipWarning?: boolean;
  wipText?: string;
}

export function KanbanColumnHeader({
  column,
  cardCount,
  collapsed,
  onToggleCollapse,
  className,
  columnHeaderRegion,
  columnHeaderToolbarRegion,
  dndEnabled,
  onResizeStart,
  wipWarning,
  wipText,
}: KanbanColumnHeaderProps) {
  const title = (column.data?.title as string) || '';

  if (columnHeaderRegion) {
    return (
      <div data-slot="kanban-column-header" data-dnd-column-header={dndEnabled ? 'true' : undefined} data-column-id={column.id} className={cn('nop-kanban-column-header', className)}>
        {columnHeaderRegion.render()}
        {onResizeStart && (
          <div
            data-slot="kanban-column-resize-handle"
            className="nop-kanban-column-resize-handle absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:w-0.5 z-10"
            onPointerDown={onResizeStart}
          />
        )}
      </div>
    );
  }

  return (
    <div
      data-slot="kanban-column-header"
      data-dnd-column-header={dndEnabled ? 'true' : undefined}
      data-column-id={column.id}
      className={cn(
        'nop-kanban-column-header flex items-center gap-2 px-3 py-2 border-b relative',
        wipWarning && 'border-red-400 bg-red-50',
        className,
      )}
    >
      {onResizeStart && (
        <div
          data-slot="kanban-column-resize-handle"
          className="nop-kanban-column-resize-handle absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:w-0.5 z-10"
          onPointerDown={onResizeStart}
        />
      )}
      <div data-slot="kanban-column-drag-handle" className="nop-kanban-column-drag-handle cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical className="w-4 h-4" />
      </div>
      <span className="font-semibold text-sm flex-1 truncate">{title}</span>
      <span className={cn(
        'text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center',
        wipWarning ? 'bg-red-100 text-red-600 font-bold' : 'text-gray-400 bg-gray-100',
      )}>
        {wipText ?? cardCount}
      </span>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="p-0.5 rounded hover:bg-gray-100 text-gray-400"
        aria-label={collapsed ? 'Expand column' : 'Collapse column'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {columnHeaderToolbarRegion?.render()}
    </div>
  );
}
