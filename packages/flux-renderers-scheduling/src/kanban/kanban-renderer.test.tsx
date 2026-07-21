import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { BoardData } from './kanban.types.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
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

afterEach(cleanup);
import { KanbanBoard } from './kanban-board.js';
import { KanbanColumn } from './kanban-column.js';
import { KanbanCard } from './kanban-card.js';
import { KanbanColumnHeader } from './kanban-column-header.js';

const sampleBoard: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1', 'col2'], data: {}, meta: {} },
  col1: {
    id: 'col1', type: 'column', parentId: 'root',
    children: ['card1', 'card2'],
    data: { title: 'To Do' }, meta: {},
  },
  col2: {
    id: 'col2', type: 'column', parentId: 'root',
    children: [],
    data: { title: 'Done' }, meta: {},
  },
  card1: {
    id: 'card1', type: 'card', parentId: 'col1',
    children: [], data: { title: 'Task 1', description: 'First task' }, meta: {},
  },
  card2: {
    id: 'card2', type: 'card', parentId: 'col1',
    children: [], data: { title: 'Task 2', description: 'Second task' }, meta: { color: '#ff0000' },
  },
};

const defaultProps = {
  id: 'test-kanban',
  path: 'test' as any,
  schema: { type: 'kanban' as const },
  templateNode: {} as any,
  node: {} as any,
  props: { data: sampleBoard } as any,
  meta: { visible: true, disabled: false } as any,
  regions: {} as any,
  events: {} as any,
  reactions: {} as any,
  helpers: {} as any,
};

describe('KanbanBoard', () => {
  it('renders columns from board data', () => {
    render(<KanbanBoard {...defaultProps} />);
    expect(screen.getByText('To Do')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
  });

  it('renders empty state when no columns', () => {
    const emptyBoard = { root: { id: 'root', type: 'root', children: [], data: {}, meta: {} } };
    render(<KanbanBoard {...defaultProps} props={{ ...defaultProps.props, data: emptyBoard }} />);
    expect(screen.getByText('暂无数据')).toBeTruthy();
  });

  it('renders loading skeleton when loading prop is set', () => {
    render(<KanbanBoard {...defaultProps} props={{ ...defaultProps.props, loading: true }} />);
    const skeletons = document.querySelectorAll('.nop-kanban-skeleton');
    expect(skeletons.length).toBe(3);
  });

  it('renders filter input', () => {
    render(<KanbanBoard {...defaultProps} />);
    expect(screen.getByPlaceholderText('搜索卡片...')).toBeTruthy();
  });
});

describe('KanbanColumn', () => {
  const column = sampleBoard['col1']!;
  const col2 = sampleBoard['col2']!;

  it('renders column header with card count', () => {
    render(
      <KanbanColumn
        column={column}
        board={sampleBoard}
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );
    expect(screen.getByText('To Do')).toBeTruthy();
  });

  it('renders cards within the column', () => {
    render(
      <KanbanColumn
        column={column}
        board={sampleBoard}
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );
    expect(screen.getByText('Task 1')).toBeTruthy();
    expect(screen.getByText('Task 2')).toBeTruthy();
  });

  it('hides card list when collapsed', () => {
    const { container } = render(
      <KanbanColumn
        column={column}
        board={sampleBoard}
        collapsed={true}
        onToggleCollapse={() => {}}
      />,
    );
    const body = container.querySelector('[data-slot="kanban-column-body"]');
    expect(body).toBeFalsy();
  });

  it('shows drop zone placeholder for empty column', () => {
    render(
      <KanbanColumn
        column={col2}
        board={sampleBoard}
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );
    expect(screen.getByText('拖拽卡片到此处')).toBeTruthy();
  });

  it('renders add card button', () => {
    render(
      <KanbanColumn
        column={column}
        board={sampleBoard}
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );
    expect(screen.getByText('+ 添加卡片')).toBeTruthy();
  });
});

describe('KanbanCard', () => {
  const card = sampleBoard['card1']!;
  const column = sampleBoard['col1']!;

  it('renders card title and description', () => {
    render(<KanbanCard card={card} column={column} index={0} />);
    expect(screen.getByText('Task 1')).toBeTruthy();
  });

  it('triggers onCardClick handler', () => {
    const onClick = vi.fn();
    render(<KanbanCard card={card} column={column} index={0} onCardClick={onClick} />);
    screen.getByText('Task 1').click();
    expect(onClick).toHaveBeenCalledWith('card1', 'col1', 0);
  });

  it('renders with data-slot markers', () => {
    const { container } = render(<KanbanCard card={card} column={column} index={0} />);
    const cardEl = container.querySelector('[data-slot="kanban-card"]');
    expect(cardEl).toBeTruthy();
    expect(cardEl?.getAttribute('data-card-id')).toBe('card1');
    expect(cardEl?.getAttribute('data-column-id')).toBe('col1');
  });
});

describe('KanbanColumnHeader', () => {
  const column = sampleBoard['col1']!;

  it('renders column title and card count', () => {
    render(
      <KanbanColumnHeader
        column={column}
        cardCount={5}
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );
    expect(screen.getByText('To Do')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('renders collapse button', () => {
    render(
      <KanbanColumnHeader
        column={column}
        cardCount={0}
        collapsed={false}
        onToggleCollapse={() => {}}
      />,
    );
    const button = screen.getByLabelText('Collapse column');
    expect(button).toBeTruthy();
  });

  it('shows different chevron when collapsed', () => {
    render(
      <KanbanColumnHeader
        column={column}
        cardCount={0}
        collapsed={true}
        onToggleCollapse={() => {}}
      />,
    );
    const button = screen.getByLabelText('Expand column');
    expect(button).toBeTruthy();
  });
});
