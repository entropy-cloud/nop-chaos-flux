import { describe, expect, it, vi, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { GanttStore } from './gantt-store.js';
import { GanttEditor } from './gantt-editor.js';
import { UndoStack } from './undo-stack.js';
import type { GanttTaskData } from './gantt.types.js';

afterEach(cleanup);

function createStore(tasks: GanttTaskData[]) {
  const store = new GanttStore({ cellWidth: 40 });
  store.parse(tasks, []);
  return store;
}

describe('GanttEditor', () => {
  it('should render without crashing', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
    ]);
    const { container } = render(<GanttEditor store={store} />);
    expect(container).toBeTruthy();
  });

  it('should not render dialog when no editingTaskId', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
    ]);
    render(<GanttEditor store={store} />);
    expect(document.querySelector('input[id$="-edit-text"]')).toBeNull();
  });

  it('should render input fields for task editing via portal', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
    ]);
    store.editTask('t1');
    render(<GanttEditor store={store} editingTaskId="t1" />);
    const textInput = document.querySelector<HTMLInputElement>('input[id$="-edit-text"]');
    expect(textInput).toBeTruthy();
    expect(textInput!.value).toBe('Task 1');
  });

  it('should use unique IDs per instance for cross-instance safety', () => {
    const storeA = createStore([
      { id: 't1', text: 'Task A', start: '2026-01-01', end: '2026-01-10' },
    ]);
    const storeB = createStore([
      { id: 't1', text: 'Task B', start: '2026-01-05', end: '2026-01-15' },
    ]);

    const { unmount } = render(
      <div>
        <GanttEditor store={storeA} editingTaskId="t1" />
        <GanttEditor store={storeB} editingTaskId="t1" />
      </div>,
    );

    const textInputs = document.querySelectorAll('[id$="-edit-text"]');
    expect(textInputs.length).toBeGreaterThanOrEqual(2);
    if (textInputs.length >= 2) {
      expect(textInputs[0].id).not.toBe(textInputs[1].id);
    }

    unmount();
  });
});

describe('GanttEditor CR P2-1 (custom editor region onSave persistence)', () => {
  it('onSave persists the edited task to the store and closes the editor', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
    ]);
    store.editTask('t1');
    let capturedOnSave: ((next?: unknown) => void) | null = null;
    render(
      <GanttEditor
        store={store}
        editingTaskId="t1"
        editorRegion={
          {
            render: ({ bindings }: { bindings: { task: unknown; onSave: (next?: unknown) => void } }) => {
              capturedOnSave = bindings.onSave;
              return <div data-testid="custom-editor">custom</div>;
            },
          } as any
        }
      />,
    );
    expect(capturedOnSave).not.toBeNull();
    capturedOnSave!({ text: 'Renamed', start: '2026-02-01', end: '2026-02-05' });
    const updated = store.tasks.get('t1')!;
    expect(updated.text).toBe('Renamed');
    expect(updated.start).toBe('2026-02-01');
    expect(updated.end).toBe('2026-02-05');
  });

  it('onSave without a payload keeps the close-only contract (no crash, no mutation)', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
    ]);
    store.editTask('t1');
    let capturedOnSave: ((next?: unknown) => void) | null = null;
    render(
      <GanttEditor
        store={store}
        editingTaskId="t1"
        editorRegion={
          {
            render: ({ bindings }: { bindings: { onSave: (next?: unknown) => void } }) => {
              capturedOnSave = bindings.onSave;
              return <div>custom</div>;
            },
          } as any
        }
      />,
    );
    expect(() => capturedOnSave!()).not.toThrow();
    expect(store.tasks.get('t1')!.text).toBe('Task 1');
  });

  it('editor save records an undo command (undo restores the previous task data)', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
    ]);
    store.editTask('t1');
    const stack = new UndoStack();
    render(
      <GanttEditor
        store={store}
        editingTaskId="t1"
        undoStack={stack}
        editorRegion={
          {
            render: ({ bindings }: { bindings: { onSave: (next?: unknown) => void } }) => {
              bindings.onSave({ text: 'Renamed' });
              return <div>custom</div>;
            },
          } as any
        }
      />,
    );
    expect(store.tasks.get('t1')!.text).toBe('Renamed');
    stack.undo();
    expect(store.tasks.get('t1')!.text).toBe('Task 1');
  });
});

describe('GanttEditor 22-07 (onCommit edit-change callback)', () => {
  it('invokes onCommit with the edited task fields on save (host dispatches onTaskEdit)', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
    ]);
    store.editTask('t1');
    const onCommit = vi.fn();
    render(
      <GanttEditor
        store={store}
        editingTaskId="t1"
        {...({ onCommit } as any)}
      />,
    );
    const textInput = document.querySelector<HTMLInputElement>('input[id$="-edit-text"]');
    expect(textInput).toBeTruthy();
    fireEvent.change(textInput!, { target: { value: 'Renamed' } });
    const saveButton = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('保存') || b.textContent?.includes('Save'),
    );
    expect(saveButton).toBeTruthy();
    fireEvent.click(saveButton!);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0][0]).toBe('t1');
    expect(onCommit.mock.calls[0][1]).toEqual(expect.objectContaining({ text: 'Renamed' }));
  });

  it('invokes onCommit when the custom editor region onSave commits (host dispatches onTaskEdit)', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
    ]);
    store.editTask('t1');
    const onCommit = vi.fn();
    let capturedOnSave: ((next?: unknown) => void) | null = null;
    render(
      <GanttEditor
        store={store}
        editingTaskId="t1"
        {...({ onCommit } as any)}
        editorRegion={
          {
            render: ({ bindings }: { bindings: { onSave: (next?: unknown) => void } }) => {
              capturedOnSave = bindings.onSave;
              return <div>custom</div>;
            },
          } as any
        }
      />,
    );
    capturedOnSave!({ text: 'Region Renamed' });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0][1]).toEqual(expect.objectContaining({ text: 'Region Renamed' }));
  });
});
