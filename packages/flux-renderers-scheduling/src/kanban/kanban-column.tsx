import React, { useRef, useMemo } from 'react';
import { cn } from '@nop-chaos/ui';
import type { BoardData, BoardItem, KanbanCardConfig } from './kanban.types.js';
import { KanbanColumnHeader } from './kanban-column-header.js';
import { KanbanCard } from './kanban-card.js';
import { useKanbanVirtualizer } from './hooks/use-kanban-virtualizer.js';

export interface KanbanColumnProps {
  column: BoardItem;
  board: BoardData;
  collapsed: boolean;
  onToggleCollapse: (columnId: string) => void;
  configMap?: Record<string, KanbanCardConfig>;
  columnHeaderRegion?: { render: () => React.ReactNode } | null;
  columnHeaderToolbarRegion?: { render: () => React.ReactNode } | null;
  cardTemplateRegion?: { render: (params: { card: BoardItem; column: BoardItem; index: number }) => React.ReactNode } | null;
  columnFooterRegion?: { render: () => React.ReactNode } | null;
  onCardClick?: (cardId: string, columnId: string, index: number) => void;
  onAddCard?: (columnId: string) => void;
  filterText?: string;
  draggable?: boolean;
  className?: string;
  columnWidth?: number;
  onResizeStart?: (e: React.PointerEvent) => void;
  virtualize?: boolean;
  wipWarning?: boolean;
  wipText?: string;
  onDragHandleKeyDown?: (e: React.KeyboardEvent, columnId: string) => void;
}

export function KanbanColumn({
  column,
  board,
  collapsed,
  onToggleCollapse,
  configMap,
  columnHeaderRegion,
  columnHeaderToolbarRegion,
  cardTemplateRegion,
  columnFooterRegion,
  onCardClick,
  onAddCard,
  filterText,
  draggable,
  className,
  columnWidth,
  onResizeStart,
  virtualize,
  wipWarning,
  wipText,
  onDragHandleKeyDown,
}: KanbanColumnProps) {
  const cardIds = column.children;
  const cards = useMemo(
    () => cardIds
      .map((id) => board[id])
      .filter((item): item is BoardItem => item != null && item.type === 'card'),
    [cardIds, board],
  );

  const filteredCards = useMemo(() => {
    if (!filterText) return cards;
    const text = filterText.toLowerCase();
    return cards.filter((card) => {
      const title = ((card.data?.title as string) || '').toLowerCase();
      const description = ((card.data?.description as string) || '').toLowerCase();
      return title.includes(text) || description.includes(text);
    });
  }, [cards, filterText]);

  const displayCards = collapsed ? [] : filteredCards;
  const showEmptyZone = !collapsed && filteredCards.length === 0;

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { virtualItems, totalSize } = useKanbanVirtualizer({
    cardCount: displayCards.length,
    overscan: 5,
    estimatedCardHeight: 80,
    gap: 8,
    scrollContainerRef: virtualize ? scrollContainerRef : { current: null },
  });

  const columnStyle: React.CSSProperties = {};
  if (columnWidth != null) {
    columnStyle.width = columnWidth;
    columnStyle.minWidth = undefined;
    columnStyle.maxWidth = undefined;
  }

  const columnTitle = (column.data?.title as string) || '';

  return (
    <div
      data-slot="kanban-column"
      data-dnd-column="true"
      data-column-id={column.id}
      data-card-count={filteredCards.length}
      role="region"
      aria-label={`Column: ${columnTitle}`}
      className={cn(
        'nop-kanban-column flex flex-col bg-gray-50 rounded-lg border border-gray-200 min-w-[280px] max-w-[360px]',
        collapsed && 'nop-kanban-column-collapsed',
        wipWarning && 'border-red-400',
        className,
      )}
      style={columnStyle}
    >
      <KanbanColumnHeader
        column={column}
        cardCount={filteredCards.length}
        collapsed={collapsed}
        onToggleCollapse={() => onToggleCollapse(column.id)}
        columnHeaderRegion={columnHeaderRegion}
        columnHeaderToolbarRegion={columnHeaderToolbarRegion}
        dndEnabled={draggable}
        onResizeStart={onResizeStart}
        wipWarning={wipWarning}
        wipText={wipText}
        onDragHandleKeyDown={onDragHandleKeyDown}
      />

      {!collapsed && (
        <div
          ref={virtualize ? scrollContainerRef : undefined}
          data-slot="kanban-column-body"
          className="nop-kanban-column-body flex-1 overflow-y-auto p-2 min-h-[60px]"
          style={virtualize ? { overflowY: 'auto', maxHeight: '100%' } : undefined}
        >
          {virtualize && displayCards.length > 0 ? (
            <div style={{ height: totalSize, position: 'relative' }}>
              {virtualItems.map((virtualItem) => {
                const card = displayCards[virtualItem.index];
                if (!card) return null;
                return (
                  <div
                    key={card.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <KanbanCard
                      card={card}
                      column={column}
                      index={cardIds.indexOf(card.id)}
                      configMap={configMap}
                      cardTemplateRegion={cardTemplateRegion}
                      onCardClick={onCardClick}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {displayCards.map((card, _idx) => (
                <KanbanCard
                  key={card.id}
                  card={card}
                  column={column}
                  index={cardIds.indexOf(card.id)}
                  configMap={configMap}
                  cardTemplateRegion={cardTemplateRegion}
                  onCardClick={onCardClick}
                />
              ))}
            </div>
          )}
          {showEmptyZone && (
            <div
              data-slot="kanban-column-empty"
              className="nop-kanban-column-empty border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-400 min-h-[60px] flex items-center justify-center"
            >
              拖拽卡片到此处
            </div>
          )}
        </div>
      )}

      <div data-slot="kanban-column-footer" className="nop-kanban-column-footer px-2 py-1.5 border-t border-gray-200">
        <button
          type="button"
          onClick={() => onAddCard?.(column.id)}
          className="w-full text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded py-1 transition-colors"
        >
          + 添加卡片
        </button>
        {columnFooterRegion?.render()}
      </div>
    </div>
  );
}
