import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { KanbanActivityLog } from './kanban-activity-log.js';
import { changeLanguage, getCurrentLanguage } from '@nop-chaos/flux-i18n';
import type { KanbanAction } from './kanban-activity-log.js';

/**
 * V12f Phase 3 — [G4-R4-视角11-02] 活动日志列名映射：board 内真实列名可得，
 * 组件通过可选 columnNames prop 接收并优先消费；缺失时保留 id 兜底（向后
 * 兼容）。修复前 columnNames 恒等映射（id→id），日志永远渲染原始列 ID。
 */
let prevLang: string;

beforeEach(() => {
  prevLang = getCurrentLanguage();
});

afterEach(() => {
  cleanup();
  void changeLanguage(prevLang as any);
});

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
];

describe('KanbanActivityLog — real column names (G4-R4-视角11-02)', () => {
  it('renders real column titles from the columnNames prop instead of raw column ids', () => {
    render(
      <KanbanActivityLog
        actions={sampleActions}
        open={true}
        onClose={vi.fn()}
        columnNames={{ 'col-todo': '待办', 'col-done': '已完成' }}
      />,
    );

    expect(screen.getAllByText(/待办/).length).toBeGreaterThan(0);
    expect(screen.getByText(/已完成/)).toBeTruthy();
    expect(screen.queryByText(/col-todo/)).toBeNull();
    expect(screen.queryByText(/col-done/)).toBeNull();
  });

  it('falls back to raw ids when no columnNames prop is given (back-compat)', () => {
    render(<KanbanActivityLog actions={sampleActions} open={true} onClose={vi.fn()} />);

    expect(screen.getAllByText(/col-todo/).length).toBeGreaterThan(0);
  });
});
