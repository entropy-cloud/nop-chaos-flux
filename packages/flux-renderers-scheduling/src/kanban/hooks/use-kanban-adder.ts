
import type { BoardData } from '../kanban.types.js';
import { addCard, addColumn, removeCard, removeColumn } from '../kanban-helpers.js';

export interface UseKanbanAdderOptions {
  boardData: BoardData;
  onBoardChange: (board: BoardData) => void;
  onCardAdd?: (payload: { cardId: string; columnId: string; index: number }) => void;
  onCardRemove?: (payload: { cardId: string; columnId: string }) => void;
  onColumnAdd?: (payload: { columnId: string; index: number }) => void;
  onColumnRemove?: (payload: { columnId: string }) => void;
}

let idCounter = 0;

function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

export function useKanbanAdder({
  boardData,
  onBoardChange,
  onCardAdd,
  onCardRemove,
  onColumnAdd,
  onColumnRemove,
}: UseKanbanAdderOptions) {
  const handleAddCard = (
    columnId: string, cardData?: Record<string, any>, index?: number,
  ) => {
    const cardId = generateId('card');
    const newCard = { id: cardId, title: cardData?.title || '新卡片', ...cardData };
    const newBoard = addCard(boardData, columnId, newCard, index);
    onBoardChange(newBoard);
    onCardAdd?.({ cardId, columnId, index: index ?? -1 });
  };

  const handleRemoveCard = (
    cardId: string,
  ) => {
    const card = boardData[cardId];
    const columnId = card?.parentId || '';
    const newBoard = removeCard(boardData, cardId);
    onBoardChange(newBoard);
    onCardRemove?.({ cardId, columnId });
  };

  const handleAddColumn = (
    columnData?: Record<string, any>, index?: number,
  ) => {
    const columnId = generateId('col');
    const newColumn = { id: columnId, title: columnData?.title || '新列', ...columnData };
    const newBoard = addColumn(boardData, newColumn, index);
    onBoardChange(newBoard);
    onColumnAdd?.({ columnId, index: index ?? -1 });
  };

  const handleRemoveColumn = (
    columnId: string,
  ) => {
    const newBoard = removeColumn(boardData, columnId);
    onBoardChange(newBoard);
    onColumnRemove?.({ columnId });
  };

  return {
    addCard: handleAddCard,
    removeCard: handleRemoveCard,
    addColumn: handleAddColumn,
    removeColumn: handleRemoveColumn,
  };
}
