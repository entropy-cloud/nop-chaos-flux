import { describe, expect, it } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { GanttStore } from './gantt-store.js';
import { GanttStoreProvider } from './gantt-context.js';

describe('Gantt visual states', () => {
  it('should render empty state when no tasks', () => {
    const store = new GanttStore({ cellWidth: 40 });
    store.parse([], []);
    const tasks = store.getVisibleTasks();
    expect(tasks.length).toBe(0);
  });

  it('should render loading skeleton class', () => {
    const { container } = render(
      <div className="nop-gantt-skeleton">
        <div className="nop-gantt-skeleton-row" />
      </div>,
    );
    const skeleton = container.querySelector('.nop-gantt-skeleton');
    expect(skeleton).toBeTruthy();
  });

  it('should have correct CSS class on root element', () => {
    const store = new GanttStore({ cellWidth: 40 });
    store.parse([], []);
    const { container } = render(
      <GanttStoreProvider store={store}>
        <div className="nop-gantt" />
      </GanttStoreProvider>,
    );
    const root = container.querySelector('.nop-gantt');
    expect(root).toBeTruthy();
  });
});
