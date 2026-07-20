import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { KanbanActivityLog } from './kanban-activity-log.js';
import type { KanbanAction } from './kanban-activity-log.js';

afterEach(cleanup);

const sampleActions: KanbanAction[] = [
  {
    id: 'a1',
    type: 'cardMove',
    actor: { id: 'u1', name: '张三' },
    timestamp: new Date(Date.now() - 60000).toISOString(),
    detail: { cardId: 'Task 1', fromColumnId: 'col-todo', toColumnId: 'col-done' },
  },
  {
    id: 'a2',
    type: 'cardCreate',
    actor: { id: 'u2', name: '李四' },
    timestamp: new Date().toISOString(),
    detail: { toColumnId: 'col-todo' },
  },
  {
    id: 'a3',
    type: 'cardDelete',
    actor: { id: 'u1', name: '张三' },
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    detail: { cardId: 'Task 2', fromColumnId: 'col-progress' },
  },
];

describe('KanbanActivityLog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <KanbanActivityLog actions={sampleActions} open={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders activity log panel when open', () => {
    render(<KanbanActivityLog actions={sampleActions} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('活动日志')).toBeTruthy();
  });

  it('renders action descriptions', () => {
    render(<KanbanActivityLog actions={sampleActions} open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/李四/)).toBeTruthy();
    const descEls = screen.getAllByText(/张三/);
    expect(descEls.length).toBe(2);
  });

  it('shows empty state when no actions', () => {
    render(<KanbanActivityLog actions={[]} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('暂无活动记录')).toBeTruthy();
  });

  it('filters by column', () => {
    render(
      <KanbanActivityLog
        actions={sampleActions}
        open={true}
        onClose={vi.fn()}
        filterColumnId="col-todo"
      />,
    );
    expect(screen.getByText(/李四/)).toBeTruthy();
  });

  it('filters by action type', () => {
    render(
      <KanbanActivityLog
        actions={sampleActions}
        open={true}
        onClose={vi.fn()}
        filterType="cardMove"
      />,
    );
    expect(screen.getByText(/张三.*Task 1/)).toBeTruthy();
  });
});
