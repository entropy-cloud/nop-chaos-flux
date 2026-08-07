import { describe, it, expect, vi } from 'vitest';
import { createUndoStack, pushCommand, undo, redo, canUndo, canRedo, shouldMerge } from './kanban-undo-stack.js';
import { removeCard } from '../kanban-helpers.js';
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

  it('warns on undo when no commands exist', () => {
    const board = createSampleBoard();
    const stack = createUndoStack();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(undo(stack, board)).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('[kanban-undo] No undo commands available');
    warnSpy.mockRestore();
  });

  it('warns on redo when no commands exist', () => {
    const board = createSampleBoard();
    const stack = createUndoStack();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(redo(stack, board)).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('[kanban-undo] No redo commands available');
    warnSpy.mockRestore();
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

describe('C9 P1-3: addColumn undo/redo', () => {
  const columnData = {
    id: 'col3',
    type: 'column' as const,
    parentId: 'root',
    children: [],
    data: { title: 'New Col' },
    meta: {},
  };

  it('undo removes the added column instead of moving it to the front', () => {
    const board = createSampleBoard();
    const withColumn = addColumnToBoard(board);
    const stack = pushCommand(createUndoStack(), {
      type: 'addColumn',
      timestamp: Date.now(),
      params: { columnId: 'col3', columnData, index: 2 },
    });

    const result = undo(stack, withColumn);
    expect(result).not.toBeNull();
    expect(result!.board.root.children).toEqual(['col1', 'col2']);
    expect(result!.board.col3).toBeUndefined();
  });

  it('redo re-adds the column at the recorded index', () => {
    const board = createSampleBoard();
    const withColumn = addColumnToBoard(board);
    const stack = pushCommand(createUndoStack(), {
      type: 'addColumn',
      timestamp: Date.now(),
      params: { columnId: 'col3', columnData, index: 2 },
    });
    const undone = undo(stack, withColumn);
    const redone = redo(undone!.stack, undone!.board);
    expect(redone).not.toBeNull();
    expect(redone!.board.root.children).toEqual(['col1', 'col2', 'col3']);
    expect(redone!.board.col3).toBeDefined();
  });

  function addColumnToBoard(board: BoardData): BoardData {
    return {
      ...board,
      root: { ...board.root, children: [...board.root.children, 'col3'] },
      col3: columnData,
    };
  }
});

describe('C9 P1: removeCard undo restores full card including meta (1-5)', () => {
  it('undo replays the captured meta alongside card data', () => {
    const board = createSampleBoard();
    board.card1.meta = {
      color: '#ff0000',
      tags: [{ id: 't1', text: 'urgent', color: '#ff0000' }],
      members: [{ id: 'm1', name: 'Alice', color: '#00ff00' }],
    };
    const stack = pushCommand(createUndoStack(), {
      type: 'removeCard',
      timestamp: Date.now(),
      params: {
        cardId: 'card1',
        columnId: 'col1',
        index: 0,
        cardData: { ...board.card1.data },
        cardMeta: { ...board.card1.meta },
      },
    });
    const afterRemove = removeCard(board, 'card1');
    expect(afterRemove.card1).toBeUndefined();

    const result = undo(stack, afterRemove);
    expect(result).not.toBeNull();
    const restored = result!.board.card1;
    expect(restored).toBeDefined();
    // addCard 语义：data 承载完整 cardData（含注入的 id，与正常新增路径一致）
    expect(restored!.data).toEqual({ id: 'card1', title: 'Task 1' });
    expect(restored!.meta).toEqual({
      color: '#ff0000',
      tags: [{ id: 't1', text: 'urgent', color: '#ff0000' }],
      members: [{ id: 'm1', name: 'Alice', color: '#00ff00' }],
    });
    expect(result!.board.col1.children[0]).toBe('card1');
  });

  it('redo re-applies the removal after the undo', () => {
    const board = createSampleBoard();
    board.card1.meta = { color: '#ff0000' };
    const stack = pushCommand(createUndoStack(), {
      type: 'removeCard',
      timestamp: Date.now(),
      params: { cardId: 'card1', columnId: 'col1', index: 0, cardData: { title: 'Task 1' }, cardMeta: { color: '#ff0000' } },
    });
    const afterRemove = removeCard(board, 'card1');
    const undone = undo(stack, afterRemove)!;
    const redone = redo(undone.stack, undone.board);
    expect(redone).not.toBeNull();
    expect(redone!.board.card1).toBeUndefined();
    expect(redone!.board.col1.children).toEqual(['card2']);
  });
});
