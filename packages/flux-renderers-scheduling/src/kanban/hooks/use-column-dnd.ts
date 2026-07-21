import { useEffect, useRef, useCallback } from 'react';
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { BoardData } from '../kanban.types.js';
import { moveColumn } from '../kanban-helpers.js';

export interface UseColumnDndOptions {
  boardData: BoardData;
  onBoardChange: (board: BoardData) => void;
  onColumnReorder?: (payload: { columnId: string; fromIndex: number; toIndex: number }) => void;
}

export function useColumnDnd({ boardData, onBoardChange, onColumnReorder }: UseColumnDndOptions) {
  const stateRef = useRef({ boardData, onBoardChange, onColumnReorder });

  useEffect(() => {
    stateRef.current = { boardData, onBoardChange, onColumnReorder };
  }, [boardData, onBoardChange, onColumnReorder]);

  useEffect(() => {
    return monitorForElements({
      canMonitor({ source }) {
        return source.data.type === 'kanban-column-header';
      },
      onDrop({ source, location }) {
        const columnId = source.data.columnId as string;

        const target = location.current.dropTargets[0];
        if (!target) return;

        const targetData = target.data;
        const targetIndex = targetData.columnIndex as number;

        if (targetIndex == null) return;

        const { boardData: currentBoard, onBoardChange: changeBoard, onColumnReorder: reorderEvent } = stateRef.current;
        const root = currentBoard['root'];
        if (!root) return;

        const fromIndex = root.children.indexOf(columnId);
        if (fromIndex === -1 || fromIndex === targetIndex) return;

        const newBoard = moveColumn(currentBoard, columnId, targetIndex);
        changeBoard(newBoard);

        if (reorderEvent) {
          reorderEvent({ columnId, fromIndex, toIndex: targetIndex });
        }
      },
    });
  }, []);

  const registerColumnHeader = useCallback((
    element: HTMLElement, columnId: string,
  ) => {
    return draggable({
      element,
      getInitialData: () => ({
        type: 'kanban-column-header',
        columnId,
      }),
    });
  }, []);

  const registerBoardDropZone = (
    element: HTMLElement, columnIndex: number,
  ) => {
    return dropTargetForElements({
      element,
      getData: () => ({
        type: 'kanban-column-drop-zone',
        columnIndex,
      }),
      canDrop({ source }) {
        return source.data.type === 'kanban-column-header';
      },
    });
  };

  return {
    registerColumnHeader,
    registerBoardDropZone,
  };
}
