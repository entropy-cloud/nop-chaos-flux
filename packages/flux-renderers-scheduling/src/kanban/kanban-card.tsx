import React from 'react';
import { cn } from '@nop-chaos/ui';
import type { BoardItem, KanbanCardConfig } from './kanban.types.js';
import { KanbanCardTags } from './components/kanban-card-tags.js';
import type { KanbanTag, KanbanMember } from './components/kanban-card-tags.js';

export interface KanbanCardProps {
  card: BoardItem;
  column: BoardItem;
  index: number;
  configMap?: Record<string, KanbanCardConfig>;
  cardTemplateRegion?: { render: (params: { card: BoardItem; column: BoardItem; index: number }) => React.ReactNode } | null;
  onCardClick?: (cardId: string, columnId: string, index: number) => void;
  className?: string;
}

function handleCardKeyDown(e: React.KeyboardEvent, fn?: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn?.();
  }
}

function KanbanCardInner({ card, column, index, configMap, cardTemplateRegion, onCardClick, className }: KanbanCardProps) {
  const cardType = (card.data?.type as string) || '';
  const title = (card.data?.title as string) || '';
  const description = (card.data?.description as string) || '';
  const color = (card.meta?.color as string) || '';
  const tags = (card.meta?.tags as KanbanTag[]) || [];
  const members = (card.meta?.members as KanbanMember[]) || [];

  const config = configMap?.[cardType];
  const clickFn = () => onCardClick?.(card.id, column.id, index);

  const sharedAttributes = {
    'data-slot': 'kanban-card' as const,
    'data-dnd-card': 'true',
    'data-card-id': card.id,
    'data-column-id': column.id,
    'data-card-index': index,
    role: 'button',
    tabIndex: 0,
    onClick: clickFn,
    onKeyDown: (e: React.KeyboardEvent) => handleCardKeyDown(e, clickFn),
  };

  if (config?.render) {
    return (
      <div
        {...sharedAttributes}
        className={cn('nop-kanban-card', config.className, className)}
      >
        {cardTemplateRegion?.render({ card, column, index })}
        <KanbanCardTags color={color} tags={tags} members={members} />
      </div>
    );
  }

  if (cardTemplateRegion) {
    return (
      <div
        {...sharedAttributes}
        className={cn('nop-kanban-card', className)}
      >
        {cardTemplateRegion.render({ card, column, index })}
        <KanbanCardTags color={color} tags={tags} members={members} />
      </div>
    );
  }

  return (
    <div
      {...sharedAttributes}
      className={cn(
        'nop-kanban-card bg-white rounded-lg border border-gray-200 p-3',
        className,
      )}
    >
      <KanbanCardTags color={color} tags={tags} members={members} />
      <div className="nop-kanban-card-content text-sm font-medium text-gray-900 truncate mt-1">
        {title}
      </div>
      {description && (
        <div className="nop-kanban-card-content text-xs text-gray-500 mt-1 line-clamp-2">
          {description}
        </div>
      )}
    </div>
  );
}

export const KanbanCard = React.memo(KanbanCardInner);
