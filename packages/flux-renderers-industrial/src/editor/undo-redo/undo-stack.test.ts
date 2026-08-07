import { describe, it, expect } from 'vitest';
import { UndoStack, MAX_UNDO_STACK_DEPTH, type EditorOperationKind } from './undo-stack.js';
import type { ScadaConfigDiff } from '../../serialization/config-types.js';

function entry(kind: EditorOperationKind, timestamp = 0): import('./undo-stack.js').UndoStackEntry {
  const forward: ScadaConfigDiff = { added: [], removed: [], updated: [{ id: 'a', patch: { x: timestamp } }] };
  return { forward, inverse: { ...forward }, operationKind: kind, timestamp };
}

describe('UndoStack push / canUndo / canRedo / depth', () => {
  it('canUndo false on empty; true after push', () => {
    const stack = new UndoStack();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    stack.push(entry('add-symbol'));
    expect(stack.canUndo).toBe(true);
    expect(stack.undoStackDepth).toBe(1);
  });

  it('R4: stack entry holds only forward+inverse+operationKind+timestamp (no prevSnapshot field)', () => {
    const e = entry('add-symbol');
    expect(Object.keys(e).sort()).toEqual(['forward', 'inverse', 'operationKind', 'timestamp']);
    expect((e as unknown as Record<string, unknown>).prevSnapshot).toBeUndefined();
  });

  it('push truncates redo stack (U6: new op breaks redo chain)', () => {
    const stack = new UndoStack();
    stack.push(entry('add-symbol', 1));
    stack.popForUndo();
    expect(stack.canRedo).toBe(true);
    expect(stack.redoStackDepth).toBe(1);
    stack.push(entry('add-symbol', 2));
    expect(stack.canRedo).toBe(false);
    expect(stack.redoStackDepth).toBe(0);
  });
});

describe('UndoStack popForUndo / popForRedo (entry moves verbatim, no field swap)', () => {
  it('undo pops undoStack and pushes the SAME entry to redoStack (fields unchanged)', () => {
    const stack = new UndoStack();
    const e = entry('update-symbol', 42);
    stack.push(e);
    const popped = stack.popForUndo();
    expect(popped).toBe(e);
    expect(stack.undoStackDepth).toBe(0);
    expect(stack.redoStackDepth).toBe(1);
    // redo applies the SAME entry's forward field (not swapped)
    const redoEntry = stack.popForRedo();
    expect(redoEntry).toBe(e);
    expect(redoEntry!.forward).toBe(e.forward);
    expect(redoEntry!.inverse).toBe(e.inverse);
  });

  it('undo-of-redo / redo-of-undo symmetry (A→B→A→B cycle)', () => {
    const stack = new UndoStack();
    const e = entry('add-symbol', 1);
    stack.push(e);
    // undo: A→B back to A
    expect(stack.popForUndo()).toBe(e);
    expect(stack.undoStackDepth).toBe(0);
    expect(stack.redoStackDepth).toBe(1);
    // redo: A→B again
    expect(stack.popForRedo()).toBe(e);
    expect(stack.undoStackDepth).toBe(1);
    expect(stack.redoStackDepth).toBe(0);
    // undo again works
    expect(stack.popForUndo()).toBe(e);
    expect(stack.redoStackDepth).toBe(1);
  });

  it('popForUndo returns undefined on empty stack (boundary: no-undo)', () => {
    const stack = new UndoStack();
    expect(stack.popForUndo()).toBeUndefined();
  });

  it('popForRedo returns undefined on empty stack (boundary: no-redo)', () => {
    const stack = new UndoStack();
    expect(stack.popForRedo()).toBeUndefined();
  });
});

describe('UndoStack depth limit (U7: drop oldest when full)', () => {
  it('default max depth is 100', () => {
    expect(MAX_UNDO_STACK_DEPTH).toBe(100);
  });

  it('drops the oldest entry when exceeding maxDepth', () => {
    const stack = new UndoStack(3);
    stack.push(entry('add-symbol', 1));
    stack.push(entry('add-symbol', 2));
    stack.push(entry('add-symbol', 3));
    stack.push(entry('add-symbol', 4));
    expect(stack.undoStackDepth).toBe(3);
    // oldest (timestamp 1) dropped; top is timestamp 4
    expect(stack.topOperationKind).toBe('add-symbol');
    const top = stack.peekUndoTop();
    expect(top?.timestamp).toBe(4);
    // undo pops timestamp 4, then 3, then 2 (1 was dropped)
    expect(stack.popForUndo()!.timestamp).toBe(4);
    expect(stack.popForUndo()!.timestamp).toBe(3);
    expect(stack.popForUndo()!.timestamp).toBe(2);
    expect(stack.popForUndo()).toBeUndefined();
  });
});

describe('UndoStack clear (load 句柄消费)', () => {
  it('clears both stacks', () => {
    const stack = new UndoStack();
    stack.push(entry('add-symbol'));
    stack.popForUndo();
    stack.clear();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.undoStackDepth).toBe(0);
    expect(stack.redoStackDepth).toBe(0);
  });
});

describe('UndoStack replaceUndoTop (coalesce merge)', () => {
  it('replaces the top entry in place', () => {
    const stack = new UndoStack();
    stack.push(entry('update-symbol', 1));
    const merged = entry('property-edit', 2);
    stack.replaceUndoTop(merged);
    expect(stack.peekUndoTop()).toBe(merged);
    expect(stack.undoStackDepth).toBe(1);
  });

  it('pushes when stack empty', () => {
    const stack = new UndoStack();
    const merged = entry('property-edit', 2);
    stack.replaceUndoTop(merged);
    expect(stack.peekUndoTop()).toBe(merged);
  });
});
