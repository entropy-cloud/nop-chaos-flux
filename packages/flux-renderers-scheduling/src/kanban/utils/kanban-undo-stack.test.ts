import { describe, it, expect } from 'vitest';
import { createUndoStack, pushCommand, undo, redo, canUndo, canRedo, shouldMerge } from './kanban-undo-stack.js';
import type { BoardData } from '../kanban.types.js';
import type { UndoCommand } from './kanban-undo-stack.js';

function createSampleBoard(): BoardData {
  return {
    root: { id: 'root', type: 'root', children: ['col1', 'col2'], data: {}, meta: {} },
    col1: { id: 'col1', type: 'column', parentId: 'root', children: ['card1', 'card2'], data: { title: 'To Do' }, meta: {} },
    col2: { id: 'col2', type: 'column', parentId: 'root', children: ['card3'], data: { title: 'Done' }, meta: {} },
    card1: { id: 'card1', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 1' }, meta: {} },
    card2: { id: 'card2', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 2' }, meta: {} },
    card3: { id: 'card3', type: 'card', parentId: 'col2', children: [], data: { title: 'Task 3' }, meta: {} },
  };
}

describe('UndoStack', () => {
  it('creates an empty stack', () => {
    const stack = createUndoStack();
    expect(canUndo(stack)).toBe(false);
    expect(canRedo(stack)).toBe(false);
    expect(stack.undoStack).toHaveLength(0);
    expect(stack.redoStack).toHaveLength(0);
  });

  it('pushCommand adds to undo stack and clears redo', () => {
    const stack = createUndoStack();
    const cmd: UndoCommand = {
      type: 'moveCard',
      timestamp: Date.now(),
      params: { cardId: 'card1', fromColumnId: 'col1', toColumnId: 'col2', fromIndex: 0, toIndex: 1 },
    };
    const s1 = pushCommand(stack, cmd);
    expect(canUndo(s1)).toBe(true);
    expect(canRedo(s1)).toBe(false);
    expect(s1.undoStack).toHaveLength(1);
    expect(s1.redoStack).toHaveLength(0);
  });

  it('undo reverses moveCard', () => {
    const board = createSampleBoard();
    const stack = createUndoStack();
    const cmd: UndoCommand = {
      type: 'moveCard',
      timestamp: Date.now(),
      params: { cardId: 'card1', fromColumnId: 'col1', toColumnId: 'col2', fromIndex: 0, toIndex: 1 },
    };
    const s1 = pushCommand(stack, cmd);
    const result = undo(s1, board);
    expect(result).not.toBeNull();
    expect(result!.board.col1.children).toEqual(['card1', 'card2']);
    expect(canUndo(result!.stack)).toBe(false);
    expect(canRedo(result!.stack)).toBe(true);
  });

  it('redo re-applies moveCard', () => {
    const board = createSampleBoard();
    const stack = createUndoStack();
    const cmd: UndoCommand = {
      type: 'moveCard',
      timestamp: Date.now(),
      params: { cardId: 'card1', fromColumnId: 'col1', toColumnId: 'col2', fromIndex: 0, toIndex: 1 },
    };
    const s1 = pushCommand(stack, cmd);
    const afterUndo = undo(s1, board);
    const afterRedo = redo(afterUndo!.stack, afterUndo!.board);
    expect(afterRedo).not.toBeNull();
    expect(canUndo(afterRedo!.stack)).toBe(true);
    expect(canRedo(afterRedo!.stack)).toBe(false);
  });

  it('undo returns null when stack is empty', () => {
    const board = createSampleBoard();
    const stack = createUndoStack();
    expect(undo(stack, board)).toBeNull();
  });

  it('redo returns null when stack is empty', () => {
    const board = createSampleBoard();
    const stack = createUndoStack();
    expect(redo(stack, board)).toBeNull();
  });

  it('creates stack with custom maxSize', () => {
    const stack = createUndoStack(5);
    expect(stack.maxSize).toBe(5);
  });

  it('evicts oldest command when exceeding maxSize', () => {
    let stack = createUndoStack(3);
    for (let i = 0; i < 5; i++) {
      const cmd: UndoCommand = {
        type: 'moveCard',
        timestamp: Date.now(),
        params: { cardId: `card${i}` },
      };
      stack = pushCommand(stack, cmd);
    }
    expect(stack.undoStack).toHaveLength(3);
  });
});

describe('shouldMerge', () => {
  it('merges consecutive moveCard on same card', () => {
    const cmd1: UndoCommand = {
      type: 'moveCard', timestamp: 1, params: { cardId: 'card1' },
    };
    const cmd2: UndoCommand = {
      type: 'moveCard', timestamp: 2, params: { cardId: 'card1' },
    };
    expect(shouldMerge(cmd1, cmd2)).toBe(true);
  });

  it('does not merge moveCard on different cards', () => {
    const cmd1: UndoCommand = {
      type: 'moveCard', timestamp: 1, params: { cardId: 'card1' },
    };
    const cmd2: UndoCommand = {
      type: 'moveCard', timestamp: 2, params: { cardId: 'card2' },
    };
    expect(shouldMerge(cmd1, cmd2)).toBe(false);
  });

  it('does not merge different command types', () => {
    const cmd1: UndoCommand = {
      type: 'moveCard', timestamp: 1, params: {},
    };
    const cmd2: UndoCommand = {
      type: 'addCard', timestamp: 2, params: {},
    };
    expect(shouldMerge(cmd1, cmd2)).toBe(false);
  });

  it('does not merge moveColumn with moveCard', () => {
    const cmd1: UndoCommand = {
      type: 'moveColumn', timestamp: 1, params: {},
    };
    const cmd2: UndoCommand = {
      type: 'moveCard', timestamp: 2, params: {},
    };
    expect(shouldMerge(cmd1, cmd2)).toBe(false);
  });

  it('handles empty params', () => {
    const cmd1: UndoCommand = {
      type: 'moveCard', timestamp: 1, params: {},
    };
    const cmd2: UndoCommand = {
      type: 'moveCard', timestamp: 2, params: {},
    };
    expect(shouldMerge(cmd1, cmd2)).toBe(true);
  });
});
