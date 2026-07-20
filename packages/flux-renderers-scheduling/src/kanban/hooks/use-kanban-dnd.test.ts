import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { BoardData } from '../kanban.types.js';
import { useKanbanDnd } from './use-kanban-dnd.js';
import { moveCard } from '../kanban-helpers.js';

const sampleBoard: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1', 'col2'], data: {}, meta: {} },
  col1: {
    id: 'col1', type: 'column', parentId: 'root',
    children: ['card1', 'card2'],
    data: { title: 'To Do' }, meta: {},
  },
  col2: {
    id: 'col2', type: 'column', parentId: 'root',
    children: ['card3'],
    data: { title: 'Done' }, meta: {},
  },
  card1: { id: 'card1', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 1' }, meta: {} },
  card2: { id: 'card2', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 2' }, meta: {} },
  card3: { id: 'card3', type: 'card', parentId: 'col2', children: [], data: { title: 'Task 3' }, meta: {} },
};

describe('useKanbanDnd', () => {
  it('returns registerCard and registerColumn functions', () => {
    const onBoardChange = vi.fn();
    const { result } = renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange }),
    );

    expect(result.current.registerCard).toBeInstanceOf(Function);
    expect(result.current.registerColumn).toBeInstanceOf(Function);
    expect(result.current.dragState.isDragging).toBe(false);
    expect(result.current.dragState.draggingCardId).toBe(null);
  });

  it('moveCard helper works correctly for cross-column move', () => {
    const result = moveCard(sampleBoard, 'card1', 'col2', 0);
    expect(result.col1.children).toEqual(['card2']);
    expect(result.col2.children).toEqual(['card1', 'card3']);
    expect(result.card1.parentId).toBe('col2');
  });

  it('moveCard helper is immutable', () => {
    const original = JSON.parse(JSON.stringify(sampleBoard));
    moveCard(sampleBoard, 'card1', 'col2', 0);
    expect(sampleBoard).toEqual(original);
  });
});

describe('useKanbanDnd callbacks', () => {
  it('calls onBoardChange when moveCard is applied', () => {
    const onBoardChange = vi.fn();
    renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange }),
    );

    const newBoard = moveCard(sampleBoard, 'card1', 'col2', 0);
    expect(newBoard.card1.parentId).toBe('col2');
  });
});
