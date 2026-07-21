import { describe, it, expect, beforeEach } from 'vitest';
import { GanttStore } from './gantt-store.js';
import { UndoStack, UpdateTaskCommand, AddLinkCommand, RemoveLinkCommand, BatchUpdateTaskCommand } from './undo-stack.js';

function createTestStore(): GanttStore {
  const store = new GanttStore({ cellWidth: 40 });
  store.parse(
    [
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-03' },
      { id: 't2', text: 'Task 2', start: '2026-01-05', end: '2026-01-08' },
    ],
    [],
  );
  return store;
}

describe('UndoStack', () => {
  let store: GanttStore;
  let stack: UndoStack;

  beforeEach(() => {
    store = createTestStore();
    stack = new UndoStack(50);
  });

  it('starts empty with no undo/redo', () => {
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
  });

  it('undo on empty stack is no-op', () => {
    stack.undo();
    expect(stack.canUndo).toBe(false);
  });

  it('redo on empty stack is no-op', () => {
    stack.redo();
    expect(stack.canRedo).toBe(false);
  });

  it('records and undoes a single task update', () => {
    const task = store.tasks.get('t1')!;
    const before = { text: task.text };
    const after = { text: 'Updated' };

    stack.push(new UpdateTaskCommand(store, 't1', before, after));
    expect(stack.canUndo).toBe(true);

    stack.undo();
    expect(store.tasks.get('t1')!.text).toBe('Task 1');
    expect(stack.canRedo).toBe(true);
  });

  it('redoes an undone operation', () => {
    const task = store.tasks.get('t1')!;
    const before = { text: task.text };
    const after = { text: 'Updated' };

    stack.push(new UpdateTaskCommand(store, 't1', before, after));
    stack.undo();
    stack.redo();
    expect(store.tasks.get('t1')!.text).toBe('Updated');
  });

  it('merges consecutive updates to the same task', () => {
    const before1 = { start: '2026-01-01', end: '2026-01-03' };
    const after1 = { start: '2026-01-02', end: '2026-01-04' };
    const after2 = { start: '2026-01-03', end: '2026-01-05' };

    stack.push(new UpdateTaskCommand(store, 't1', before1, after1));
    stack.push(new UpdateTaskCommand(store, 't1', before1, after2));
    expect(stack['commands'].length).toBe(1);

    stack.undo();
    const t = store.tasks.get('t1')!;
    expect(t.start).toBe('2026-01-01');
    expect(t.end).toBe('2026-01-03');
  });

  it('does not merge updates to different tasks', () => {
    const before1 = { text: 'Task 1' };
    const after1 = { text: 'Updated 1' };
    const before2 = { text: 'Task 2' };
    const after2 = { text: 'Updated 2' };

    stack.push(new UpdateTaskCommand(store, 't1', before1, after1));
    stack.push(new UpdateTaskCommand(store, 't2', before2, after2));
    expect(stack['commands'].length).toBe(2);
  });

  it('records and undoes link add/remove', () => {
    const addCmd = new AddLinkCommand(store, 't1', 't2', 'finish_to_start');
    stack.push(addCmd);
    addCmd.execute();
    expect(store.links.size).toBe(1);

    stack.undo();
    expect(store.links.size).toBe(0);

    stack.redo();
    expect(store.links.size).toBe(1);
  });

  it('records and undoes link removal', () => {
    const addCmd = new AddLinkCommand(store, 't1', 't2', 'finish_to_start');
    addCmd.execute();

    const linkId = Array.from(store.links.keys())[0];
    const removeCmd = new RemoveLinkCommand(store, linkId);
    removeCmd.execute();
    expect(store.links.size).toBe(0);

    removeCmd.undo();
    expect(store.links.size).toBe(1);

    removeCmd.redo();
    expect(store.links.size).toBe(0);
  });

  it('clears redo stack after new push', () => {
    const before = { text: store.tasks.get('t1')!.text };
    const after = { text: 'V1' };
    stack.push(new UpdateTaskCommand(store, 't1', before, after));
    stack.undo();
    expect(stack.canRedo).toBe(true);

    const after2 = { text: 'V2' };
    stack.push(new UpdateTaskCommand(store, 't1', before, after2));
    expect(stack.canRedo).toBe(false);
  });

  it('respects limit of 3', () => {
    const limitStack = new UndoStack(3);
    limitStack.push(new UpdateTaskCommand(store, 't1', { text: 'a' }, { text: 'b' }));
    limitStack.push(new UpdateTaskCommand(store, 't2', { text: 'c' }, { text: 'd' }));
    limitStack.push(new UpdateTaskCommand(store, 't1', { text: 'e' }, { text: 'f' }));
    limitStack.push(new UpdateTaskCommand(store, 't2', { text: 'g' }, { text: 'h' }));
    limitStack.push(new UpdateTaskCommand(store, 't1', { text: 'i' }, { text: 'j' }));
    expect(limitStack['commands'].length).toBe(3);
  });

  it('batch update command undoes all', () => {
    const cmd1 = new UpdateTaskCommand(store, 't1', { text: store.tasks.get('t1')!.text }, { text: 'B1' });
    const cmd2 = new UpdateTaskCommand(store, 't2', { text: store.tasks.get('t2')!.text }, { text: 'B2' });
    const batch = new BatchUpdateTaskCommand([cmd1, cmd2]);
    batch.execute();
    expect(store.tasks.get('t1')!.text).toBe('B1');
    expect(store.tasks.get('t2')!.text).toBe('B2');

    batch.undo();
    expect(store.tasks.get('t1')!.text).toBe('Task 1');
    expect(store.tasks.get('t2')!.text).toBe('Task 2');
  });

  it('can undo multiple steps', () => {
    const t1before = { text: store.tasks.get('t1')!.text };
    stack.push(new UpdateTaskCommand(store, 't1', t1before, { text: 'Step1' }));
    stack.push(new UpdateTaskCommand(store, 't2', { text: store.tasks.get('t2')!.text }, { text: 'Step2' }));
    expect(stack.canUndo).toBe(true);

    stack.undo();
    expect(store.tasks.get('t2')!.text).toBe('Task 2');
    expect(stack.canUndo).toBe(true);

    stack.undo();
    expect(store.tasks.get('t1')!.text).toBe('Task 1');
    expect(stack.canUndo).toBe(false);
  });

  it('undo -> redo -> undo link identity - F-39', () => {
    const addCmd = new AddLinkCommand(store, 't1', 't2', 'finish_to_start');
    addCmd.execute();
    const firstLinkId = addCmd['linkId'];
    expect(store.links.size).toBe(1);
    expect(firstLinkId).not.toBeNull();

    stack.push(addCmd);

    stack.undo();
    expect(store.links.size).toBe(0);

    stack.redo();
    expect(store.links.size).toBe(1);
    const redoLinkId = addCmd['linkId'];
    expect(redoLinkId).not.toBeNull();
    expect(store.links.has(redoLinkId!)).toBe(true);

    const linkAfterRedo = Array.from(store.links.values())[0];
    expect(linkAfterRedo.id).toBe(redoLinkId);

    stack.undo();
    expect(store.links.size).toBe(0);
    expect(store.links.has(redoLinkId!)).toBe(false);
  });

  it('UpdateTaskCommand uses typed Partial<GanttTaskData> - F-40', () => {
    const task = store.tasks.get('t1')!;
    const before: Partial<import('./gantt.types.js').GanttTaskData> = { text: task.text, start: task.start, end: task.end };
    const after: Partial<import('./gantt.types.js').GanttTaskData> = { text: 'Typed Update', start: '2026-02-01', end: '2026-02-05' };

    const cmd = new UpdateTaskCommand(store, 't1', before, after);
    cmd.execute();

    expect(store.tasks.get('t1')!.text).toBe('Typed Update');
    expect(store.tasks.get('t1')!.start).toBe('2026-02-01');

    cmd.undo();
    expect(store.tasks.get('t1')!.text).toBe('Task 1');
    expect(store.tasks.get('t1')!.start).toBe('2026-01-01');

    cmd.redo();
    expect(store.tasks.get('t1')!.text).toBe('Typed Update');
    expect(store.tasks.get('t1')!.start).toBe('2026-02-01');
  });
});
