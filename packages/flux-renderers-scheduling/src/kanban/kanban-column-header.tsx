import React from 'react';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
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
  onResizeKeyDown?: (e: React.KeyboardEvent) => void;
  columnWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  onDragHandleKeyDown?: (e: React.KeyboardEvent, columnId: string) => void;
  onClick?: () => void;
  wipWarning?: boolean;
  wipText?: string;
  registerColumnHeader?: (el: HTMLElement, columnId: string) => () => void;
  aggregate?: { label: string; display: string };
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
  onResizeKeyDown,
  columnWidth = 280,
  minWidth = 200,
  maxWidth = 600,
  onDragHandleKeyDown,
  onClick,
  wipWarning,
  wipText,
  registerColumnHeader,
  aggregate,
}: KanbanColumnHeaderProps) {
  const headerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!registerColumnHeader || !headerRef.current) return;
    return registerColumnHeader(headerRef.current, column.id);
  }, [registerColumnHeader, column.id]);

  const title = (column.title || column.data?.title || '') as string;

  if (columnHeaderRegion) {
    return (
      // [G4-视角9-01] group 而非 button——头内含真实拖拽/折叠按钮，交互角色
      // 不得嵌套；点击选择列的行为保留在可聚焦的 group 上。
      <div ref={headerRef} data-slot="kanban-column-header" data-dnd-column-header={dndEnabled || undefined} data-column-id={column.id} onClick={onClick} role="group" aria-label={title} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }} className={cn('nop-kanban-column-header', className)}>
        {columnHeaderRegion.render()}
        {onResizeStart && (
          <div
            data-slot="kanban-column-resize-handle"
            role="separator"
            tabIndex={0}
            aria-valuenow={columnWidth}
            aria-valuemin={minWidth}
            aria-valuemax={maxWidth}
            aria-orientation="vertical"
            aria-label={t('scheduling.kanban.resizeColumnLabel')}
            className="nop-kanban-column-resize-handle absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary hover:w-0.5 z-10"
            onPointerDown={onResizeStart}
            onKeyDown={onResizeKeyDown}
          />
        )}
      </div>
    );
  }

  return (
    <div
      ref={headerRef}
      data-slot="kanban-column-header"
      data-dnd-column-header={dndEnabled || undefined}
      data-column-id={column.id}
      onClick={onClick}
      role="group"
      aria-label={title}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      className={cn(
        'nop-kanban-column-header flex items-center gap-2 px-3 py-2 border-b relative',
        wipWarning && 'border-destructive/40 bg-destructive/10',
        className,
      )}
    >
      {onResizeStart && (
        <div
          data-slot="kanban-column-resize-handle"
          role="separator"
          tabIndex={0}
          aria-valuenow={columnWidth}
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          aria-orientation="vertical"
          aria-label={t('scheduling.kanban.resizeColumnLabel')}
          className="nop-kanban-column-resize-handle absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary hover:w-0.5 z-10"
          onPointerDown={onResizeStart}
          onKeyDown={onResizeKeyDown}
        />
      )}
      <Button
        variant="ghost"
        size="sm"
        data-slot="kanban-column-drag-handle"
        className="nop-kanban-column-drag-handle px-0.5 py-0.5 h-auto rounded"
        tabIndex={dndEnabled ? 0 : -1}
        aria-label={t('scheduling.kanban.dragColumnLabel', { title })}
        aria-roledescription="drag handle"
        onKeyDown={(e) => onDragHandleKeyDown?.(e, column.id)}
      >
        <GripVertical className="w-4 h-4" />
      </Button>
      <span className="font-semibold text-sm flex-1 truncate">{title}</span>
      {aggregate && (
        <span data-slot="kanban-column-aggregate" className="text-xs text-muted-foreground whitespace-nowrap">
          {aggregate.label}: {aggregate.display}
        </span>
      )}
      <span className={cn(
        'text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center',
        wipWarning ? 'bg-destructive/15 text-destructive font-bold' : 'text-muted-foreground bg-muted',
      )}>
        {wipText ?? cardCount}
        {/* 20-07: the two badge states share the same visible text and differ
            only in color — the sr-only suffix is the non-color channel that
            makes the exceeded state perceivable without vision. */}
        {wipWarning ? <span className="sr-only">{t('scheduling.kanban.wipExceeded')}</span> : null}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleCollapse}
        className="p-0.5 h-auto text-muted-foreground"
        aria-label={collapsed ? t('scheduling.kanban.expandColumn') : t('scheduling.kanban.collapseColumn')}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>
      {columnHeaderToolbarRegion?.render()}
    </div>
  );
}
