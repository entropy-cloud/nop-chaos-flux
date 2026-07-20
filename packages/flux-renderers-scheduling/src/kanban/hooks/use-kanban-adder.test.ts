import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { BoardData } from '../kanban.types.js';
import { useKanbanAdder } from './use-kanban-adder.js';
import { addCard, addColumn, removeCard, removeColumn } from '../kanban-helpers.js';

const sampleBoard: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1'], data: {}, meta: {} },
  col1: {
    id: 'col1', type: 'column', parentId: 'root',
    children: ['card1'],
    data: { title: 'To Do' }, meta: {},
  },
  card1: { id: 'card1', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 1' }, meta: {} },
};

describe('useKanbanAdder', () => {
  it('addCard adds a card to the specified column', () => {
    const onBoardChange = vi.fn();
    const { result } = renderHook(() =>
      useKanbanAdder({ boardData: sampleBoard, onBoardChange }),
    );

    act(() => {
      result.current.addCard('col1', { title: 'New Card' });
    });

    expect(onBoardChange).toHaveBeenCalledTimes(1);
    const newBoard = onBoardChange.mock.calls[0][0] as BoardData;
    const col1 = newBoard['col1'];
    expect(col1).toBeTruthy();
    expect(col1.children.length).toBe(2);
    expect(newBoard[col1.children[1]].data.title).toBe('New Card');
  });

  it('removeCard removes a card', () => {
    const onBoardChange = vi.fn();
    const { result } = renderHook(() =>
      useKanbanAdder({ boardData: sampleBoard, onBoardChange }),
    );

    act(() => {
      result.current.removeCard('card1');
    });

    expect(onBoardChange).toHaveBeenCalledTimes(1);
    const newBoard = onBoardChange.mock.calls[0][0] as BoardData;
    expect(newBoard['card1']).toBeUndefined();
    expect(newBoard['col1'].children).toEqual([]);
  });

  it('addColumn adds a new column', () => {
    const onBoardChange = vi.fn();
    const { result } = renderHook(() =>
      useKanbanAdder({ boardData: sampleBoard, onBoardChange }),
    );

    act(() => {
      result.current.addColumn({ title: 'Done' });
    });

    expect(onBoardChange).toHaveBeenCalledTimes(1);
    const newBoard = onBoardChange.mock.calls[0][0] as BoardData;
    expect(newBoard['root'].children.length).toBe(2);
    const newColId = newBoard['root'].children[1];
    expect(newBoard[newColId].data.title).toBe('Done');
  });

  it('removeColumn removes a column and its cards', () => {
    const onBoardChange = vi.fn();
    const { result } = renderHook(() =>
      useKanbanAdder({ boardData: sampleBoard, onBoardChange }),
    );

    act(() => {
      result.current.removeColumn('col1');
    });

    expect(onBoardChange).toHaveBeenCalledTimes(1);
    const newBoard = onBoardChange.mock.calls[0][0] as BoardData;
    expect(newBoard['col1']).toBeUndefined();
    expect(newBoard['card1']).toBeUndefined();
    expect(newBoard['root'].children).toEqual([]);
  });

  it('helper functions work correctly', () => {
    const result = addCard(sampleBoard, 'col1', { id: 'new-card', title: 'New' });
    expect(result['col1'].children).toContain('new-card');
    expect(result['new-card'].parentId).toBe('col1');

    const result2 = addColumn(sampleBoard, { id: 'new-col', title: 'New Col' });
    expect(result2['root'].children).toContain('new-col');

    const result3 = removeCard(sampleBoard, 'card1');
    expect(result3['card1']).toBeUndefined();

    const result4 = removeColumn(sampleBoard, 'col1');
    expect(result4['col1']).toBeUndefined();
  });
});
