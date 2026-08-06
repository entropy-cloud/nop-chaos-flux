/**
 * State management rationale for Kanban (useState + imperative):
 * Kanban has a flatter component tree (board → columns → cards) compared to Gantt,
 * making direct useState + imperative callbacks sufficient and simpler than Zustand.
 * Board state is centralized in `boardData` (useState) with controlled/uncontrolled
 * branching. Undo uses snapshot-based pattern (full BoardData copies).
 * Gantt uses Zustand + Context (deeper tree, more inter-component subscriptions).
 * Calendar uses custom hooks (view state localized to scroll/navigation hooks).
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { shallowEqual } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { BoardData, KanbanSchema, KanbanCardConfig } from './kanban.types.js';

import { KanbanColumn } from './kanban-column.js';
import { useKanbanDnd } from './hooks/use-kanban-dnd.js';
import { useColumnDnd } from './hooks/use-column-dnd.js';
import { useKanbanFilter } from './hooks/use-kanban-filter.js';
import { useKanbanColumnResize } from './hooks/use-kanban-column-resize.js';
import { KanbanTagFilter } from './components/kanban-tag-filter.js';
import { useKanbanBoardEffects } from './hooks/use-kanban-board-effects.js';
import { KanbanToolbar } from './components/kanban-toolbar.js';
import { KanbanColumnAdder } from './components/kanban-column-adder.js';
import { KanbanActivityLog } from './components/kanban-activity-log.js';
import type { KanbanAction } from './components/kanban-activity-log.js';
import { createUndoStack, pushCommand as pushUndoCommand, undo as undoStackOp, redo as redoStackOp, canUndo, canRedo } from './utils/kanban-undo-stack.js';
import type { UndoStack, UndoCommandType } from './utils/kanban-undo-stack.js';
import { addCard, removeCard, moveColumn, getColumns, collectAllTags } from './kanban-helpers.js';

const EMPTY_BOARD = { root: { id: 'root', type: 'root', children: [], data: {}, meta: {} } } as BoardData;

export function KanbanBoard(props: RendererComponentProps<KanbanSchema>) {
  const { props: resolved, meta, regions, events, helpers } = props;
  const runtime = useRendererRuntime();
  const rootScope = useRenderScope();

  const rawData = resolved.data as BoardData | undefined;
  const configMap = resolved.configMap as Record<string, KanbanCardConfig> | undefined;
  const columnsConfig = resolved.columnsConfig as Record<string, any> | undefined;
  const draggable = resolved.draggable !== false;
  const columnDraggable = resolved.columnDraggable !== false;
  const columnWidthMode = resolved.columnWidth;
  const wipStrictGlobal = resolved.wipStrict === true;

  const kanbanOwnership = (resolved.kanbanOwnership as string) || 'local';
  const kanbanStatePath = resolved.kanbanStatePath as string | undefined;
  const collapsedOwnership = (resolved.collapsedOwnership as string) || 'local';
  const collapsedStatePath = resolved.collapsedStatePath as string | undefined;
  // CR P2-3: in controlled mode board mutations are dropped (setBoardData
  // no-ops on rawData), so mutation events (onCardMove/onColumnReorder/
  // onCardAdd/onCardRemove) and the activity log must not claim changes that
  // never happened. Interaction events (onCardClick/onColumnClick) still fire.
  const isControlled = kanbanOwnership === 'controlled';

  const fallbackBoard = EMPTY_BOARD;

  const scopeBoardData = useScopeSelector(
    (data: Record<string, unknown>) => {
      if (!kanbanStatePath) return undefined;
      const parts = kanbanStatePath.split('.');
      let val: unknown = data;
      for (const p of parts) val = (val as Record<string, unknown>)?.[p];
      return val as BoardData | undefined;
    },
     shallowEqual,
  );

  const scopeCollapsedValue = useScopeSelector(
    (data: Record<string, unknown>) => {
      if (!collapsedStatePath) return undefined;
      const parts = collapsedStatePath.split('.');
      let val: unknown = data;
      for (const p of parts) val = (val as Record<string, unknown>)?.[p];
      return val as Record<string, boolean> | undefined;
    },
    Object.is,
  );

  const [localBoardData, setLocalBoardData] = useState<BoardData>(rawData ?? fallbackBoard);
  const [localCollapsedData, setLocalCollapsedData] = useState<Record<string, boolean>>({});

  const boardData = (kanbanOwnership === 'controlled')
    ? (rawData ?? fallbackBoard)
    : (kanbanOwnership === 'scope' && scopeBoardData ? scopeBoardData : localBoardData);

  const boardDataRef = useRef(boardData);
  useEffect(() => { boardDataRef.current = boardData; }, [boardData]);

  // 22-03: re-seed local board state when the schema data prop changes at
  // runtime (async data-source arrive, scope-driven refresh). New data wins
  // over local edits — same semantics as the gantt re-seed precedent. The
  // first render is skipped (ref equals the initial value); every later
  // reference change, including the first undefined→data arrival, re-seeds.
  const lastRawDataRef = useRef(rawData);
  useEffect(() => {
    if (kanbanOwnership !== 'local') return;
    if (lastRawDataRef.current === rawData) return;
    lastRawDataRef.current = rawData;
    setLocalBoardData(rawData ?? EMPTY_BOARD);
  }, [rawData, kanbanOwnership, setLocalBoardData]);

  const columns = getColumns(boardData);

  const collapsedMap = (() => {
    if (collapsedOwnership === 'controlled') {
      const map: Record<string, boolean> = {};
      if (columnsConfig) {
        for (const [id, cfg] of Object.entries(columnsConfig)) {
          if (typeof cfg === 'object' && cfg !== null && 'collapsed' in cfg) {
            map[id] = !!(cfg as any).collapsed;
          }
        }
      }
      return map;
    }
    if (collapsedOwnership === 'scope' && scopeCollapsedValue) return scopeCollapsedValue;
    return localCollapsedData;
  })();

  const setCollapsedMap = (updater: React.SetStateAction<Record<string, boolean>>) => {
    if (collapsedOwnership === 'controlled') return;
    const current = typeof updater === 'function' ? updater(collapsedMap) : updater;
    if (collapsedOwnership === 'scope' && collapsedStatePath) {
      rootScope.update(collapsedStatePath, current);
      return;
    }
    setLocalCollapsedData(current);
  };

  const setBoardData = useCallback((newBoard: BoardData) => {
    if (kanbanOwnership === 'controlled') return;
    if (kanbanOwnership === 'scope' && kanbanStatePath) {
      rootScope.update(kanbanStatePath, newBoard);
      return;
    }
    setLocalBoardData(newBoard);
  }, [kanbanOwnership, kanbanStatePath, rootScope, setLocalBoardData]);

  const setBoardDataRef = useRef(setBoardData);
  useEffect(() => { setBoardDataRef.current = setBoardData; }, [setBoardData]);

  // CX-10 / bug-83 family convention: schema event dispatches carry a second
  // dispatch-arg ctx { event, evaluationBindings, scope } so action args
  // templates can read payload keys as bare bindings.
  const eventCtx = useCallback((payload: Record<string, unknown>) => ({
    event: { ...payload, type: typeof payload.type === 'string' ? payload.type : 'custom' },
    evaluationBindings: payload,
    scope: rootScope,
  }), [rootScope]);

  const initialFilterTags = (resolved.filterTags as string[]) || [];
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialFilterTags);

  useEffect(() => {
    void events.onMount?.({}, eventCtx({}));
    return () => { void events.onUnmount?.({}, eventCtx({})); };
  }, [events, eventCtx]);

  const [undoStackState, setUndoStackState] = useState<UndoStack>(() => createUndoStack(1000));
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);
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

  const handleSetBoardData = (newBoard: BoardData, commandType?: UndoCommandType, extraParams?: Record<string, any>) => {
    if (kanbanOwnership === 'controlled') return;
    const ct = commandType ?? lastCommandTypeRef.current;
    lastCommandTypeRef.current = 'moveCard';
    setBoardData(newBoard);
    setUndoStackState((s) => pushUndoCommand(s, {
      type: ct,
      timestamp: Date.now(),
      params: extraParams ?? {},
    }));
  };

  const handleUndo = () => {
    let restoredBoard: BoardData | null = null;
    const bd = boardDataRef.current;
    setUndoStackState((s) => {
      const result = undoStackOp(s, bd);
      if (result) {
        restoredBoard = result.board;
        return result.stack;
      }
      return s;
    });
    if (restoredBoard) {
      setBoardData(restoredBoard);
    }
  };

  const handleRedo = () => {
    let restoredBoard: BoardData | null = null;
    const bd = boardDataRef.current;
    setUndoStackState((s) => {
      const result = redoStackOp(s, bd);
      if (result) {
        restoredBoard = result.board;
        return result.stack;
      }
      return s;
    });
    if (restoredBoard) {
      setBoardData(restoredBoard);
    }
  };

  const allTags = collectAllTags(boardData, columns);

  const filterCompileErrorRef = useRef<string | null>(null);

  const filterCardFn = useMemo(() => {
    const raw = resolved.filterCard;
    if (!raw) return undefined;
    if (typeof raw === 'function') return raw as (card: Record<string, any>, text: string) => boolean;
    if (typeof raw === 'string') {
      try {
        const compiled = runtime.expressionCompiler.compileValue(raw);
        filterCompileErrorRef.current = null;
        if (compiled) {
          return (cardData: Record<string, any>, text: string) => {
            const evalScope = runtime.createChildScope(rootScope, { card: cardData, text });
            try {
              return !!(runtime.evaluateCompiled(compiled, evalScope));
            } finally {
              runtime.disposeScope(evalScope.id);
            }
          };
        }
      } catch (err) {
        // Compile failure is reported via the effect below (never setState
        // during render).
        const msg = err instanceof Error ? err.message : String(err);
        filterCompileErrorRef.current = msg;
      }
    }
    return undefined;
  }, [resolved.filterCard, runtime, rootScope]);

  useEffect(() => {
    setFilterError(filterCompileErrorRef.current);
  }, [resolved.filterCard]);

  const filter = useKanbanFilter({ filterText: resolved.filterText as string | undefined, filterCard: filterCardFn });

  const wipOverLimitColumns = new Set(columns.filter(col => {
    const d = boardData[col.id]?.data;
    const cardLimit = (d?.cardLimit as number) || 0;
    const strict = (d?.wipStrict as boolean) ?? wipStrictGlobal;
    return cardLimit > 0 && strict && col.children.filter(id => boardData[id]?.type === 'card').length >= cardLimit;
  }).map(c => c.id));

  const handleCardMoveBoardChange = (newBoard: BoardData, cardId?: string, fromColumnId?: string, toColumnId?: string, fromIndex?: number, toIndex?: number) => {
    lastCommandTypeRef.current = 'moveCard';
    handleSetBoardData(newBoard, 'moveCard', { cardId, fromColumnId, toColumnId, fromIndex, toIndex });
  };

  const handleColumnReorderBoardChange = (newBoard: BoardData, columnId?: string, fromIndex?: number, toIndex?: number) => {
    lastCommandTypeRef.current = 'moveColumn';
    handleSetBoardData(newBoard, 'moveColumn', { columnId, fromIndex, toIndex });
  };

  const { registerCard, registerColumn, dragState, dropState, moveCardKeyboard } = useKanbanDnd({
    boardData,
    onBoardChange: handleCardMoveBoardChange,
    onCardMove: (payload) => {
      if (isControlled) return;
      const card = boardData[payload.cardId];
      const movePayload = { ...payload, card };
      void events.onCardMove?.(movePayload, eventCtx(movePayload));
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

  const { registerColumnHeader, registerBoardDropZone } = useColumnDnd({
    boardData,
    onBoardChange: handleColumnReorderBoardChange,
    onColumnReorder: (payload) => {
      if (isControlled) return;
      void events.onColumnReorder?.(payload, eventCtx(payload));
    },
    enabled: columnDraggable,
  });

  const handleToggleCollapse = (columnId: string) => {
    setCollapsedMap((prev) => ({ ...prev, [columnId]: !prev[columnId] }));
  };

  const handleDragHandleKeyDown = (e: React.KeyboardEvent, columnId: string) => {
    const root = boardData['root'];
    if (!root) return;
    const idx = root.children.indexOf(columnId);
    if (idx === -1) return;
    const dir = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    const targetIdx = idx + dir;
    if (dir && targetIdx >= 0 && targetIdx < root.children.length) {
      e.preventDefault();
      const newBoard = moveColumn(boardData, columnId, targetIdx);
      handleSetBoardData(newBoard, 'moveColumn', { columnId, fromIndex: idx, toIndex: targetIdx });
      const payload = { columnId, fromIndex: idx, toIndex: targetIdx };
      if (!isControlled) {
        void events.onColumnReorder?.(payload, eventCtx(payload));
      }
      setDndAnnouncement(t('scheduling.kanban.columnMoved', { from: idx + 1, to: targetIdx + 1 }));
    }
  };

  const handleCardClick = (cardId: string, columnId: string, index: number) => {
    const card = boardData[cardId];
    const payload = { cardId, columnId, index, card };
    void events.onCardClick?.(payload, eventCtx(payload));
  };
  const handleColumnClick = (columnId: string) => {
    const payload = { columnId };
    void events.onColumnClick?.(payload, eventCtx(payload));
  };

  const handleCardAdd = (columnId: string, cardData?: Record<string, any>) => {
    lastCommandTypeRef.current = 'addCard';
    const cardId = `card-${Date.now()}`;
    const newCard = { id: cardId, title: cardData?.title || t('scheduling.kanban.newCard'), ...cardData };
    handleSetBoardData(addCard(boardData, columnId, newCard), 'addCard', { cardId, columnId, cardData: newCard, index: -1 });
    const addPayload = { cardId, columnId, index: -1, card: newCard };
    if (!isControlled) {
      void events.onCardAdd?.(addPayload, eventCtx(addPayload));
    }
  };

  const handleCardRemove = (cardId: string) => {
    lastCommandTypeRef.current = 'removeCard';
    const card = boardData[cardId];
    const columnId = card?.parentId || '';
    const cardData = boardData[cardId] ? { ...boardData[cardId].data } : {};
    const index = columnId && boardData[columnId] ? [...boardData[columnId].children].indexOf(cardId) : -1;
    handleSetBoardData(removeCard(boardData, cardId), 'removeCard', { cardId, columnId, cardData, index });
    const removePayload = { cardId, columnId, index, card };
    if (!isControlled) {
      void events.onCardRemove?.(removePayload, eventCtx(removePayload));
    }
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const startAddColumn = () => {
    setAddingColumn(true);
    setNewColumnTitle('');
  };

  const confirmAddColumn = () => {
    const title = newColumnTitle.trim() || t('scheduling.kanban.newColumn');
    const columnId = `col-${Date.now()}`;
    const rootChildren = boardData['root']?.children ? [...boardData['root'].children] : [];
    const newBoard = structuredClone(boardData);
    newBoard[columnId] = { id: columnId, title, children: [], data: { title }, meta: {}, type: 'column' };
    newBoard['root'] = { ...boardData['root'], children: [...rootChildren, columnId] };
    lastCommandTypeRef.current = 'addColumn';
    handleSetBoardData(newBoard, 'addColumn', { columnId, columnData: newBoard[columnId], index: rootChildren.length });
    const colAddPayload = { columnId, index: rootChildren.length };
    void events.onColumnAdd?.(colAddPayload, eventCtx(colAddPayload));
    setAddingColumn(false);
    setNewColumnTitle('');
  };

  const cancelAddColumn = () => { setAddingColumn(false); setNewColumnTitle(''); };

  const boardRef = useRef<HTMLDivElement>(null);
  const [keyboardMoveCard, setKeyboardMoveCard] = useState<{ cardId: string; columnId: string } | null>(null);
  const [dndAnnouncement, setDndAnnouncement] = useState('');

  useKanbanBoardEffects({
    boardRef,
    draggable,
    boardDataRef,
    columns,
    moveCardKeyboard,
    keyboardMoveCard,
    setKeyboardMoveCard,
    setDndAnnouncement,
    dragState,
    dropState,
    boardData,
    handleUndo,
    handleRedo,
  });

  const resize = useKanbanColumnResize({
    minWidth: 200,
    maxWidth: 600,
    defaultWidth: columnWidthMode === 'auto' ? 280 : (typeof columnWidthMode === 'number' ? columnWidthMode : 280),
  });

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
      return <div data-slot="kanban" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-kanban', meta.className)}>{emptyRegion.render() as React.ReactNode}</div>;
    }
    return (
      <div data-slot="kanban" data-empty="true" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-kanban nop-kanban-empty flex items-center justify-center py-12 text-gray-400 text-sm', meta.className)}>
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
    <div ref={boardRef} data-slot="kanban" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-kanban flex flex-col h-full min-h-0', meta.className)}>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {dndAnnouncement || t('scheduling.kanban.boardSummary', {
          columns: columns.length,
          cards: columns.reduce((sum, col) => sum + col.children.length, 0),
        })}
      </div>

      <KanbanToolbar
        filterText={filter.filterText}
        onFilterChange={(v) => filter.setFilterText(v)}
        canUndo={canUndoNow}
        canRedo={canRedoNow}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleActivityLog={() => setActivityLogOpen((v) => !v)}
      />

      {filterError && (
        <div className="px-4 py-1 text-xs text-destructive bg-destructive/10" role="alert">
          {t('scheduling.kanban.filterError', { message: filterError })}
          <Button variant="link" size="sm" onClick={() => setFilterError(null)}>{t('flux.common.dismiss')}</Button>
        </div>
      )}

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
                onCardRemove={handleCardRemove}
                filterText={filter.activeFilterText}
                draggable={draggable}
                columnWidth={columnWidthMode === 'auto' ? undefined : resize.getWidth(col.id)}
                onResizeStart={(e) => resize.handleResizeStart(e, col.id)}
                onResizeKeyDown={(e) => resize.handleResizeKeyDown(e, col.id)}
                minWidth={resize.minWidth}
                maxWidth={resize.maxWidth}
                virtualize
                wipWarning={overLimit}
                wipText={wipText}
                onDragHandleKeyDown={handleDragHandleKeyDown}
                columnHeaderClassName={columnHeaderClassName}
                cardClassName={cardClassName}
                columnFooterClassName={columnFooterClassName}
                columnHeaderRegion={regions.columnHeader as any}
                columnHeaderToolbarRegion={regions.columnHeaderToolbar as any}
                cardTemplateRegion={regions.cardTemplate as any}
                columnFooterRegion={regions.columnFooter as any}
                selectedTagIds={selectedTagIds}
                filterCardFn={(card) => filter.matchesCard(card)} 
                helpers={helpers}
                dropTargetCardIndex={col.id === dropState.targetColumnId ? dropState.targetCardIndex : null}
                dropClosestEdge={col.id === dropState.targetColumnId ? dropState.closestEdge : null}
                registerCard={draggable ? registerCard : undefined}
                registerColumn={draggable ? registerColumn : undefined}
                registerBoardDropZone={registerBoardDropZone}
                registerColumnHeader={draggable ? registerColumnHeader : undefined}
              />
            );
          })}
          <KanbanColumnAdder
            adding={addingColumn}
            title={newColumnTitle}
            onTitleChange={(v) => setNewColumnTitle(v)}
            onConfirm={confirmAddColumn}
            onCancel={cancelAddColumn}
            onStartAdd={startAddColumn}
          />
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
