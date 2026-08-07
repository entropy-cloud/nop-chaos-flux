import type { BoardData, BoardItem } from './kanban.types.js';

function cloneBoard(board: BoardData): BoardData {
  return structuredClone(board);
}

export function moveCard(board: BoardData, cardId: string, targetColumnId: string, targetIndex: number): BoardData {
  const result = cloneBoard(board);
  const card = result[cardId];
  if (!card) return result;

  // 1-4: 先校验目标列存在，再摘除旧列——目标列缺失时 board 原样返回，
  // 卡片不得被孤儿化（旧实现先摘除后 return，卡片从所有列 children 消失）。
  const targetColumn = result[targetColumnId];
  if (!targetColumn) return result;

  const oldParentId = card.parentId;
  if (oldParentId && result[oldParentId]) {
    const oldParent = result[oldParentId];
    const idx = oldParent.children.indexOf(cardId);
    if (idx !== -1) {
      oldParent.children.splice(idx, 1);
    }
  }

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

export function addCard(board: BoardData, columnId: string, cardData: Record<string, any>, index?: number, meta?: Record<string, any>): BoardData {
  const result = cloneBoard(board);
  const cardId = cardData.id as string;
  if (!cardId) return result;

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
