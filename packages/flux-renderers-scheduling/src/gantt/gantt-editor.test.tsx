import { describe, expect, it } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { GanttStore } from './gantt-store.js';
import { GanttStoreProvider } from './gantt-context.js';
import { GanttEditor } from './gantt-editor.js';
import type { GanttTaskData } from './gantt.types.js';

function createStore(tasks: GanttTaskData[]) {
  const store = new GanttStore({ cellWidth: 40 });
  store.parse(tasks, []);
  return store;
}

function renderWithStore(ui: React.ReactElement, store: GanttStore) {
  return render(<GanttStoreProvider store={store}>{ui}</GanttStoreProvider>);
}

describe('GanttEditor', () => {
  it('should render without crashing', () => {
    const store = createStore([
      { id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' },
    ]);
    const { container } = renderWithStore(<GanttEditor />, store);
    expect(container).toBeTruthy();
  });

  it('should update task text via store', () => {
    const store = createStore([
      { id: 't1', text: 'Original', start: '2026-01-01', end: '2026-01-10' },
    ]);
    store.updateTask('t1', { text: 'Updated' });
    expect(store.tasks.get('t1')!.text).toBe('Updated');
  });

  it('should update task start/end via store', () => {
    const store = createStore([
      { id: 't1', text: 'Task', start: '2026-01-01', end: '2026-01-10' },
    ]);
    store.updateTask('t1', { start: '2026-02-01', end: '2026-02-10' });
    const task = store.tasks.get('t1')!;
    expect(task.start).toBe('2026-02-01');
    expect(task.end).toBe('2026-02-10');
  });

  it('should revert to original on cancel', () => {
    const store = createStore([
      { id: 't1', text: 'Original', start: '2026-01-01', end: '2026-01-10' },
    ]);
    expect(store.tasks.get('t1')!.text).toBe('Original');
  });
});
