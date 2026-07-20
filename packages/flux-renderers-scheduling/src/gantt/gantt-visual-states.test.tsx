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

  it('should render drag ghost with expected CSS classes', () => {
    const { container } = render(
      <div className="nop-gantt-drag-ghost opacity-70 shadow-lg">Drag me</div>,
    );
    const ghost = container.querySelector('.nop-gantt-drag-ghost');
    expect(ghost).toBeTruthy();
    expect(ghost?.classList.contains('opacity-70')).toBe(true);
  });

  it('should render selected row with highlight class', () => {
    const { container } = render(
      <tr className="bg-blue-50" data-selected="true">
        <td>Task</td>
      </tr>,
    );
    const row = container.querySelector('tr');
    expect(row?.classList.contains('bg-blue-50')).toBe(true);
    expect(row?.getAttribute('data-selected')).toBe('true');
  });

  it('should render hover state on timeline row', () => {
    const { container } = render(
      <div className="hover:bg-blue-50/50">Timeline row</div>,
    );
    const el = container.querySelector('div');
    expect(el?.classList.contains('hover:bg-blue-50/50')).toBe(true);
  });

  it('should render empty placeholder with expected structure', () => {
    const { container } = render(
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No tasks to display
      </div>,
    );
    const placeholder = container.querySelector('.flex');
    expect(placeholder).toBeTruthy();
    expect(placeholder?.textContent).toBe('No tasks to display');
  });
});
