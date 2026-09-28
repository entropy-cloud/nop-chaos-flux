import type { BoardData, BoardItem } from './kanban.types.js';

// Structural-sharing mutations: only the touched entries (board map shell,
// source/target column children arrays, moved card entry) get fresh identity;
// every untouched column/card entry is shared by reference with the previous
// board. The previous `structuredClone(board)` serialized the whole board per
// mutation, which dominated drag-drop cost on large boards.

export function moveCard(board: BoardData, cardId: string, targetColumnId: string, targetIndex: number): BoardData {
  const card = board[cardId];
  if (!card) return board;

  // 1-4: 先校验目标列存在，再摘除旧列——目标列缺失时 board 原样返回，
  // 卡片不得被孤儿化（旧实现先摘除后 return，卡片从所有列 children 消失）。
  const targetColumn = board[targetColumnId];
  if (!targetColumn) return board;

  const oldParentId = card.parentId;
  let result = board;
  if (oldParentId && board[oldParentId]) {
    const oldParent = board[oldParentId];
    if (oldParent.children.includes(cardId)) {
      result = {
        ...result,
        [oldParentId]: { ...oldParent, children: oldParent.children.filter((id) => id !== cardId) },
      };
    }
  }

  const removedColumn = result[targetColumnId];
  const targetChildren = [...removedColumn.children];
  const clampedIndex = Math.max(0, Math.min(targetIndex, targetChildren.length));
  targetChildren.splice(clampedIndex, 0, cardId);

  return {
    ...result,
    [targetColumnId]: { ...removedColumn, children: targetChildren },
    [cardId]: { ...card, parentId: targetColumnId },
  };
}

export function moveColumn(board: BoardData, columnId: string, targetIndex: number): BoardData {
  const root = board['root'];
  if (!root) return board;

  if (!root.children.includes(columnId)) return board;

  const next = root.children.filter((id) => id !== columnId);
  const clampedIndex = Math.max(0, Math.min(targetIndex, next.length));
  next.splice(clampedIndex, 0, columnId);

  return { ...board, root: { ...root, children: next } };
}

export function addCard(board: BoardData, columnId: string, cardData: Record<string, any>, index?: number, meta?: Record<string, any>): BoardData {
  const cardId = cardData.id as string;
  if (!cardId) return board;

  const card: BoardItem = {
    id: cardId,
    type: 'card',
    parentId: columnId,
    children: [],
    title: cardData.title as string | undefined,
    content: cardData.content as string | undefined,
    data: cardData,
    // 1-5: 正常新增保持 `meta: {}` 契约；undo 恢复路径显式传入捕获的 meta。
    meta: meta ?? {},
  };

  const column = board[columnId];
  const result: BoardData = { ...board, [cardId]: card };
  if (!column) return result;

  const children = [...column.children];
  if (index !== undefined && index >= 0 && index <= children.length) {
    children.splice(index, 0, cardId);
  } else {
    children.push(cardId);
  }
  result[columnId] = { ...column, children };
  return result;
}

export function removeCard(board: BoardData, cardId: string): BoardData {
  const card = board[cardId];
  if (!card) return board;

  const result: BoardData = { ...board };
  delete result[cardId];

  const parentId = card.parentId;
  if (parentId && result[parentId]) {
    const parent = result[parentId];
    if (parent.children.includes(cardId)) {
      result[parentId] = { ...parent, children: parent.children.filter((id) => id !== cardId) };
    }
  }
  return result;
}

export function changeCard(board: BoardData, cardId: string, partial: Record<string, any>): BoardData {
  const card = board[cardId];
  if (!card) return board;

  let nextCard = card;
  if (partial.data && typeof partial.data === 'object') {
    nextCard = { ...nextCard, data: { ...((nextCard.data ?? {}) as Record<string, unknown>), ...partial.data } };
  }
  if (partial.meta && typeof partial.meta === 'object') {
    nextCard = { ...nextCard, meta: { ...((nextCard.meta ?? {}) as Record<string, unknown>), ...partial.meta } };
  }

  if ('parentId' in partial) {
    const oldParentId = card.parentId;
    const newParentId = partial.parentId as string;
    if (oldParentId !== newParentId && board[newParentId]) {
      const result: BoardData = { ...board, [cardId]: { ...nextCard, parentId: newParentId } };
      if (oldParentId && result[oldParentId]) {
        const oldParent = result[oldParentId];
        if (oldParent.children.includes(cardId)) {
          result[oldParentId] = { ...oldParent, children: oldParent.children.filter((id) => id !== cardId) };
        }
      }
      result[newParentId] = { ...result[newParentId], children: [...result[newParentId].children, cardId] };
      return result;
    }
  }

  if (nextCard === card) return board;
  return { ...board, [cardId]: nextCard };
}

export function addColumn(board: BoardData, columnData: Record<string, any>, index?: number): BoardData {
  const columnId = columnData.id as string;
  if (!columnId) return board;

  const column: BoardItem = {
    id: columnId,
    type: 'column',
    parentId: 'root',
    children: [],
    data: columnData,
    meta: {},
  };

  const result: BoardData = { ...board, [columnId]: column };

  const root = board['root'];
  if (root) {
    const children = [...root.children];
    if (index !== undefined && index >= 0 && index <= children.length) {
      children.splice(index, 0, columnId);
    } else {
      children.push(columnId);
    }
    result['root'] = { ...root, children };
  }
  return result;
}

export function removeColumn(board: BoardData, columnId: string): BoardData {
  const column = board[columnId];
  if (!column || columnId === 'root') return board;

  const result: BoardData = { ...board };
  for (const childId of column.children) {
    delete result[childId];
  }

  const root = result['root'];
  if (root) {
    if (root.children.includes(columnId)) {
      result['root'] = { ...root, children: root.children.filter((id) => id !== columnId) };
    }
  }

  delete result[columnId];
  return result;
}

export function getColumns(board: BoardData): BoardItem[] {
  const root = board['root'];
  if (!root) return [];
  return root.children
    .map((id) => board[id])
    .filter((item): item is BoardItem => item != null && item.type === 'column');
}

export interface KanbanFilterTag {
  id: string;
  text: string;
  color: string;
}

export function collectAllTags(board: BoardData, columns: BoardItem[]): KanbanFilterTag[] {
  const tagMap = new Map<string, KanbanFilterTag>();
  for (const col of columns) {
    for (const childId of col.children) {
      const card = board[childId];
      if (card?.meta?.tags && Array.isArray(card.meta.tags)) {
        for (const tag of card.meta.tags) {
          if (!tagMap.has(tag.id)) {
            tagMap.set(tag.id, { id: tag.id, text: tag.text, color: tag.color ?? '' });
          }
        }
      }
    }
  }
  return Array.from(tagMap.values());
}

/**
 * Resolve the card-insertion index for a DnD drop.
 *
 * - 'after' a target card inserts at cardIndex + 1 (the raw dropIndex only
 *   points *before* the target card).
 * - Same-column downward moves: the source card is removed before insertion,
 *   so a target index after the source index shifts by one.
 */
export function resolveDropIndex(input: {
  targetType: string | undefined;
  cardIndex: number | undefined;
  dropIndex: number;
  edge: 'before' | 'after' | null;
  fromColumnId: string;
  toColumnId: string;
  sourceIndex: number;
}): number {
  const { targetType, cardIndex, dropIndex, edge, fromColumnId, toColumnId, sourceIndex } = input;
  let toIndex = dropIndex;
  if (targetType === 'kanban-card-target') {
    if (edge === 'after' && typeof cardIndex === 'number') {
      toIndex = cardIndex + 1;
    }
  }
  if (fromColumnId === toColumnId && sourceIndex < toIndex) {
    toIndex -= 1;
  }
  return toIndex;
}
