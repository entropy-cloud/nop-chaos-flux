/**
 * State management rationale for Kanban (useState + imperative):
 * Kanban has a flatter component tree (board → columns → cards) compared to Gantt,
 * making direct useState + imperative callbacks sufficient and simpler than Zustand.
 * Board state is centralized in `boardData` (useState) with controlled/uncontrolled
 * branching. Undo uses snapshot-based pattern (full BoardData copies).
 * Gantt uses Zustand + Context (deeper tree, more inter-component subscriptions).
 * Calendar uses custom hooks (view state localized to scroll/navigation hooks).
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn, Button, Input } from '@nop-chaos/ui';
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
import type { UndoStack } from './utils/kanban-undo-stack.js';
import { moveColumn } from './kanban-helpers.js';

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
  const { props: resolved, meta, regions, events } = props;

  const rawData = resolved.data as BoardData | undefined;
  const configMap = resolved.configMap as Record<string, KanbanCardConfig> | undefined;
  const draggable = resolved.draggable !== false;
  const columnWidthMode = resolved.columnWidth;
  const wipStrictGlobal = resolved.wipStrict === true;

  const fallbackBoard = { root: { id: 'root', type: 'root', children: [], data: {}, meta: {} } } as BoardData;
  const isControlled = rawData != null;
  const [localBoardData, setLocalBoardData] = useState<BoardData>(rawData ?? fallbackBoard);

  const boardData: BoardData = isControlled ? rawData : localBoardData;
  const setBoardData = useCallback(
    (updater: BoardData | ((prev: BoardData) => BoardData)) => {
      if (!isControlled) {
        setLocalBoardData(updater);
      }
    },
    [isControlled],
  );
  const columns = getColumns(boardData);
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const setBoardDataRef = useRef(setBoardData);
  setBoardDataRef.current = setBoardData;

  const [undoStackState, setUndoStackState] = useState<UndoStack>(() => createUndoStack(1000));
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [actions, setActions] = useState<KanbanAction[]>([]);
  const actionCounterRef = useRef(0);

  const recordAction = (action: Omit<KanbanAction, 'id' | 'timestamp'>) => {
    actionCounterRef.current += 1;
    const entry: KanbanAction = {
      ...action,
      // eslint-disable-next-line react-hooks/purity
      id: `act-${Date.now()}-${actionCounterRef.current}`,
      timestamp: new Date().toISOString(),
    };
    setActions((prev) => [entry, ...prev].slice(0, 500));
  };

  const handleSetBoardData = (newBoard: BoardData) => {
    setBoardData((prev) => {
      setUndoStackState((s) => pushCommand(s, {
        type: 'moveCard',
        timestamp: Date.now(),
        boardSnapshot: prev,
        metadata: {},
      }));
      return newBoard;
    });
  };

  const handleUndo = useCallback(() => {
    setUndoStackState((s) => {
      const result = undoStack(s);
      if (result) {
        setBoardData(result.board);
        return result.stack;
      }
      return s;
    });
  }, [setBoardData]);

  const handleRedo = useCallback(() => {
    setUndoStackState((s) => {
      const result = redoStack(s);
      if (result) {
        setBoardData(result.board);
        return result.stack;
      }
      return s;
    });
  }, [setBoardData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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

  const filter = useKanbanFilter({ filterText: resolved.filterText as string | undefined });

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

  const { registerCard, registerColumn } = useKanbanDnd({
    boardData,
    onBoardChange: handleSetBoardData,
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
    onBoardChange: handleSetBoardData,
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
          handleSetBoardData(newBoard);
          events.onColumnReorder?.({ columnId, fromIndex: idx, toIndex: idx - 1 });
        }
        break;
      case 'ArrowRight':
        if (idx < root.children.length - 1) {
          e.preventDefault();
          const newBoard = moveColumn(boardData, columnId, idx + 1);
          handleSetBoardData(newBoard);
          events.onColumnReorder?.({ columnId, fromIndex: idx, toIndex: idx + 1 });
        }
        break;
    }
  };

  const handleCardClick = (cardId: string, columnId: string, index: number) => {
    events.onCardClick?.({ cardId, columnId, index });
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const boardRef = useRef<HTMLDivElement>(null);

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
  }, [boardData, draggable, registerCard, registerColumn, registerColumnHeader]);

  if (!meta.visible) return null;

  if (resolved.loading) {
    const skeletonRegion = regions.loading;
    if (skeletonRegion) {
      return <div data-slot="kanban">{skeletonRegion.render() as React.ReactNode}</div>;
    }
    return (
      <div data-slot="kanban" className="nop-kanban flex gap-4 p-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="nop-kanban-skeleton bg-gray-100 rounded-lg min-w-[280px] h-64" />
        ))}
      </div>
    );
  }

  if (columns.length === 0) {
    const emptyRegion = regions.empty;
    if (emptyRegion) {
      return <div data-slot="kanban">{emptyRegion.render() as React.ReactNode}</div>;
    }
    return (
      <div data-slot="kanban-empty" className="nop-kanban-empty flex items-center justify-center py-12 text-gray-400 text-sm">
        {t('flux.common.noData')}
      </div>
    );
  }

  const canUndoNow = canUndo(undoStackState);
  const canRedoNow = canRedo(undoStackState);

  return (
    <div ref={boardRef} data-slot="kanban" className={cn('nop-kanban flex flex-col h-full min-h-0', meta.className)}>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {`${columns.length} columns, ${columns.reduce((sum, col) => sum + col.children.length, 0)} cards`}
      </div>
      <div className="flex items-center gap-2 px-4 py-2">
        <Input
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
                filterText={filter.activeFilterText}
                draggable={draggable}
                columnWidth={columnWidthMode === 'auto' ? undefined : resize.getWidth(col.id)}
                onResizeStart={(e) => resize.handleResizeStart(e, col.id)}
                virtualize
                wipWarning={overLimit}
                wipText={wipText}
                onDragHandleKeyDown={handleDragHandleKeyDown}
              />
            );
          })}
          <div className="nop-kanban-adder shrink-0 self-start mt-2">
            <Button
              variant="outline"
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 min-w-[280px] justify-center transition-colors"
            >
              {t('scheduling.kanban.addColumn')}
            </Button>
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
