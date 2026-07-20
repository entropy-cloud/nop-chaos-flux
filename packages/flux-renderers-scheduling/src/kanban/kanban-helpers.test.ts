import { describe, it, expect } from 'vitest';
import type { BoardData } from './kanban.types.js';
import { moveCard, moveColumn, addCard, removeCard, changeCard, addColumn, removeColumn } from './kanban-helpers.js';

function createSampleBoard(): BoardData {
  return {
    root: {
      id: 'root',
      type: 'root',
      children: ['col1', 'col2'],
      data: {},
      meta: {},
    },
    col1: {
      id: 'col1',
      type: 'column',
      parentId: 'root',
      children: ['card1', 'card2'],
      data: { title: 'To Do' },
      meta: {},
    },
    col2: {
      id: 'col2',
      type: 'column',
      parentId: 'root',
      children: ['card3'],
      data: { title: 'Done' },
      meta: {},
    },
    card1: {
      id: 'card1',
      type: 'card',
      parentId: 'col1',
      children: [],
      data: { title: 'Task 1' },
      meta: { priority: 1 },
    },
    card2: {
      id: 'card2',
      type: 'card',
      parentId: 'col1',
      children: [],
      data: { title: 'Task 2' },
      meta: {},
    },
    card3: {
      id: 'card3',
      type: 'card',
      parentId: 'col2',
      children: [],
      data: { title: 'Task 3' },
      meta: {},
    },
  };
}

describe('moveCard', () => {
  it('moves card across columns', () => {
    const board = createSampleBoard();
    const result = moveCard(board, 'card1', 'col2', 0);
    expect(result.col1.children).toEqual(['card2']);
    expect(result.col2.children).toEqual(['card1', 'card3']);
    expect(result.card1.parentId).toBe('col2');
  });

  it('moves card within same column', () => {
    const board = createSampleBoard();
    const result = moveCard(board, 'card1', 'col1', 1);
    expect(result.col1.children).toEqual(['card2', 'card1']);
    expect(result.card1.parentId).toBe('col1');
  });

  it('moves card to end when index >= children length', () => {
    const board = createSampleBoard();
    const result = moveCard(board, 'card1', 'col2', 10);
    expect(result.col2.children).toEqual(['card3', 'card1']);
  });

  it('moves card to start when index < 0', () => {
    const board = createSampleBoard();
    const result = moveCard(board, 'card3', 'col1', -1);
    expect(result.col1.children).toEqual(['card3', 'card1', 'card2']);
  });

  it('handles move to empty column', () => {
    const board = createSampleBoard();
    board.col2.children = [];
    const result = moveCard(board, 'card1', 'col2', 0);
    expect(result.col1.children).toEqual(['card2']);
    expect(result.col2.children).toEqual(['card1']);
  });

  it('handles move from single-card column', () => {
    const board = createSampleBoard();
    const result = moveCard(board, 'card3', 'col1', 0);
    expect(result.col2.children).toEqual([]);
    expect(result.col1.children).toEqual(['card3', 'card1', 'card2']);
  });

  it('does not mutate original board', () => {
    const board = createSampleBoard();
    const original = JSON.parse(JSON.stringify(board));
    moveCard(board, 'card1', 'col2', 0);
    expect(board).toEqual(original);
  });
});

describe('moveColumn', () => {
  it('reorders columns', () => {
    const board = createSampleBoard();
    const result = moveColumn(board, 'col2', 0);
    expect(result.root.children).toEqual(['col2', 'col1']);
  });

  it('moves column to end', () => {
    const board = createSampleBoard();
    const result = moveColumn(board, 'col1', 10);
    expect(result.root.children).toEqual(['col2', 'col1']);
  });

  it('does not mutate original board', () => {
    const board = createSampleBoard();
    const original = JSON.parse(JSON.stringify(board));
    moveColumn(board, 'col2', 0);
    expect(board).toEqual(original);
  });
});

describe('addCard', () => {
  it('adds card to column at end by default', () => {
    const board = createSampleBoard();
    const result = addCard(board, 'col1', { id: 'card4', title: 'New Card' });
    expect(result.col1.children).toEqual(['card1', 'card2', 'card4']);
    expect(result.card4.parentId).toBe('col1');
    expect(result.card4.type).toBe('card');
  });

  it('adds card at specific index', () => {
    const board = createSampleBoard();
    const result = addCard(board, 'col1', { id: 'card4', title: 'New Card' }, 1);
    expect(result.col1.children).toEqual(['card1', 'card4', 'card2']);
  });

  it('does not mutate original board', () => {
    const board = createSampleBoard();
    const original = JSON.parse(JSON.stringify(board));
    addCard(board, 'col1', { id: 'card4', title: 'New Card' });
    expect(board).toEqual(original);
  });
});

describe('removeCard', () => {
  it('removes card and cleans up parent reference', () => {
    const board = createSampleBoard();
    const result = removeCard(board, 'card1');
    expect(result.col1.children).toEqual(['card2']);
    expect(result.card1).toBeUndefined();
  });

  it('does not mutate original board', () => {
    const board = createSampleBoard();
    const original = JSON.parse(JSON.stringify(board));
    removeCard(board, 'card1');
    expect(board).toEqual(original);
  });
});

describe('changeCard', () => {
  it('updates card data partially', () => {
    const board = createSampleBoard();
    const result = changeCard(board, 'card1', { data: { title: 'Updated Task' } });
    expect(result.card1.data.title).toBe('Updated Task');
    expect(result.card1.data).not.toHaveProperty('priority');
  });

  it('does not mutate original board', () => {
    const board = createSampleBoard();
    const original = JSON.parse(JSON.stringify(board));
    changeCard(board, 'card1', { data: { title: 'Updated' } });
    expect(board).toEqual(original);
  });
});

describe('addColumn', () => {
  it('adds column at end by default', () => {
    const board = createSampleBoard();
    const result = addColumn(board, { id: 'col3', title: 'In Progress' });
    expect(result.root.children).toEqual(['col1', 'col2', 'col3']);
    expect(result.col3.parentId).toBe('root');
    expect(result.col3.type).toBe('column');
  });

  it('adds column at specific index', () => {
    const board = createSampleBoard();
    const result = addColumn(board, { id: 'col3', title: 'In Progress' }, 1);
    expect(result.root.children).toEqual(['col1', 'col3', 'col2']);
  });

  it('does not mutate original board', () => {
    const board = createSampleBoard();
    const original = JSON.parse(JSON.stringify(board));
    addColumn(board, { id: 'col3', title: 'New' });
    expect(board).toEqual(original);
  });
});

describe('removeColumn', () => {
  it('removes column and its children', () => {
    const board = createSampleBoard();
    const result = removeColumn(board, 'col1');
    expect(result.root.children).toEqual(['col2']);
    expect(result.col1).toBeUndefined();
    expect(result.card1).toBeUndefined();
    expect(result.card2).toBeUndefined();
  });

  it('does not remove root', () => {
    const board = createSampleBoard();
    const result = removeColumn(board, 'root');
    expect(result.root).toBeDefined();
  });

  it('does not mutate original board', () => {
    const board = createSampleBoard();
    const original = JSON.parse(JSON.stringify(board));
    removeColumn(board, 'col1');
    expect(board).toEqual(original);
  });
});
