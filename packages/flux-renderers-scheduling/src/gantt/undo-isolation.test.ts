import { describe, it, expect, beforeEach } from 'vitest';
import { GanttStore } from './gantt-store.js';
import { UndoStack, UpdateTaskCommand } from './undo-stack.js';

describe('UndoStack isolation across schema refreshes', () => {
  let store: GanttStore;
  let stack: UndoStack;

  beforeEach(() => {
    store = new GanttStore({ cellWidth: 40 });
    store.parse([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-03' },
      { id: 't2', text: 'Task 2', start: '2026-01-05', end: '2026-01-08' },
    ], []);
    stack = new UndoStack(50);
  });

  it('commands survive store re-parse (schema refresh)', () => {
    const before = { text: store.tasks.get('t1')!.text };
    const after = { text: 'Updated before parse' };
    stack.push(new UpdateTaskCommand(store, 't1', before, after));

    store.parse([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-03' },
      { id: 't3', text: 'Task 3', start: '2026-02-01', end: '2026-02-03' },
    ], []);
    // Undo stack still holds the command targeting the same store
    expect(stack.canUndo).toBe(true);
  });

  it('clear isolates undo stack from prior state', () => {
    const before = { text: store.tasks.get('t1')!.text };
    stack.push(new UpdateTaskCommand(store, 't1', before, { text: 'V1' }));
    expect(stack.canUndo).toBe(true);

    stack.clear();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);

    stack.undo();
    expect(store.tasks.get('t1')!.text).toBe('Task 1');
  });

  it('undo works correctly after store re-parse (task identity preserved)', () => {
    store.parse([
      { id: 't1', text: 'Original', start: '2026-01-01', end: '2026-01-03' },
    ], []);

    const before = { text: 'Original' };
    const after = { text: 'After parse edit' };
    stack.push(new UpdateTaskCommand(store, 't1', before, after));

    expect(store.tasks.get('t1')!.text).toBe('Original');

    stack.undo();
    expect(store.tasks.get('t1')!.text).toBe('Original');

    stack.redo();
    expect(store.tasks.get('t1')!.text).toBe('After parse edit');
  });
});
