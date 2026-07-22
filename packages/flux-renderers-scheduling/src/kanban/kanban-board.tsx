/**
 * State management rationale for Kanban (useState + imperative):
 * Kanban has a flatter component tree (board → columns → cards) compared to Gantt,
 * making direct useState + imperative callbacks sufficient and simpler than Zustand.
 * Board state is centralized in `boardData` (useState) with controlled/uncontrolled
 * branching. Undo uses snapshot-based pattern (full BoardData copies).
 * Gantt uses Zustand + Context (deeper tree, more inter-component subscriptions).
 * Calendar uses custom hooks (view state localized to scroll/navigation hooks).
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';
import { cn, Button, Input, Label } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { Undo2, Redo2, History } from 'lucide-react';
import type { BoardData, BoardItem, KanbanSchema, KanbanCardConfig } from './kanban.types.js';

import { KanbanColumn } from './kanban-column.js';
import { useKanbanDnd } from './hooks/use-kanban-dnd.js';
import { useColumnDnd } from './hooks/use-column-dnd.js';
import { useKanbanFilter } from './hooks/use-kanban-filter.js';
import { useKanbanColumnResize } from './hooks/use-kanban-column-resize.js';
import { KanbanTagFilter } from './components/kanban-tag-filter.js';
import type { KanbanFilterTag } from './components/kanban-tag-filter.js';
import { KanbanActivityLog } from './components/kanban-activity-log.js';
import type { KanbanAction } from './components/kanban-activity-log.js';
import { createUndoStack, pushCommand, undo as undoStack, redo as redoStack, canUndo, canRedo } from './utils/kanban-undo-stack.js';
import type { UndoStack, UndoCommandType } from './utils/kanban-undo-stack.js';
import { addCard, removeCard, moveColumn } from './kanban-helpers.js';

function getColumns(board: BoardData): BoardItem[] {
  const root = board['root'];
  if (!root) return [];
  return root.children
    .map((id) => board[id])
    .filter((item): item is BoardItem => item != null && item.type === 'column');
}

function collectAllTags(board: BoardData, columns: BoardItem[]): KanbanFilterTag[] {
  const tagMap = new Map<string, KanbanFilterTag>();
  for (const col of columns) {
    for (const childId of col.children) {
      const card = board[childId];
      if (card?.meta?.tags && Array.isArray(card.meta.tags)) {
        for (const tag of card.meta.tags) {
          if (!tagMap.has(tag.id)) {
            tagMap.set(tag.id, { id: tag.id, text: tag.text, color: tag.color });
          }
        }
      }
    }
  }
  return Array.from(tagMap.values());
}

export function KanbanBoard(props: RendererComponentProps<KanbanSchema>) {
  const { props: resolved, meta, regions, events, helpers: _helpers } = props;
  const _runtime = useRendererRuntime();
  const _scope = useRenderScope();

  const rawData = resolved.data as BoardData | undefined;
  const configMap = resolved.configMap as Record<string, KanbanCardConfig> | undefined;
  const draggable = resolved.draggable !== false;
  const columnWidthMode = resolved.columnWidth;
  const wipStrictGlobal = resolved.wipStrict === true;

  const fallbackBoard = { root: { id: 'root', type: 'root', children: [], data: {}, meta: {} } } as BoardData;
  const [boardData, setBoardData] = useState<BoardData>(rawData ?? fallbackBoard);
  const columns = useMemo(() => getColumns(boardData), [boardData]);
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const setBoardDataRef = useRef(setBoardData);
  useEffect(() => { setBoardDataRef.current = setBoardData; }, [setBoardData]);

  const prevBoardRef = useRef<BoardData>(boardData);
  useEffect(() => { prevBoardRef.current = boardData; }, [boardData]);

  const [undoStackState, setUndoStackState] = useState<UndoStack>(() => createUndoStack(1000));
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [actions, setActions] = useState<KanbanAction[]>([]);
  const actionCounterRef = useRef(0);

  const recordAction = (action: Omit<KanbanAction, 'id' | 'timestamp'>) => {
    actionCounterRef.current += 1;
    const entry: KanbanAction = {
      ...action,
      id: `act-${Date.now()}-${actionCounterRef.current}`,
      timestamp: new Date().toISOString(),
    };
    setActions((prev) => [entry, ...prev].slice(0, 500));
  };

  const lastCommandTypeRef = useRef<UndoCommandType>('moveCard');

  const handleSetBoardData = (newBoard: BoardData, commandType?: UndoCommandType) => {
    const ct = commandType ?? lastCommandTypeRef.current;
    lastCommandTypeRef.current = 'moveCard';
    const snapshot = prevBoardRef.current;
    setBoardData(() => newBoard);
    setUndoStackState((s) => pushCommand(s, {
      type: ct,
      timestamp: Date.now(),
      boardSnapshot: snapshot,
      metadata: {},
    }));
  };

  const handleUndo = useCallback(() => {
    let restoredBoard: BoardData | null = null;
    setUndoStackState((s) => {
      const result = undoStack(s);
      if (result) {
        restoredBoard = result.board;
        return result.stack;
      }
      return s;
    });
    if (restoredBoard) {
      setBoardData(restoredBoard);
    }
  }, [setBoardData]);

  const handleRedo = useCallback(() => {
    let restoredBoard: BoardData | null = null;
    setUndoStackState((s) => {
      const result = redoStack(s);
      if (result) {
        restoredBoard = result.board;
        return result.stack;
      }
      return s;
    });
    if (restoredBoard) {
      setBoardData(restoredBoard);
    }
  }, [setBoardData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = boardRef.current;
      if (!el) return;
      if (!el.contains(document.activeElement)) return;
      const target = e.target as HTMLElement | null;
      const isEditable = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isEditable) return;
      if (e.ctrlKey && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleRedo();
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  const allTags = collectAllTags(boardData, columns);

  const filterCardFn = useMemo(() => {
    const raw = resolved.filterCard;
    if (typeof raw === 'function') return raw as (card: Record<string, any>, text: string) => boolean;
    return undefined;
  }, [resolved.filterCard]);

  const filter = useKanbanFilter({ filterText: resolved.filterText as string | undefined, filterCard: filterCardFn });

  const wipOverLimitColumns = (() => {
    const overLimit = new Set<string>();
    for (const col of columns) {
      const colData = boardData[col.id];
      const cardLimit = (colData?.data?.cardLimit as number) || 0;
      const colWipStrict = (colData?.data?.wipStrict as boolean) ?? wipStrictGlobal;
      if (cardLimit > 0 && colWipStrict) {
        const cardCount = col.children.filter((id) => boardData[id]?.type === 'card').length;
        if (cardCount >= cardLimit) {
          overLimit.add(col.id);
        }
      }
    }
    return overLimit;
  })();

  const handleCardMoveBoardChange = (newBoard: BoardData) => {
    lastCommandTypeRef.current = 'moveCard';
    handleSetBoardData(newBoard);
  };

  const handleColumnReorderBoardChange = (newBoard: BoardData) => {
    lastCommandTypeRef.current = 'moveColumn';
    handleSetBoardData(newBoard);
  };

  const { registerCard, registerColumn, dragState, dropState, moveCardKeyboard } = useKanbanDnd({
    boardData,
    onBoardChange: handleCardMoveBoardChange,
    onCardMove: (payload) => {
      events.onCardMove?.(payload);
      const card = boardData[payload.cardId];
      recordAction({
        type: 'cardMove',
        actor: { id: 'local', name: t('scheduling.kanban.currentUser') },
        detail: {
          cardId: (card?.data?.title as string) || payload.cardId,
          fromColumnId: payload.fromColumnId,
          toColumnId: payload.toColumnId,
          fromIndex: payload.fromIndex,
          toIndex: payload.toIndex,
        },
      });
    },
    wipOverLimitColumns,
  });

  const { registerColumnHeader } = useColumnDnd({
    boardData,
    onBoardChange: handleColumnReorderBoardChange,
    onColumnReorder: (payload) => events.onColumnReorder?.(payload),
  });

  const handleToggleCollapse = (columnId: string) => {
    setCollapsedMap((prev) => ({ ...prev, [columnId]: !prev[columnId] }));
  };

  const handleDragHandleKeyDown = (e: React.KeyboardEvent, columnId: string) => {
    const root = boardData['root'];
    if (!root) return;
    const idx = root.children.indexOf(columnId);
    if (idx === -1) return;
    switch (e.key) {
      case 'ArrowLeft':
        if (idx > 0) {
          e.preventDefault();
          const newBoard = moveColumn(boardData, columnId, idx - 1);
          lastCommandTypeRef.current = 'moveColumn';
          handleSetBoardData(newBoard);
          events.onColumnReorder?.({ columnId, fromIndex: idx, toIndex: idx - 1 });
        }
        break;
      case 'ArrowRight':
        if (idx < root.children.length - 1) {
          e.preventDefault();
          const newBoard = moveColumn(boardData, columnId, idx + 1);
          lastCommandTypeRef.current = 'moveColumn';
          handleSetBoardData(newBoard);
          events.onColumnReorder?.({ columnId, fromIndex: idx, toIndex: idx + 1 });
        }
        break;
    }
  };

  const handleCardClick = (cardId: string, columnId: string, index: number) => {
    events.onCardClick?.({ cardId, columnId, index });
  };

  const handleColumnClick = (columnId: string) => {
    events.onColumnClick?.({ columnId });
  };

  const handleCardAdd = (columnId: string, cardData?: Record<string, any>) => {
    lastCommandTypeRef.current = 'addCard';
    const cardId = `card-${Date.now()}`;
    const newCard = { id: cardId, title: cardData?.title || 'New Card', ...cardData };
    const newBoard = addCard(boardData, columnId, newCard);
    handleSetBoardData(newBoard, 'addCard');
    events.onCardAdd?.({ cardId, columnId, index: -1 });
  };

  const _handleCardRemove = (cardId: string) => {
    lastCommandTypeRef.current = 'removeCard';
    const card = boardData[cardId];
    const columnId = card?.parentId || '';
    const newBoard = removeCard(boardData, cardId);
    handleSetBoardData(newBoard, 'removeCard');
    events.onCardRemove?.({ cardId, columnId });
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const boardRef = useRef<HTMLDivElement>(null);
  const [keyboardMoveCard, setKeyboardMoveCard] = useState<{ cardId: string; columnId: string } | null>(null);

  useEffect(() => {
    const el = boardRef.current;
    if (!el || !draggable) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const cardEl = target.closest('[data-dnd-card]') as HTMLElement | null;
      if (!cardEl) return;
      const cardId = cardEl.getAttribute('data-card-id');
      const colId = cardEl.getAttribute('data-column-id');
      const cardIdx = parseInt(cardEl.getAttribute('data-card-index') || '0', 10);
      if (!cardId || !colId) return;

      if (!keyboardMoveCard) {
        if (e.key === ' ' || e.key === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          setKeyboardMoveCard({ cardId, columnId: colId });
          cardEl.setAttribute('data-keyboard-dragging', 'true');
        }
        return;
      }

      if (keyboardMoveCard.cardId !== cardId) return;

      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault();
          const cols = columns;
          const curColIdx = cols.findIndex(c => c.id === keyboardMoveCard.columnId);
          if (curColIdx > 0) {
            const targetColId = cols[curColIdx - 1].id;
            moveCardKeyboard(boardData, cardId, keyboardMoveCard.columnId, targetColId, cardIdx, 0);
            setKeyboardMoveCard({ cardId, columnId: targetColId });
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const cols = columns;
          const curColIdx = cols.findIndex(c => c.id === keyboardMoveCard.columnId);
          if (curColIdx < cols.length - 1) {
            const targetColId = cols[curColIdx + 1].id;
            moveCardKeyboard(boardData, cardId, keyboardMoveCard.columnId, targetColId, cardIdx, 0);
            setKeyboardMoveCard({ cardId, columnId: targetColId });
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          cardEl.removeAttribute('data-keyboard-dragging');
          setKeyboardMoveCard(null);
          break;
        }
      }
    };
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, [draggable, keyboardMoveCard, boardData, columns, moveCardKeyboard]);

  const resize = useKanbanColumnResize({
    minWidth: 200,
    maxWidth: 600,
    defaultWidth: columnWidthMode === 'auto' ? 280 : (typeof columnWidthMode === 'number' ? columnWidthMode : 280),
  });

  useEffect(() => {
    if (!boardRef.current) return;
    const el = boardRef.current;

    const cleanups: (() => void)[] = [];

    if (draggable) {
      el.querySelectorAll('[data-dnd-card]').forEach((cardEl) => {
        const cardId = cardEl.getAttribute('data-card-id');
        const colId = cardEl.getAttribute('data-column-id');
        const idx = parseInt(cardEl.getAttribute('data-card-index') || '0', 10);
        if (cardId && colId) {
          cleanups.push(registerCard(cardEl as HTMLElement, cardId, colId, idx));
        }
      });

      el.querySelectorAll('[data-dnd-column]').forEach((colEl) => {
        const colId = colEl.getAttribute('data-column-id');
        const count = parseInt(colEl.getAttribute('data-card-count') || '0', 10);
        if (colId) {
          cleanups.push(registerColumn(colEl as HTMLElement, colId, count));
        }
      });

      el.querySelectorAll('[data-dnd-column-header]').forEach((headerEl) => {
        const colId = headerEl.getAttribute('data-column-id');
        if (colId) {
          cleanups.push(registerColumnHeader(headerEl as HTMLElement, colId));
        }
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [draggable, registerCard, registerColumn, registerColumnHeader]);

  useEffect(() => {
    if (!boardRef.current) return;
    const targetColId = dropState.targetColumnId;
    boardRef.current.querySelectorAll('[data-dnd-column]').forEach((colEl) => {
      const cid = colEl.getAttribute('data-column-id');
      if (cid === targetColId && targetColId) {
        colEl.setAttribute('data-drop-target', 'true');
      } else {
        colEl.removeAttribute('data-drop-target');
      }
    });
  }, [dropState.targetColumnId]);

  if (!meta.visible) return null;

  if (resolved.loading) {
    const skeletonRegion = regions.loading;
    if (skeletonRegion) {
      return <div data-slot="kanban" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined}>{skeletonRegion.render() as React.ReactNode}</div>;
    }
    return (
      <div data-slot="kanban" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-kanban flex gap-4 p-4 animate-pulse', meta.className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="nop-kanban-skeleton bg-gray-100 rounded-lg min-w-[280px] h-64" />
        ))}
      </div>
    );
  }

  if (columns.length === 0) {
    const emptyRegion = regions.empty;
    if (emptyRegion) {
      return <div data-slot="kanban" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined}>{emptyRegion.render() as React.ReactNode}</div>;
    }
    return (
      <div data-slot="kanban-empty" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-kanban-empty flex items-center justify-center py-12 text-gray-400 text-sm', meta.className)}>
        {t('flux.common.noData')}
      </div>
    );
  }

  const columnHeaderClassName = resolved.columnHeaderClassName as string | undefined;
  const cardClassName = resolved.cardClassName as string | undefined;
  const columnFooterClassName = resolved.columnFooterClassName as string | undefined;

  const canUndoNow = canUndo(undoStackState);
  const canRedoNow = canRedo(undoStackState);

  return (
    <div ref={boardRef} data-slot="kanban" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} data-dragging={dragState.isDragging ? 'true' : undefined} className={cn('nop-kanban flex flex-col h-full min-h-0', meta.className)}>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {`${columns.length} columns, ${columns.reduce((sum, col) => sum + col.children.length, 0)} cards`}
      </div>
      <div className="flex items-center gap-2 px-4 py-2">
        <Label htmlFor="kanban-search" className="sr-only">{t('scheduling.kanban.searchCards')}</Label>
        <Input
          id="kanban-search"
          type="text"
          value={filter.filterText}
          onChange={(e) => filter.setFilterText(e.target.value)}
          placeholder={t('scheduling.kanban.searchCards')}
          aria-label={t('scheduling.kanban.searchCards')}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
        />
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            disabled={!canUndoNow}
            onClick={handleUndo}
            title={t('scheduling.kanban.undo')}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!canRedoNow}
            onClick={handleRedo}
            title={t('scheduling.kanban.redo')}
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActivityLogOpen((v) => !v)}
            title={t('scheduling.kanban.activityLog')}
          >
            <History className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <KanbanTagFilter
        tags={allTags}
        selectedTagIds={selectedTagIds}
        onToggleTag={handleToggleTag}
      />

      <div className="nop-kanban-columns flex-1 overflow-x-auto overflow-y-hidden p-4 pt-0">
        <div className="flex gap-3 h-full items-start">
          {columns.map((col) => {
            const colData = boardData[col.id];
            const cardLimit = (colData?.data?.cardLimit as number) || 0;
            const cardCount = colData ? colData.children.filter((id) => boardData[id]?.type === 'card').length : 0;
            const overLimit = cardLimit > 0 && cardCount > cardLimit;
            const wipText = cardLimit > 0 ? `${cardCount}/${cardLimit}` : undefined;

            return (
              <KanbanColumn
                key={col.id}
                column={col}
                board={boardData}
                collapsed={!!collapsedMap[col.id]}
                onToggleCollapse={handleToggleCollapse}
                configMap={configMap}
                onCardClick={handleCardClick}
                onColumnClick={handleColumnClick}
                onAddCard={handleCardAdd}
                filterText={filter.activeFilterText}
                draggable={draggable}
                columnWidth={columnWidthMode === 'auto' ? undefined : resize.getWidth(col.id)}
                onResizeStart={(e) => resize.handleResizeStart(e, col.id)}
                virtualize
                wipWarning={overLimit}
                wipText={wipText}
                onDragHandleKeyDown={handleDragHandleKeyDown}
                columnHeaderClassName={columnHeaderClassName}
                cardClassName={cardClassName}
                columnFooterClassName={columnFooterClassName}
              />
            );
          })}
          <div className="nop-kanban-adder shrink-0 self-start mt-2">
            <div
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 rounded-lg border-2 border-dashed border-gray-300 min-w-[280px] justify-center"
              aria-hidden="true"
            >
              {t('scheduling.kanban.addColumn')}
            </div>
          </div>
        </div>
      </div>

      <KanbanActivityLog
        actions={actions}
        open={activityLogOpen}
        onClose={() => setActivityLogOpen(false)}
      />
    </div>
  );
}
