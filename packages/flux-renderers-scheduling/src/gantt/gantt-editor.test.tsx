import { describe, expect, it } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { GanttStore } from './gantt-store.js';
import { GanttEditor } from './gantt-editor.js';
import type { GanttTaskData } from './gantt.types.js';

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
