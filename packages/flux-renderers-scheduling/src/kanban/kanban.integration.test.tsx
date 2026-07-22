import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { KanbanBoard } from './kanban-board.js';
import type { BoardData } from './kanban.types.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
}));

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      'scheduling.kanban.expandColumn': 'Expand column',
      'scheduling.kanban.collapseColumn': 'Collapse column',
      'scheduling.kanban.filterLabel': '标签:',
      'scheduling.kanban.clearFilter': '清除',
      'scheduling.kanban.searchCards': '搜索卡片...',
      'scheduling.kanban.addColumn': '+ 添加列',
      'scheduling.kanban.dragColumnLabel': 'Drag to reorder column {{title}}',
      'scheduling.kanban.currentUser': '当前用户',
      'scheduling.kanban.undo': '撤销 (Ctrl+Z)',
      'scheduling.kanban.redo': '重做 (Ctrl+Shift+Z)',
      'scheduling.kanban.activityLog': '活动日志',
      'scheduling.kanban.dragCardHere': '拖拽卡片到此处',
      'scheduling.kanban.addCard': '+ 添加卡片',
      'flux.common.noData': '暂无数据',
      'flux.common.cancel': '取消',
      'flux.common.confirm': '确认',
    };
    if (params && map[key]) {
      return Object.entries(params).reduce((s, [k, v]) => s.replace(`{{${k}}}`, String(v)), map[key]!);
    }
    return map[key] ?? key;
  },
}));

vi.mock('./hooks/use-kanban-virtualizer.js', () => ({
  useKanbanVirtualizer: (options: any) => ({
    virtualizer: { scrollToIndex: vi.fn() },
    totalSize: options.cardCount * 88,
    virtualItems: Array.from({ length: options.cardCount }, (_, i) => ({
      index: i,
      start: i * 88,
      size: 88,
      key: String(i),
    })),
  }),
}));

afterEach(cleanup);

const threeColumnBoard: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1', 'col2', 'col3'], data: {}, meta: {} },
  col1: {
    id: 'col1', type: 'column', parentId: 'root',
    children: ['card1', 'card2', 'card3'],
    data: { title: 'Backlog' }, meta: {},
  },
  col2: {
    id: 'col2', type: 'column', parentId: 'root',
    children: ['card4', 'card5'],
    data: { title: 'In Progress' }, meta: {},
  },
  col3: {
    id: 'col3', type: 'column', parentId: 'root',
    children: ['card6'],
    data: { title: 'Done' }, meta: {},
  },
  card1: { id: 'card1', type: 'card', parentId: 'col1', children: [], data: { title: 'Task A' }, meta: {} },
  card2: { id: 'card2', type: 'card', parentId: 'col1', children: [], data: { title: 'Task B' }, meta: { priority: 'high' } },
  card3: { id: 'card3', type: 'card', parentId: 'col1', children: [], data: { title: 'Task C' }, meta: { assignee: 'Alice' } },
  card4: { id: 'card4', type: 'card', parentId: 'col2', children: [], data: { title: 'Task D' }, meta: {} },
  card5: { id: 'card5', type: 'card', parentId: 'col2', children: [], data: { title: 'Task E' }, meta: { color: '#ff0000' } },
  card6: { id: 'card6', type: 'card', parentId: 'col3', children: [], data: { title: 'Task F' }, meta: {} },
};

const defaultProps = {
  id: 'test-kanban-integration',
  path: 'test' as any,
  schema: { type: 'kanban' as const },
  templateNode: {} as any,
  node: {} as any,
  props: { data: threeColumnBoard } as any,
  meta: { visible: true, disabled: false } as any,
  regions: {} as any,
  events: {} as any,
  reactions: {} as any,
  helpers: {} as any,
};

describe('Kanban Integration', () => {
  it('renders three columns with correct headers', () => {
    const { container } = render(React.createElement(KanbanBoard, defaultProps));
    expect(screen.getByText('Backlog')).toBeTruthy();
    expect(screen.getByText('In Progress')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
    const columns = container.querySelectorAll('[data-slot="kanban-column"]');
    expect(columns.length).toBe(3);
  });

  it('renders cards with correct titles', () => {
    render(React.createElement(KanbanBoard, defaultProps));
    expect(screen.getByText('Task A')).toBeTruthy();
    expect(screen.getByText('Task B')).toBeTruthy();
    expect(screen.getByText('Task C')).toBeTruthy();
    expect(screen.getByText('Task D')).toBeTruthy();
    expect(screen.getByText('Task E')).toBeTruthy();
    expect(screen.getByText('Task F')).toBeTruthy();
  });

  it('renders cards in correct columns with data attributes', () => {
    const { container } = render(React.createElement(KanbanBoard, defaultProps));
    const col1 = container.querySelector('[data-column-id="col1"]');
    expect(col1).toBeTruthy();
    const cardsInCol1 = col1!.querySelectorAll('[data-slot="kanban-card"]');
    expect(cardsInCol1.length).toBe(3);

    const col2 = container.querySelector('[data-column-id="col2"]');
    expect(col2).toBeTruthy();
    const cardsInCol2 = col2!.querySelectorAll('[data-slot="kanban-card"]');
    expect(cardsInCol2.length).toBe(2);
  });

  it('renders columns in order from root children', () => {
    const { container } = render(React.createElement(KanbanBoard, defaultProps));
    const columns = container.querySelectorAll('[data-slot="kanban-column"]');
    expect(columns[0]?.getAttribute('data-column-id')).toBe('col1');
    expect(columns[1]?.getAttribute('data-column-id')).toBe('col2');
    expect(columns[2]?.getAttribute('data-column-id')).toBe('col3');
  });

  it('renders add card buttons in each column', () => {
    render(React.createElement(KanbanBoard, defaultProps));
    const addButtons = screen.getAllByText('+ 添加卡片');
    expect(addButtons.length).toBe(3);
  });

  it('renders with testid when provided', () => {
    const { container } = render(
      React.createElement(KanbanBoard, {
        ...defaultProps,
        meta: { visible: true, disabled: false, testid: 'my-kanban' } as any,
      }),
    );
    expect(container.querySelector('[data-testid="my-kanban"]')).toBeTruthy();
  });

  it('returns null when meta.visible is false', () => {
    const { container } = render(
      React.createElement(KanbanBoard, {
        ...defaultProps,
        meta: { visible: false, disabled: false } as any,
      }),
    );
    expect(container.innerHTML).toBe('');
  });
});
