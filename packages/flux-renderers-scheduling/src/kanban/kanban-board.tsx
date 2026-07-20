import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { BoardData, BoardItem, KanbanSchema, KanbanCardConfig } from './kanban.types.js';
import { KanbanColumn } from './kanban-column.js';
import { useKanbanDnd } from './hooks/use-kanban-dnd.js';
import { useColumnDnd } from './hooks/use-column-dnd.js';
import { useKanbanFilter } from './hooks/use-kanban-filter.js';

function getColumns(board: BoardData): BoardItem[] {
  const root = board['root'];
  if (!root) return [];
  return root.children
    .map((id) => board[id])
    .filter((item): item is BoardItem => item != null && item.type === 'column');
}

export function KanbanBoard(props: RendererComponentProps<KanbanSchema>) {
  const { props: resolved, meta, regions, events } = props;

  const rawData = resolved.data as BoardData | undefined;
  const configMap = resolved.configMap as Record<string, KanbanCardConfig> | undefined;
  const draggable = resolved.draggable !== false;

  const initialBoard = rawData ?? { root: { id: 'root', type: 'root', children: [], data: {}, meta: {} } };
  const [boardData, setBoardData] = useState<BoardData>(initialBoard);
  const columns = useMemo(() => getColumns(boardData), [boardData]);
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const filter = useKanbanFilter({ filterText: resolved.filterText as string | undefined });

  const { registerCard, registerColumn } = useKanbanDnd({
    boardData,
    onBoardChange: setBoardData,
    onCardMove: (payload) => events.onCardMove?.(payload),
  });

  const { registerColumnHeader } = useColumnDnd({
    boardData,
    onBoardChange: setBoardData,
    onColumnReorder: (payload) => events.onColumnReorder?.(payload),
  });

  const handleToggleCollapse = useCallback((columnId: string) => {
    setCollapsedMap((prev) => ({ ...prev, [columnId]: !prev[columnId] }));
  }, []);

  const handleCardClick = useCallback(
    (cardId: string, columnId: string, index: number) => {
      events.onCardClick?.({ cardId, columnId, index });
    },
    [events],
  );

  const boardRef = useRef<HTMLDivElement>(null);

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

  if (resolved.loading || meta.disabled === undefined) {
    const skeletonRegion = regions.loading;
    if (skeletonRegion) {
      return <div data-slot="kanban">{(skeletonRegion as { render: () => React.ReactNode }).render()}</div>;
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
      return <div data-slot="kanban">{(emptyRegion as { render: () => React.ReactNode }).render()}</div>;
    }
    return (
      <div data-slot="kanban-empty" className="nop-kanban-empty flex items-center justify-center py-12 text-gray-400 text-sm">
        暂无数据
      </div>
    );
  }

  return (
    <div ref={boardRef} data-slot="kanban" className={cn('nop-kanban flex flex-col h-full min-h-0', meta.className)}>
      <div className="flex items-center gap-2 px-4 py-2">
        <input
          type="text"
          value={filter.filterText}
          onChange={(e) => filter.setFilterText(e.target.value)}
          placeholder="搜索卡片..."
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
        />
      </div>
      <div className="nop-kanban-columns flex-1 overflow-x-auto overflow-y-hidden p-4 pt-0">
        <div className="flex gap-3 h-full items-start">
          {columns.map((col) => (
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
            />
          ))}
          <div className="nop-kanban-adder shrink-0 self-start mt-2">
            <button
              type="button"
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 min-w-[280px] justify-center transition-colors"
            >
              + 添加列
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
