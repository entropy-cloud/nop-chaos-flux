import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, cn } from '@nop-chaos/ui';
import { History } from 'lucide-react';
import { t } from '@nop-chaos/flux-i18n';

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
  locale?: string;
}

function formatActionDescription(action: KanbanAction, columnNames: Record<string, string>): string {
  const actor = action.actor.name;
  const fromCol = action.detail.fromColumnId ? columnNames[action.detail.fromColumnId] || action.detail.fromColumnId : '';
  const toCol = action.detail.toColumnId ? columnNames[action.detail.toColumnId] || action.detail.toColumnId : '';
  const cardId = action.detail.cardId || '';

  switch (action.type) {
    case 'cardMove':
      return t('scheduling.kanban.cardMoved', { actor, cardId, fromCol, toCol });
    case 'cardCreate':
      return t('scheduling.kanban.cardCreated', { actor, column: toCol || fromCol });
    case 'cardDelete':
      return t('scheduling.kanban.cardDeleted', { actor, column: fromCol });
    case 'cardUpdate':
      return t('scheduling.kanban.cardUpdated', { actor });
    case 'columnCreate':
      return t('scheduling.kanban.columnCreated', { actor, column: toCol || '' });
    case 'columnDelete':
      return t('scheduling.kanban.columnDeleted', { actor, column: fromCol || '' });
    default:
      return t('scheduling.kanban.defaultAction', { actor });
  }
}

function formatRelativeTime(isoTimestamp: string, locale?: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('scheduling.kanban.justNow');
  if (minutes < 60) return t('scheduling.kanban.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('scheduling.kanban.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t('scheduling.kanban.daysAgo', { count: days });
  return new Date(isoTimestamp).toLocaleDateString(locale);
}

export function KanbanActivityLog({
  actions,
  open,
  onClose,
  filterColumnId,
  filterType,
  className,
  locale,
}: KanbanActivityLogProps) {
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
    <Sheet open={open} onOpenChange={(openVal) => { if (!openVal) onClose(); }}>
      <SheetContent side="right" className={cn('flex flex-col', className)} data-slot="kanban-activity-log">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-semibold text-sm">
            <History className="w-4 h-4 text-gray-500" />
            {t('scheduling.kanban.activityLog')}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-8">{t('scheduling.kanban.noActivity')}</div>
          )}
          {filtered.map((action) => (
            <div key={action.id} className="text-sm py-2 border-b border-gray-100 last:border-0">
              <div className="text-gray-800">{formatActionDescription(action, columnNames)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(action.timestamp, locale)}</div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
