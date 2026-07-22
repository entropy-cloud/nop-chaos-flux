import React from 'react';
import { cn, Button } from '@nop-chaos/ui';
import { X } from 'lucide-react';
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
  onCardRemove?: (cardId: string) => void;
  className?: string;
  helpers?: any;
  registerCard?: (el: HTMLElement, cardId: string, columnId: string, index: number) => () => void;
  tabIndex?: number;
  onRovingKeyDown?: (e: React.KeyboardEvent, index: number) => void;
}

function KanbanCardInner({ card, column, index, configMap, cardTemplateRegion, onCardClick, onCardRemove, className, helpers, registerCard, tabIndex = 0, onRovingKeyDown }: KanbanCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const registeredRef = React.useRef(false);

  React.useEffect(() => {
    if (!registerCard || !cardRef.current) return;
    registeredRef.current = true;
    return registerCard(cardRef.current, card.id, column.id, index);
  }, [registerCard, card.id, column.id, index]);

  const cardType = (card.data?.type as string) || '';
  const title = (card.title || card.data?.title || '') as string;
  const content = (card.content || card.data?.content || '') as string;
  const description = (card.data?.description || content) as string;
  const color = (card.meta?.color as string) || '';
  const tags = (card.meta?.tags as KanbanTag[]) || [];
  const members = (card.meta?.members as KanbanMember[]) || [];

  const config = configMap?.[cardType];
  const clickFn = () => onCardClick?.(card.id, column.id, index);
  const removeFn = () => onCardRemove?.(card.id);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      clickFn();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeFn();
      return;
    }
    onRovingKeyDown?.(e, index);
  };

  const sharedAttributes = {
    'data-slot': 'kanban-card' as const,
    'data-dnd-card': 'true',
    'data-card-id': card.id,
    'data-column-id': column.id,
    'data-card-index': index,
    role: 'button',
    tabIndex,
    onClick: clickFn,
    onKeyDown: handleKeyDown,
  };

  const innerContent = config?.render ? (
    <>
      {helpers?.render(config.render) as React.ReactNode}
      <KanbanCardTags color={color} tags={tags} members={members} />
    </>
  ) : cardTemplateRegion ? (
    <>
      {cardTemplateRegion.render({ card, column, index })}
      <KanbanCardTags color={color} tags={tags} members={members} />
    </>
  ) : (
    <>
      <KanbanCardTags color={color} tags={tags} members={members} />
      <div className="nop-kanban-card-content text-sm font-medium text-gray-900 truncate mt-1">
        {title}
      </div>
      {description && (
        <div className="nop-kanban-card-content text-xs text-gray-500 mt-1 line-clamp-2">
          {description}
        </div>
      )}
    </>
  );

  const cardClass = config?.render
    ? cn('nop-kanban-card group relative', config.className, className)
    : cardTemplateRegion
      ? cn('nop-kanban-card group relative', className)
      : cn('nop-kanban-card group relative bg-white rounded-lg border border-gray-200 p-3', className);

  return (
    <div ref={cardRef} {...sharedAttributes} className={cardClass}>
      <div className="nop-kanban-card-actions absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={(e) => { e.stopPropagation(); removeFn(); }}
          aria-label="Remove card"
          className="h-5 w-5 p-0 text-gray-400 hover:text-red-500"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
      {innerContent}
    </div>
  );
}

export const KanbanCard = KanbanCardInner;
