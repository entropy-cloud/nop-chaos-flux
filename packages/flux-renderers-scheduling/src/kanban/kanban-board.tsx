/**
 * State management rationale for Kanban (useState + imperative):
 * Kanban has a flatter component tree (board → columns → cards) compared to Gantt,
 * making direct useState + imperative callbacks sufficient and simpler than Zustand.
 * Board state is centralized in `boardData` (useState) with controlled/uncontrolled
 * branching. Undo uses command-based pattern (utils/kanban-undo-stack.ts:
 * each mutation records an UndoCommand; undo/redo apply reverse/forward
 * transformations without full BoardData snapshots).
 * Gantt uses Zustand + Context (deeper tree, more inter-component subscriptions).
 * Calendar uses custom hooks (view state localized to scroll/navigation hooks).
 */
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry, useRendererRuntime } from '@nop-chaos/flux-react';
import { Button, cn, Skeleton } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { BoardData, KanbanSchema, KanbanCardConfig } from './kanban.types.js';

import { KanbanColumn } from './kanban-column.js';
import { useKanbanDnd } from './hooks/use-kanban-dnd.js';
import { useColumnDnd } from './hooks/use-column-dnd.js';
import { useKanbanFilter } from './hooks/use-kanban-filter.js';
import { useKanbanFilterCard } from './hooks/use-kanban-filter-card.js';
import { useKanbanColumnResize } from './hooks/use-kanban-column-resize.js';
import { KanbanTagFilter } from './components/kanban-tag-filter.js';
import { useKanbanBoardEffects } from './hooks/use-kanban-board-effects.js';
import { KanbanToolbar } from './components/kanban-toolbar.js';
import { KanbanColumnAdder } from './components/kanban-column-adder.js';
import { KanbanActivityLog } from './components/kanban-activity-log.js';
import type { KanbanAction } from './components/kanban-activity-log.js';
import type { UndoCommandType } from './utils/kanban-undo-stack.js';
import { addCard, removeCard, moveCard, moveColumn, getColumns, collectAllTags } from './kanban-helpers.js';
import { registerKanbanHandle, type KanbanHandleSurface } from './kanban-handle.js';
import { useKanbanColumnAggregate } from './hooks/use-kanban-column-aggregate.js';
import { useKanbanBoardState } from './hooks/use-kanban-board-state.js';
import { canUndo, canRedo } from './utils/kanban-undo-stack.js';
import { useSchedulingEventCtx } from '../shared/scheduling-event-ctx.js';


// Event-time id factories (never called during render): Date.now() is impure,
// so the react-compiler purity rule requires these to live at module scope.
let boardIdCounter = 0;
const nextActionId = () => `act-${Date.now()}-${++boardIdCounter}`;
const nextCardId = () => `card-${Date.now()}-${++boardIdCounter}`;
const nextColumnId = () => `col-${Date.now()}-${++boardIdCounter}`;

export function KanbanBoard(props: RendererComponentProps<KanbanSchema>) {
  const { props: resolved, meta, regions, events, helpers } = props;
  const runtime = useRendererRuntime();

  const rawData = resolved.data as BoardData | undefined;
  const configMap = resolved.configMap as Record<string, KanbanCardConfig> | undefined;
  const columnsConfig = resolved.columnsConfig as Record<string, any> | undefined;
  const { columnAggregate, warnAggregateFallback } = useKanbanColumnAggregate(resolved.columnAggregate);
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




  const {
    isControlled,
    boardData,
    columns,
    collapsedMap,
    setCollapsedMap,
    boardDataRef,
    undoStackState,
    handleSetBoardData,
    handleUndo,
    handleRedo,
    rootScope,
  } = useKanbanBoardState({
    kanbanOwnership,
    kanbanStatePath,
    collapsedOwnership,
    collapsedStatePath,
    rawData,
    columnsConfig,
  });
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [keyboardMoveCard, setKeyboardMoveCard] = useState<{ cardId: string; columnId: string } | null>(null);
  const [dndAnnouncement, setDndAnnouncement] = useState('');
  const [actions, setActions] = useState<KanbanAction[]>([]);
  const lastCommandTypeRef = useRef<UndoCommandType>('moveCard');
  const recordAction = useCallback((action: Omit<KanbanAction, 'id' | 'timestamp'>) => {
    const entry: KanbanAction = {
      ...action,
      id: nextActionId(),
      timestamp: new Date().toISOString(),
    };
    setActions((prev) => [entry, ...prev].slice(0, 500));
  }, []);
  const eventCtx = useSchedulingEventCtx(rootScope);



  const initialFilterTags = (resolved.filterTags as string[]) || [];
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialFilterTags);

  useEffect(() => {
    void events.onMount?.({}, eventCtx({}));
    return () => { void events.onUnmount?.({}, eventCtx({})); };
  }, [events, eventCtx]);


  const allTags = useMemo(() => collectAllTags(boardData, columns), [boardData, columns]);

  const { filterCardFn, filterError, clearFilterError } = useKanbanFilterCard(resolved.filterCard, runtime, rootScope);

  const filter = useKanbanFilter({ filterText: resolved.filterText as string | undefined, filterCard: filterCardFn });

  const wipOverLimitColumns = useMemo(() => new Set(columns.filter(col => {
    const d = boardData[col.id]?.data;
    const cardLimit = (d?.cardLimit as number) || 0;
    const strict = (d?.wipStrict as boolean) ?? wipStrictGlobal;
    return cardLimit > 0 && strict && col.children.filter(id => boardData[id]?.type === 'card').length >= cardLimit;
  }).map(c => c.id)), [boardData, columns, wipStrictGlobal]);

  const handleCardMoveBoardChange = useCallback((newBoard: BoardData, cardId?: string, fromColumnId?: string, toColumnId?: string, fromIndex?: number, toIndex?: number) => {
    lastCommandTypeRef.current = 'moveCard';
    handleSetBoardData(newBoard, 'moveCard', { cardId, fromColumnId, toColumnId, fromIndex, toIndex });
  }, [handleSetBoardData]);

  const handleColumnReorderBoardChange = useCallback((newBoard: BoardData, columnId?: string, fromIndex?: number, toIndex?: number) => {
    lastCommandTypeRef.current = 'moveColumn';
    handleSetBoardData(newBoard, 'moveColumn', { columnId, fromIndex, toIndex });
  }, [handleSetBoardData]);

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

  const handleToggleCollapse = useCallback((columnId: string) => {
    setCollapsedMap((prev) => ({ ...prev, [columnId]: !prev[columnId] }));
  }, [setCollapsedMap]);

  const handleDragHandleKeyDown = useCallback((e: React.KeyboardEvent, columnId: string) => {
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
  }, [boardData, handleSetBoardData, isControlled, events, eventCtx]);

  const handleCardClick = useCallback((cardId: string, columnId: string, index: number) => {
    const card = boardData[cardId];
    const payload = { cardId, columnId, index, card };
    void events.onCardClick?.(payload, eventCtx(payload));
  }, [boardData, events, eventCtx]);
  const handleColumnClick = useCallback((columnId: string) => {
    const payload = { columnId };
    void events.onColumnClick?.(payload, eventCtx(payload));
  }, [events, eventCtx]);

  // 22-12: handle 驱动与 UI 驱动共用同一条 mutation 通道（undo + 事件 + 活动日志）。
  // 返回 boolean 供 component:* 句柄报告真实结果；controlled 模式 mutation 被
  // 丢弃时返回 false（契约注释 :52-55 语义）。
  const handleCardAddAt = useCallback((columnId: string, cardData?: Record<string, any>, index?: number): boolean => {
    if (isControlled) return false;
    const cardId = (cardData?.id as string) || nextCardId();
    const newCard = { id: cardId, title: cardData?.title || t('scheduling.kanban.newCard'), ...cardData };
    const newBoard = addCard(boardData, columnId, newCard, index);
    lastCommandTypeRef.current = 'addCard';
    handleSetBoardData(newBoard, 'addCard', { cardId, columnId, cardData: newCard, index: index ?? -1 });
    const addPayload = { cardId, columnId, index: index ?? -1, card: newCard };
    if (!isControlled) {
      void events.onCardAdd?.(addPayload, eventCtx(addPayload));
      // [G4-R4-视角11-03] cardCreate 从既有加卡通道产出活动记录。
      recordAction({
        type: 'cardCreate',
        actor: { id: 'local', name: t('scheduling.kanban.currentUser') },
        detail: { cardId: (newCard.title as string) || cardId, toColumnId: columnId },
      });
    }
    return true;
  }, [isControlled, boardData, handleSetBoardData, events, eventCtx, recordAction]);

  const handleCardAdd = useCallback((columnId: string, cardData?: Record<string, any>) => {
    handleCardAddAt(columnId, cardData, undefined);
  }, [handleCardAddAt]);

  const handleCardRemove = useCallback((cardId: string) => {
    lastCommandTypeRef.current = 'removeCard';
    const card = boardData[cardId];
    const columnId = card?.parentId || '';
    const cardData = boardData[cardId] ? { ...boardData[cardId].data } : {};
    // 1-5: 捕获完整卡片（data + meta）——undo 恢复时 color/tags/members 不丢失。
    const cardMeta = boardData[cardId] ? { ...boardData[cardId].meta } : {};
    const index = columnId && boardData[columnId] ? [...boardData[columnId].children].indexOf(cardId) : -1;
    handleSetBoardData(removeCard(boardData, cardId), 'removeCard', { cardId, columnId, cardData, cardMeta, index });
    const removePayload = { cardId, columnId, index, card };
    if (!isControlled) {
      void events.onCardRemove?.(removePayload, eventCtx(removePayload));
      // [G4-R4-视角11-03] cardDelete 从既有删卡通道产出活动记录——此前删除
      // 卡片后日志毫无痕迹。
      recordAction({
        type: 'cardDelete',
        actor: { id: 'local', name: t('scheduling.kanban.currentUser') },
        detail: { cardId: ((card?.data?.title as string) || cardId), fromColumnId: columnId },
      });
    }
  }, [boardData, isControlled, handleSetBoardData, events, eventCtx, recordAction]);

  // 22-12: component:moveCard 程序式移动（design.md §8）。
  const handleCardMoveViaHandle = useCallback((cardId: string, toColumnId: string, toIndex: number): boolean => {
    if (isControlled) return false;
    const card = boardData[cardId];
    if (!card) return false;
    // 1-4: 目标列不存在 → 失败（{ok:false}），不落位、不派发 onCardMove——
    // moveCard helper 也保证目标缺失时卡片不被摘除，双重防护。
    if (!boardData[toColumnId]) return false;
    const fromColumnId = card.parentId || '';
    const fromIndex = boardData[fromColumnId] ? [...boardData[fromColumnId].children].indexOf(cardId) : -1;
    const newBoard = moveCard(boardData, cardId, toColumnId, toIndex);
    lastCommandTypeRef.current = 'moveCard';
    handleSetBoardData(newBoard, 'moveCard', { cardId, fromColumnId, toColumnId, fromIndex, toIndex });
    const movePayload = { cardId, fromColumnId, toColumnId, fromIndex, toIndex, card };
    if (!isControlled) {
      void events.onCardMove?.(movePayload, eventCtx(movePayload));
    }
    return true;
  }, [isControlled, boardData, handleSetBoardData, events, eventCtx]);

  // 22-12: component:collapseColumn 程序式折叠（design.md §8）。
  const handleCollapseColumn = useCallback((columnId: string, collapsed: boolean): boolean => {
    if (collapsedOwnership === 'controlled') return false;
    setCollapsedMap((prev) => ({ ...prev, [columnId]: collapsed }));
    return true;
  }, [collapsedOwnership, setCollapsedMap]);

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const startAddColumn = () => {
    setAddingColumn(true);
    setNewColumnTitle('');
  };

  const confirmAddColumn = useCallback(() => {
    const title = newColumnTitle.trim() || t('scheduling.kanban.newColumn');
    const columnId = nextColumnId();
    const rootChildren = boardData['root']?.children ? [...boardData['root'].children] : [];
    const newBoard: BoardData = {
      ...boardData,
      [columnId]: { id: columnId, title, children: [], data: { title }, meta: {}, type: 'column' },
      root: { ...boardData['root'], children: [...rootChildren, columnId] },
    };
    lastCommandTypeRef.current = 'addColumn';
    handleSetBoardData(newBoard, 'addColumn', { columnId, columnData: newBoard[columnId], index: rootChildren.length });
    const colAddPayload = { columnId, index: rootChildren.length };
    // 22-04: controlled 模式 mutation 被丢弃，mutation 事件不得声称已发生
    // （对齐同文件 :285/:308/:330/:353/:366 守卫先例）。
    if (!isControlled) {
      void events.onColumnAdd?.(colAddPayload, eventCtx(colAddPayload));
      // [G4-R4-视角11-03] columnCreate 从既有建列通道产出活动记录。
      recordAction({
        type: 'columnCreate',
        actor: { id: 'local', name: t('scheduling.kanban.currentUser') },
        detail: { toColumnId: columnId },
      });
    }
    setAddingColumn(false);
    setNewColumnTitle('');
  }, [newColumnTitle, boardData, isControlled, events, eventCtx, recordAction, handleSetBoardData]);

  const cancelAddColumn = useCallback(() => { setAddingColumn(false); setNewColumnTitle(''); }, []);

  const boardRef = useRef<HTMLDivElement>(null);

  // 22-12: component:* 句柄读取的最新操作面镜像（calendar navRef 模式）。
  // 每次渲染后刷新；句柄 invoke 经镜像间接调用，保持注册 identity 稳定。
  const kanbanSurfaceRef = useRef<KanbanHandleSurface>({
    scrollToCard: () => false,
    scrollToColumn: () => false,
    addCard: () => false,
    removeCard: () => false,
    moveCard: () => false,
    collapseColumn: () => false,
    getData: () => boardDataRef.current,
    getColumnsCount: () => getColumns(boardDataRef.current).length,
  });
  useEffect(() => {
    kanbanSurfaceRef.current = {
      scrollToCard: (cardId: string): boolean => {
        const root = boardRef.current;
        if (!root) return false;
        const el = root.querySelector(`[data-card-id="${cardId}"]`);
        if (!el) return false;
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return true;
      },
      scrollToColumn: (columnId: string): boolean => {
        const root = boardRef.current;
        if (!root) return false;
        const el = root.querySelector(`[data-column-id="${columnId}"]`);
        if (!el) return false;
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return true;
      },
      addCard: handleCardAddAt,
      removeCard: (cardId: string): boolean => {
        if (isControlled) return false;
        if (!boardData[cardId]) return false;
        handleCardRemove(cardId);
        return true;
      },
      moveCard: handleCardMoveViaHandle,
      collapseColumn: handleCollapseColumn,
      getData: (): BoardData => boardDataRef.current,
      getColumnsCount: (): number => getColumns(boardDataRef.current).length,
    };
    // 回调稳定化（useCallback 家族）之后按依赖收口——此前无 deps 每 render
    // 重建镜像；在回调稳定化之前加 deps 会拿到过期闭包（see plan 2026-09-29-1）。
    // boardDataRef is a stable ref mirror — its identity never changes, so
    // listing it satisfies exhaustive-deps without re-running the effect.
  }, [handleCardAddAt, handleCardRemove, handleCardMoveViaHandle, handleCollapseColumn, isControlled, boardData, boardDataRef]);

  // 22-12: ComponentHandle 注册（gantt.tsx / calendar.tsx 模式，实现抽离
  // `kanban-handle.ts`）——使 design.md §8 声明的 component:scrollToCard/
  // scrollToColumn/addCard/removeCard/moveCard/collapseColumn/getData 运行时
  // 经 registry 可解析。
  const componentRegistry = useCurrentComponentRegistry();
  useEffect(() => {
    if (!componentRegistry) return;
    return registerKanbanHandle({
      componentRegistry,
      id: props.id,
      cid: meta.cid,
      getSurface: () => kanbanSurfaceRef.current,
    });
  }, [componentRegistry, props.id, meta.cid]);

  useKanbanBoardEffects({
    boardRef,
    draggable,
    keyboardReorder: resolved.keyboardReorder,
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
          <Skeleton key={i} className="nop-kanban-skeleton min-w-[280px] h-64 rounded-lg" />
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
      <div data-slot="kanban" data-empty="true" data-testid={meta.testid || undefined} data-cid={meta.cid || undefined} className={cn('nop-kanban nop-kanban-empty flex items-center justify-center py-12 text-muted-foreground text-sm', meta.className)}>
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
    <div
      ref={boardRef}
      data-slot="kanban"
      inert={meta.disabled === true || undefined}
      aria-disabled={meta.disabled === true || undefined}
      data-disabled={meta.disabled === true ? 'true' : undefined}
      data-testid={meta.testid || undefined}
      data-cid={meta.cid || undefined}
      className={cn('nop-kanban flex flex-col h-full min-h-0', meta.className)}
    >
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
          <Button variant="link" size="sm" onClick={clearFilterError}>{t('flux.common.dismiss')}</Button>
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
                onResizeStart={resize.handleResizeStart}
                onResizeKeyDown={resize.handleResizeKeyDown}
                minWidth={resize.minWidth}
                maxWidth={resize.maxWidth}
                virtualize
                wipWarning={overLimit}
                wipText={wipText}
                onDragHandleKeyDown={handleDragHandleKeyDown}
                columnHeaderClassName={columnHeaderClassName}
                cardClassName={cardClassName}
                columnFooterClassName={columnFooterClassName}
                columnAggregate={columnAggregate}
                onAggregateFallback={warnAggregateFallback}
                columnHeaderRegion={regions.columnHeader as any}
                columnHeaderToolbarRegion={regions.columnHeaderToolbar as any}
                cardTemplateRegion={regions.cardTemplate as any}
                columnFooterRegion={regions.columnFooter as any}
                selectedTagIds={selectedTagIds}
                filterCardFn={filter.matchesCard}
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
        columnNames={(() => {
          // [G4-R4-视角11-02] board 内真实列名 → 日志渲染消费，杜绝恒等映射。
          const names: Record<string, string> = {};
          for (const col of columns) {
            const colData = boardData[col.id];
            names[col.id] = ((colData?.title as string) || (colData?.data?.title as string) || col.id);
          }
          return names;
        })()}
      />
    </div>
  );
}
