import type { BoardData } from '../kanban.types.js';

export type UndoCommandType =
  | 'moveCard'
  | 'moveColumn'
  | 'addCard'
  | 'removeCard'
  | 'changeCard'
  | 'addColumn'
  | 'removeColumn';

export interface UndoCommand {
  type: UndoCommandType;
  timestamp: number;
  boardSnapshot: BoardData;
  metadata: {
    cardId?: string;
    columnId?: string;
    targetColumnId?: string;
    targetIndex?: number;
    fromIndex?: number;
  };
}

export interface UndoStack {
  undoStack: UndoCommand[];
  redoStack: UndoCommand[];
  maxSize: number;
}

// FIXME: Inconsistent undo pattern — Kanban uses snapshot-based undo (this file)
// while Gantt (undo-stack.ts) uses command-based undo.
// These should be unified in a future refactor. The snapshot approach was chosen
// for Kanban because board state is a single JSON blob that's easy to clone.
// See gantt/undo-stack.ts for the alternative command pattern.
export function createUndoStack(maxSize = 1000): UndoStack {
  return { undoStack: [], redoStack: [], maxSize };
}

export function pushCommand(stack: UndoStack, command: UndoCommand): UndoStack {
  const newUndo = [...stack.undoStack, command];
  if (newUndo.length > stack.maxSize) {
    newUndo.shift();
  }
  return { ...stack, undoStack: newUndo, redoStack: [] };
}

export function undo(stack: UndoStack): { board: BoardData; stack: UndoStack } | null {
  if (stack.undoStack.length === 0) return null;
  const command = stack.undoStack[stack.undoStack.length - 1];
  const newUndo = stack.undoStack.slice(0, -1);
  const newRedo = [...stack.redoStack, command];
  return {
    board: deepCloneBoard(command.boardSnapshot),
    stack: { ...stack, undoStack: newUndo, redoStack: newRedo },
  };
}

export function redo(stack: UndoStack): { board: BoardData; stack: UndoStack } | null {
  if (stack.redoStack.length === 0) return null;
  const command = stack.redoStack[stack.redoStack.length - 1];
  const newRedo = stack.redoStack.slice(0, -1);
  const newUndo = [...stack.undoStack, command];
  return {
    board: deepCloneBoard(command.boardSnapshot),
    stack: { ...stack, undoStack: newUndo, redoStack: newRedo },
  };
}

export function canUndo(stack: UndoStack): boolean {
  return stack.undoStack.length > 0;
}

export function canRedo(stack: UndoStack): boolean {
  return stack.redoStack.length > 0;
}

export function shouldMerge(prevCommand: UndoCommand, newCommand: UndoCommand): boolean {
  if (prevCommand.type !== newCommand.type) return false;
  if (prevCommand.type === 'moveCard' && newCommand.type === 'moveCard') {
    return prevCommand.metadata.cardId === newCommand.metadata.cardId;
  }
  return false;
}

function deepCloneBoard(board: BoardData): BoardData {
  const cloned: BoardData = {};
  for (const key of Object.keys(board)) {
    const item = board[key];
    cloned[key] = { ...item, children: [...item.children], data: { ...item.data }, meta: { ...item.meta } };
  }
  return cloned;
}

export type { BoardData };
