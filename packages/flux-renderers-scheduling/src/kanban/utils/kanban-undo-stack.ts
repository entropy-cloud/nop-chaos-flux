/**
 * Kanban uses a command-based undo pattern:
 * Each mutation records the operation type and parameters, and undo/redo
 * apply reverse/forward transformations using the existing kanban helpers.
 * This avoids full BoardData structuredClone snapshots, making undo/redo
 * O(1) memory per operation instead of O(board size).
 * Gantt uses a similar command-based pattern (see gantt/undo-stack.ts).
 */
import type { BoardData } from '../kanban.types.js';
import { moveCard, moveColumn, addCard, removeCard } from '../kanban-helpers.js';

export type UndoCommandType =
  | 'moveCard'
  | 'moveColumn'
  | 'addCard'
  | 'removeCard';

export interface UndoCommand {
  type: UndoCommandType;
  timestamp: number;
  params: Record<string, any>;
}

export interface UndoStack {
  undoStack: UndoCommand[];
  redoStack: UndoCommand[];
  maxSize: number;
}

export function createUndoStack(maxSize = 1000): UndoStack {
  return { undoStack: [], redoStack: [], maxSize };
}

export function pushCommand(stack: UndoStack, command: UndoCommand): UndoStack {
  const last = stack.undoStack[stack.undoStack.length - 1];
  if (last && shouldMerge(last, command)) {
    return stack;
  }
  const newUndo = [...stack.undoStack, command];
  if (newUndo.length > stack.maxSize) {
    newUndo.shift();
  }
  return { ...stack, undoStack: newUndo, redoStack: [] };
}

export function undo(stack: UndoStack, currentBoard: BoardData): { board: BoardData; stack: UndoStack } | null {
  if (stack.undoStack.length === 0) {
    console.warn('[kanban-undo] No undo commands available');
    return null;
  }
  const command = stack.undoStack[stack.undoStack.length - 1];
  const newUndo = stack.undoStack.slice(0, -1);
  const newRedo = [...stack.redoStack, command];
  let board: BoardData;
  switch (command.type) {
    case 'moveCard': {
      const { cardId, fromColumnId, fromIndex } = command.params;
      board = moveCard(currentBoard, cardId, fromColumnId, fromIndex);
      break;
    }
    case 'moveColumn': {
      const { columnId, fromIndex } = command.params;
      board = moveColumn(currentBoard, columnId, fromIndex);
      break;
    }
    case 'addCard': {
      const { cardId } = command.params;
      board = removeCard(currentBoard, cardId);
      break;
    }
    case 'removeCard': {
      const { cardData } = command.params;
      board = addCard(currentBoard, command.params.columnId, cardData, command.params.index);
      break;
    }
    default:
      return null;
  }
  return { board, stack: { ...stack, undoStack: newUndo, redoStack: newRedo } };
}

export function redo(stack: UndoStack, currentBoard: BoardData): { board: BoardData; stack: UndoStack } | null {
  if (stack.redoStack.length === 0) {
    console.warn('[kanban-undo] No redo commands available');
    return null;
  }
  const command = stack.redoStack[stack.redoStack.length - 1];
  const newRedo = stack.redoStack.slice(0, -1);
  const newUndo = [...stack.undoStack, command];
  let board: BoardData;
  switch (command.type) {
    case 'moveCard': {
      const { cardId, toColumnId, toIndex } = command.params;
      board = moveCard(currentBoard, cardId, toColumnId, toIndex);
      break;
    }
    case 'moveColumn': {
      const { columnId, toIndex } = command.params;
      board = moveColumn(currentBoard, columnId, toIndex);
      break;
    }
    case 'addCard': {
      const { columnId, cardData, index } = command.params;
      board = addCard(currentBoard, columnId, cardData, index);
      break;
    }
    case 'removeCard': {
      const { cardId } = command.params;
      board = removeCard(currentBoard, cardId);
      break;
    }
    default:
      return null;
  }
  return { board, stack: { ...stack, undoStack: newUndo, redoStack: newRedo } };
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
    return prevCommand.params.cardId === newCommand.params.cardId;
  }
  return false;
}
