import { useEffect, useRef, useState, useCallback } from 'react';
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import type { BoardData } from '../kanban.types.js';
import { moveCard } from '../kanban-helpers.js';

export interface DragState {
  isDragging: boolean;
  draggingCardId: string | null;
  sourceColumnId: string | null;
}

export interface DropState {
  targetColumnId: string | null;
  targetCardIndex: number | null;
  closestEdge: 'before' | 'after' | null;
}

export interface UseKanbanDndOptions {
  boardData: BoardData;
  onBoardChange: (board: BoardData) => void;
  onCardMove?: (payload: {
    cardId: string;
    fromColumnId: string;
    toColumnId: string;
    fromIndex: number;
    toIndex: number;
    overLimit?: boolean;
  }) => void;
  wipOverLimitColumns?: Set<string>;
}

export function useKanbanDnd({ boardData, onBoardChange, onCardMove, wipOverLimitColumns }: UseKanbanDndOptions) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggingCardId: null,
    sourceColumnId: null,
  });
  const [dropState, setDropState] = useState<DropState>({
    targetColumnId: null,
    targetCardIndex: null,
    closestEdge: null,
  });

  const stateRef = useRef({ boardData, onBoardChange, onCardMove, wipOverLimitColumns, setDropState });

  useEffect(() => {
    stateRef.current = { boardData, onBoardChange, onCardMove, wipOverLimitColumns, setDropState };
  }, [boardData, onBoardChange, onCardMove, wipOverLimitColumns, setDropState]);

  useEffect(() => {
    return monitorForElements({
      canMonitor({ source }) {
        return source.data.type === 'kanban-card';
      },
      onDragStart({ source }) {
        const cardId = source.data.cardId as string;
        const columnId = source.data.columnId as string;
        setDragState({ isDragging: true, draggingCardId: cardId, sourceColumnId: columnId });
      },
      onDrop({ source, location }) {
        setDragState({ isDragging: false, draggingCardId: null, sourceColumnId: null });
        setDropState({ targetColumnId: null, targetCardIndex: null, closestEdge: null });

        const cardId = source.data.cardId as string;
        const fromColumnId = source.data.columnId as string;

        const target = location.current.dropTargets[0];
        if (!target) return;

        const targetData = target.data;
        const toColumnId = targetData.columnId as string;
        const toIndex = targetData.dropIndex as number;

        if (toColumnId == null || toIndex == null) return;
        if (fromColumnId === toColumnId && (targetData.cardIndex as number) === (source.data.cardIndex as number)) return;

        const { boardData: currentBoard, onBoardChange: changeBoard, onCardMove: moveEvent, wipOverLimitColumns: wipSet } = stateRef.current;
        const newBoard = moveCard(currentBoard, cardId, toColumnId, toIndex);

        changeBoard(newBoard);

        if (moveEvent) {
          const fromCol = currentBoard[fromColumnId];
          const fromIndex = fromCol ? fromCol.children.indexOf(cardId) : -1;
          const overLimit = wipSet?.has(toColumnId) ?? false;
          moveEvent({ cardId, fromColumnId, toColumnId, fromIndex, toIndex, overLimit });
        }
      },
    });
  }, []);

  const registerCard = useCallback((
    element: HTMLElement, cardId: string, columnId: string, index: number,
  ) => {
    return combine(
      draggable({
        element,
        getInitialData: () => ({
          type: 'kanban-card',
          cardId,
          columnId,
          cardIndex: index,
        }),
      }),
      dropTargetForElements({
        element,
        getData: () => ({
          type: 'kanban-card-target',
          columnId,
          cardIndex: index,
          dropIndex: index,
        }),
        canDrop({ source }) {
          if (source.data.type !== 'kanban-card') return false;
          return true;
        },
        onDrag({ location, self }) {
          const rect = self.element.getBoundingClientRect();
          const clientY = location.current.input.clientY;
          const midY = rect.top + rect.height / 2;
          const edge = clientY < midY ? 'before' : 'after';
          setDropState((prev) => {
            if (prev.targetColumnId === columnId && prev.targetCardIndex === index && prev.closestEdge === edge) return prev;
            return { targetColumnId: columnId, targetCardIndex: index, closestEdge: edge };
          });
        },
        onDragLeave() {
          setDropState((prev) =>
            prev.targetCardIndex === index ? { targetColumnId: prev.targetColumnId, targetCardIndex: null, closestEdge: null } : prev,
          );
        },
      }),
    );
  }, []);

  const registerColumn = useCallback((
    element: HTMLElement, columnId: string, cardCount: number,
  ) => {
    return dropTargetForElements({
      element,
      getData: () => ({
        type: 'kanban-column',
        columnId,
        dropIndex: cardCount,
      }),
      canDrop({ source }) {
        if (source.data.type !== 'kanban-card') return false;
        if (wipOverLimitColumns?.has(columnId)) return false;
        return true;
      },
      onDragEnter() {
        setDropState((prev) => ({ ...prev, targetColumnId: columnId }));
      },
      onDragLeave() {
        setDropState((prev) =>
          prev.targetColumnId === columnId ? { ...prev, targetColumnId: null } : prev,
        );
      },
    });
  }, [wipOverLimitColumns]);

  const moveCardKeyboard = (
    boardData: BoardData,
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    fromIndex: number,
    toIndex: number,
  ) => {
    const newBoard = moveCard(boardData, cardId, toColumnId, toIndex);
    onBoardChange(newBoard);

    const fromCol = boardData[fromColumnId];
    const finalFromIndex = fromCol ? fromCol.children.indexOf(cardId) : -1;
    onCardMove?.({
      cardId,
      fromColumnId,
      toColumnId,
      fromIndex: finalFromIndex,
      toIndex,
      overLimit: wipOverLimitColumns?.has(toColumnId) ?? false,
    });
  };

  return {
    dragState,
    dropState,
    registerCard,
    registerColumn,
    moveCardKeyboard,
  };
}
