import React, { useRef, useEffect } from 'react';
import { cn } from '@nop-chaos/ui';
import { History, X } from 'lucide-react';

export interface KanbanAction {
  id: string;
  type: 'cardMove' | 'cardCreate' | 'cardDelete' | 'cardUpdate' | 'columnCreate' | 'columnDelete';
  actor: { id: string; name: string };
  timestamp: string;
  detail: {
    cardId?: string;
    fromColumnId?: string;
    toColumnId?: string;
    fromIndex?: number;
    toIndex?: number;
    changes?: Record<string, { from: unknown; to: unknown }>;
  };
}

export interface KanbanActivityLogProps {
  actions: KanbanAction[];
  open: boolean;
  onClose: () => void;
  filterColumnId?: string;
  filterType?: string;
  className?: string;
}

function formatActionDescription(action: KanbanAction, columnNames: Record<string, string>): string {
  const actor = action.actor.name;
  const fromCol = action.detail.fromColumnId ? columnNames[action.detail.fromColumnId] || action.detail.fromColumnId : '';
  const toCol = action.detail.toColumnId ? columnNames[action.detail.toColumnId] || action.detail.toColumnId : '';
  const cardId = action.detail.cardId || '';

  switch (action.type) {
    case 'cardMove':
      return `${actor} 将任务${cardId ? `「${cardId}」` : ''}从「${fromCol}」移至「${toCol}」`;
    case 'cardCreate':
      return `${actor} 在「${toCol || fromCol}」创建了任务`;
    case 'cardDelete':
      return `${actor} 从「${fromCol}」删除了任务`;
    case 'cardUpdate':
      return `${actor} 更新了任务`;
    case 'columnCreate':
      return `${actor} 创建了新列「${toCol || ''}」`;
    case 'columnDelete':
      return `${actor} 删除了列「${fromCol || ''}」`;
    default:
      return `${actor} 执行了操作`;
  }
}

function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(isoTimestamp).toLocaleDateString();
}

export function KanbanActivityLog({
  actions,
  open,
  onClose,
  filterColumnId,
  filterType,
  className,
}: KanbanActivityLogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const firstFocusable = panel.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();
    panel.addEventListener('keydown', handleKeyDown);

    return () => {
      panel.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const filtered = actions.filter((a) => {
    if (filterColumnId && a.detail.fromColumnId !== filterColumnId && a.detail.toColumnId !== filterColumnId) return false;
    if (filterType && a.type !== filterType) return false;
    return true;
  });

  const columnNames: Record<string, string> = {};
  for (const a of actions) {
    if (a.detail.fromColumnId) columnNames[a.detail.fromColumnId] = a.detail.fromColumnId;
    if (a.detail.toColumnId) columnNames[a.detail.toColumnId] = a.detail.toColumnId;
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Activity log"
      data-slot="kanban-activity-log"
      className={cn(
        'nop-kanban-activity-log fixed right-0 top-0 bottom-0 w-80 bg-white shadow-lg border-l border-gray-200 z-50 flex flex-col',
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <span className="font-semibold text-sm">活动日志</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-gray-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-8">暂无活动记录</div>
        )}
        {filtered.map((action) => (
          <div key={action.id} className="text-sm py-2 border-b border-gray-100 last:border-0">
            <div className="text-gray-800">{formatActionDescription(action, columnNames)}</div>
            <div className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(action.timestamp)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
