import React, { useRef, useState, useEffect } from 'react';
import { cn, Button } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { RendererHelpers } from '@nop-chaos/flux-core';
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
  onColumnClick?: (columnId: string) => void;
  onAddCard?: (columnId: string) => void;
  onCardRemove?: (cardId: string) => void;
  filterText?: string;
  draggable?: boolean;
  className?: string;
  columnWidth?: number;
  onResizeStart?: (e: React.PointerEvent) => void;
  onResizeKeyDown?: (e: React.KeyboardEvent) => void;
  minWidth?: number;
  maxWidth?: number;
  virtualize?: boolean;
  wipWarning?: boolean;
  wipText?: string;
  onDragHandleKeyDown?: (e: React.KeyboardEvent, columnId: string) => void;
  columnHeaderClassName?: string;
  cardClassName?: string;
  columnFooterClassName?: string;
  selectedTagIds?: string[];
  filterCardFn?: (card: BoardItem) => boolean;
  helpers?: Pick<RendererHelpers, 'render'>;
  dropTargetCardIndex?: number | null;
  dropClosestEdge?: 'before' | 'after' | null;
  registerColumn?: (el: HTMLElement, columnId: string, cardCount: number) => () => void;
  registerBoardDropZone?: (el: HTMLElement, columnIndex: number) => () => void;
  registerCard?: (el: HTMLElement, cardId: string, columnId: string, index: number) => () => void;
  registerColumnHeader?: (el: HTMLElement, columnId: string) => () => void;
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
  onColumnClick,
  onAddCard,
  onCardRemove,
  filterText,
  draggable,
  className,
  columnWidth,
  onResizeStart,
  onResizeKeyDown,
  minWidth,
  maxWidth,
  virtualize,
  wipWarning,
  wipText,
  onDragHandleKeyDown,
  columnHeaderClassName,
  cardClassName,
  columnFooterClassName,
  selectedTagIds,
  filterCardFn,
  helpers,
  dropTargetCardIndex,
  dropClosestEdge,
  registerColumn,
  registerBoardDropZone,
  registerCard,
  registerColumnHeader,
}: KanbanColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);

  const cardIds = column.children;
  const cardIndexMap = new Map<string, number>(cardIds.map((id, idx) => [id, idx]));
  const cards = cardIds
    .map((id) => board[id])
    .filter((item): item is BoardItem => item != null && item.type === 'card');

  const filteredCards = (() => {
    let result = cards;
    if (filterText) {
      const text = filterText.toLowerCase();
      result = result.filter((card) => {
        const title = ((card.title || card.data?.title || '') as string).toLowerCase();
        const description = ((card.data?.description as string) || '').toLowerCase();
        return title.includes(text) || description.includes(text);
      });
    }
    if (selectedTagIds && selectedTagIds.length > 0) {
      result = result.filter((card) => {
        const tags = card.meta?.tags as Array<{ id: string }> | undefined;
        if (!tags || tags.length === 0) return false;
        return tags.some((t) => selectedTagIds.includes(t.id));
      });
    }
    if (filterCardFn) {
      result = result.filter(filterCardFn);
    }
    return result;
  })();

  useEffect(() => {
    if (!registerColumn || !columnRef.current) return;
    const r1 = registerColumn(columnRef.current, column.id, filteredCards.length);
    const root = board['root'];
    const colIndex = root ? root.children.indexOf(column.id) : -1;
    const r2 = registerBoardDropZone && colIndex >= 0 ? registerBoardDropZone(columnRef.current, colIndex) : undefined;
    return () => {
      r1();
      r2?.();
    };
  }, [registerColumn, column.id, filteredCards.length, registerBoardDropZone, board]);

  const displayCards = collapsed ? [] : filteredCards;
  const showEmptyZone = !collapsed && filteredCards.length === 0;

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { virtualItems, totalSize } = useKanbanVirtualizer({
    cardCount: displayCards.length,
    overscan: 5,
    estimatedCardHeight: 80,
    gap: 8,
    scrollContainerRef: virtualize ? scrollContainerRef : { current: null },
    virtualizationEnabled: virtualize,
  });

  const columnStyle: React.CSSProperties = {};
  if (columnWidth != null) {
    columnStyle.width = columnWidth;
    columnStyle.minWidth = undefined;
    columnStyle.maxWidth = undefined;
  }

  const columnTitle = (column.title || column.data?.title || '') as string;

  // 1-11: roving 焦点以 card id 追踪（而非显示索引）——过滤态下 displayCards
  // 索引与 data-card-index（真实 board 索引）错位，索引查询会落空。
  const [rovingCardId, setRovingCardId] = useState<string | null>(null);

  const handleCardKeyDown = (e: React.KeyboardEvent, displayIdx: number) => {
    const cards = displayCards;
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = Math.min(displayIdx + 1, cards.length - 1);
        setRovingCardId(cards[next]?.id ?? null);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = Math.max(displayIdx - 1, 0);
        setRovingCardId(cards[prev]?.id ?? null);
        break;
      }
      case 'Home': {
        e.preventDefault();
        setRovingCardId(cards[0]?.id ?? null);
        break;
      }
      case 'End': {
        e.preventDefault();
        setRovingCardId(cards[cards.length - 1]?.id ?? null);
        break;
      }
    }
  };

  const rovingIndex = rovingCardId == null ? null : displayCards.findIndex((c) => c.id === rovingCardId);

  const cardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rovingCardId == null || !cardContainerRef.current) return;
    const cardEl = cardContainerRef.current.querySelector(`[data-card-id="${rovingCardId}"]`) as HTMLElement | null;
    cardEl?.focus();
  }, [rovingCardId]);

  return (
    <div
      ref={columnRef}
      data-slot="kanban-column"
      data-dnd-column="true"
      data-column-id={column.id}
      data-card-count={filteredCards.length}
      role="region"
      aria-label={t('scheduling.kanban.columnLabel', { title: columnTitle })}
      className={cn(
        'nop-kanban-column flex flex-col bg-gray-50 rounded-lg border border-gray-200 flex-1 min-w-[200px]',
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
        onResizeKeyDown={onResizeKeyDown}
        columnWidth={columnWidth}
        minWidth={minWidth}
        maxWidth={maxWidth}
        wipWarning={wipWarning}
        wipText={wipText}
        onDragHandleKeyDown={onDragHandleKeyDown}
        onClick={() => onColumnClick?.(column.id)}
        className={columnHeaderClassName}
        registerColumnHeader={registerColumnHeader}
      />

      {!collapsed && (
        <div
          ref={virtualize ? scrollContainerRef : undefined}
          data-slot="kanban-column-body"
          className="nop-kanban-column-body flex-1 overflow-y-auto p-2 min-h-[60px]"
          style={virtualize ? { overflowY: 'auto', maxHeight: '100%' } : undefined}
        >
          {virtualize && displayCards.length > 0 ? (
            <div ref={cardContainerRef} role="list" style={{ height: totalSize, position: 'relative' }}>
              {virtualItems.map((virtualItem) => {
                const card = displayCards[virtualItem.index];
                if (!card) return null;
                return (
                  <div
                    key={card.id}
                    role="none"
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
                      index={cardIndexMap.get(card.id) ?? 0}
                      configMap={configMap}
                      cardTemplateRegion={cardTemplateRegion}
                      onCardClick={onCardClick}
                      onCardRemove={onCardRemove}
                      className={cardClassName}
                      helpers={helpers}
                      registerCard={registerCard}
                      tabIndex={virtualItem.index === (rovingIndex ?? 0) ? 0 : -1}
                      // 1-11: roving 用显示索引（virtualItem.index），与 data-card-index（真实 board 索引）解耦
                      onRovingKeyDown={(e) => handleCardKeyDown(e, virtualItem.index)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div ref={cardContainerRef} role="list" className="space-y-2">
              {displayCards.map((card, idx) => (
                <React.Fragment key={card.id}>
                  {dropTargetCardIndex === idx && dropClosestEdge === 'before' && (
                    <div className="nop-kanban-drop-indicator" />
                  )}
                  <KanbanCard
                    card={card}
                    column={column}
                    index={cardIndexMap.get(card.id) ?? 0}
                    configMap={configMap}
                    cardTemplateRegion={cardTemplateRegion}
                    onCardClick={onCardClick}
                    onCardRemove={onCardRemove}
                    className={cardClassName}
                    helpers={helpers}
                    registerCard={registerCard}
                    tabIndex={idx === (rovingIndex ?? 0) ? 0 : -1}
                    // 1-11: roving 用显示索引（idx），与 data-card-index（真实 board 索引）解耦
                    onRovingKeyDown={(e) => handleCardKeyDown(e, idx)}
                  />
                  {dropTargetCardIndex === idx && dropClosestEdge === 'after' && (
                    <div className="nop-kanban-drop-indicator" />
                  )}
                </React.Fragment>
              ))}
              {dropTargetCardIndex === displayCards.length && dropClosestEdge === 'after' && (
                <div className="nop-kanban-drop-indicator" />
              )}
            </div>
          )}
          {showEmptyZone && (
            <div
              data-slot="kanban-column-empty"
              className="nop-kanban-column-empty border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-400 min-h-[60px] flex items-center justify-center"
            >
              {t('scheduling.kanban.dragCardHere')}
            </div>
          )}
        </div>
      )}

      <div data-slot="kanban-column-footer" className={cn('nop-kanban-column-footer px-2 py-1.5 border-t border-gray-200', columnFooterClassName)}>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => onAddCard?.(column.id)}
          className="w-full text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded py-1 transition-colors"
        >
          {t('scheduling.kanban.addCard')}
        </Button>
        {columnFooterRegion?.render()}
      </div>
    </div>
  );
}
