import type { BoardData, BoardItem } from './kanban.types.js';

function cloneBoard(board: BoardData): BoardData {
  return structuredClone(board);
}

export function moveCard(board: BoardData, cardId: string, targetColumnId: string, targetIndex: number): BoardData {
  const result = cloneBoard(board);
  const card = result[cardId];
  if (!card) return result;

  const oldParentId = card.parentId;
  if (oldParentId && result[oldParentId]) {
    const oldParent = result[oldParentId];
    const idx = oldParent.children.indexOf(cardId);
    if (idx !== -1) {
      oldParent.children.splice(idx, 1);
    }
  }

  const targetColumn = result[targetColumnId];
  if (!targetColumn) return result;

  const clampedIndex = Math.max(0, Math.min(targetIndex, targetColumn.children.length));
  targetColumn.children.splice(clampedIndex, 0, cardId);
  card.parentId = targetColumnId;

  return result;
}

export function moveColumn(board: BoardData, columnId: string, targetIndex: number): BoardData {
  const result = cloneBoard(board);
  const root = result['root'];
  if (!root) return result;

  const idx = root.children.indexOf(columnId);
  if (idx === -1) return result;

  root.children.splice(idx, 1);
  const clampedIndex = Math.max(0, Math.min(targetIndex, root.children.length));
  root.children.splice(clampedIndex, 0, columnId);

  return result;
}

export function addCard(board: BoardData, columnId: string, cardData: Record<string, any>, index?: number): BoardData {
  const result = cloneBoard(board);
  const cardId = cardData.id as string;
  if (!cardId) return result;

  const card: BoardItem = {
    id: cardId,
    type: 'card',
    parentId: columnId,
    children: [],
    data: cardData,
    meta: {},
  };

  result[cardId] = card;

  const column = result[columnId];
  if (column) {
    if (index !== undefined && index >= 0 && index <= column.children.length) {
      column.children.splice(index, 0, cardId);
    } else {
      column.children.push(cardId);
    }
  }

  return result;
}

export function removeCard(board: BoardData, cardId: string): BoardData {
  const result = cloneBoard(board);
  const card = result[cardId];
  if (!card) return result;

  const parentId = card.parentId;
  if (parentId && result[parentId]) {
    const parent = result[parentId];
    const idx = parent.children.indexOf(cardId);
    if (idx !== -1) {
      parent.children.splice(idx, 1);
    }
  }

  delete result[cardId];
  return result;
}

export function changeCard(board: BoardData, cardId: string, partial: Record<string, any>): BoardData {
  const result = cloneBoard(board);
  const card = result[cardId];
  if (!card) return result;

  if (partial.data && typeof partial.data === 'object') {
    Object.assign(card.data, partial.data);
  }
  if (partial.meta && typeof partial.meta === 'object') {
    Object.assign(card.meta, partial.meta);
  }

  if ('parentId' in partial) {
    const oldParentId = card.parentId;
    const newParentId = partial.parentId as string;
    if (oldParentId !== newParentId && result[newParentId]) {
      if (oldParentId && result[oldParentId]) {
        const oldParent = result[oldParentId];
        const idx = oldParent.children.indexOf(cardId);
        if (idx !== -1) oldParent.children.splice(idx, 1);
      }
      card.parentId = newParentId;
      result[newParentId].children.push(cardId);
    }
  }

  return result;
}

export function addColumn(board: BoardData, columnData: Record<string, any>, index?: number): BoardData {
  const result = cloneBoard(board);
  const columnId = columnData.id as string;
  if (!columnId) return result;

  const column: BoardItem = {
    id: columnId,
    type: 'column',
    parentId: 'root',
    children: [],
    data: columnData,
    meta: {},
  };

  result[columnId] = column;

  const root = result['root'];
  if (root) {
    if (index !== undefined && index >= 0 && index <= root.children.length) {
      root.children.splice(index, 0, columnId);
    } else {
      root.children.push(columnId);
    }
  }

  return result;
}

export function removeColumn(board: BoardData, columnId: string): BoardData {
  const result = cloneBoard(board);
  const column = result[columnId];
  if (!column || columnId === 'root') return result;

  for (const childId of column.children) {
    delete result[childId];
  }

  const root = result['root'];
  if (root) {
    const idx = root.children.indexOf(columnId);
    if (idx !== -1) {
      root.children.splice(idx, 1);
    }
  }

  delete result[columnId];
  return result;
}
