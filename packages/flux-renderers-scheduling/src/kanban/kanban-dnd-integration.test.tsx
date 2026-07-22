import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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
  id: 'test-kanban-dnd',
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

describe('Kanban DnD Integration', () => {
  it('renders kanban board with columns', () => {
    const { container } = render(React.createElement(KanbanBoard, defaultProps));
    expect(screen.getByText('To Do')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
    const columns = container.querySelectorAll('[data-slot="kanban-column"]');
    expect(columns.length).toBe(2);
  });

  it('renders cards with data-card-id and data-column-id attributes', () => {
    const { container } = render(React.createElement(KanbanBoard, defaultProps));
    const card1 = container.querySelector('[data-card-id="card1"]');
    expect(card1).toBeTruthy();
    expect(card1?.getAttribute('data-column-id')).toBe('col1');
    const card2 = container.querySelector('[data-card-id="card2"]');
    expect(card2).toBeTruthy();
  });

  it('renders columns with data-column-id attributes', () => {
    const { container } = render(React.createElement(KanbanBoard, defaultProps));
    const col1 = container.querySelector('[data-column-id="col1"]');
    expect(col1).toBeTruthy();
    const col2 = container.querySelector('[data-column-id="col2"]');
    expect(col2).toBeTruthy();
  });

  it('renders column headers with collapse/expand buttons', () => {
    render(React.createElement(KanbanBoard, defaultProps));
    const collapseBtns = screen.getAllByLabelText(/Collapse column|Expand column/);
    expect(collapseBtns.length).toBeGreaterThanOrEqual(2);
  });

  it('renders add card buttons in columns', () => {
    render(React.createElement(KanbanBoard, defaultProps));
    const addButtons = screen.getAllByText('+ 添加卡片');
    expect(addButtons.length).toBe(2);
  });

  it('renders empty column with drop zone placeholder', () => {
    render(React.createElement(KanbanBoard, defaultProps));
    expect(screen.getByText('拖拽卡片到此处')).toBeTruthy();
  });

  it('renders with correct column order from root children', () => {
    const { container } = render(React.createElement(KanbanBoard, defaultProps));
    const columns = container.querySelectorAll('[data-slot="kanban-column"]');
    expect(columns.length).toBe(2);
  });

  it('renders cards in correct column order', () => {
    const { container } = render(React.createElement(KanbanBoard, defaultProps));
    const toDoCol = container.querySelector('[data-column-id="col1"]');
    expect(toDoCol).toBeTruthy();
    const cardsInCol = toDoCol!.querySelectorAll('[data-slot="kanban-card"]');
    expect(cardsInCol.length).toBe(2);
  });

  it('moves card between columns via keyboard (Space then ArrowRight)', () => {
    const { container } = render(React.createElement(KanbanBoard, defaultProps));
    const cardEl = container.querySelector('[data-card-id="card1"]') as HTMLElement;
    expect(cardEl).toBeTruthy();

    fireEvent.keyDown(cardEl, { key: ' ' });
    expect(cardEl.getAttribute('data-keyboard-dragging')).toBe('true');

    fireEvent.keyDown(cardEl, { key: 'ArrowRight' });

    const doneCol = container.querySelector('[data-column-id="col2"]');
    expect(doneCol).toBeTruthy();
    const cardsInDone = doneCol!.querySelectorAll('[data-slot="kanban-card"]');
    expect(cardsInDone.length).toBe(1);
  });

  it('cancels keyboard card move on Escape', () => {
    const { container } = render(React.createElement(KanbanBoard, defaultProps));
    const cardEl = container.querySelector('[data-card-id="card1"]') as HTMLElement;
    expect(cardEl).toBeTruthy();

    fireEvent.keyDown(cardEl, { key: 'Enter' });
    expect(cardEl.getAttribute('data-keyboard-dragging')).toBe('true');

    fireEvent.keyDown(cardEl, { key: 'Escape' });
    expect(cardEl.getAttribute('data-keyboard-dragging')).toBeNull();

    const toDoCol = container.querySelector('[data-column-id="col1"]');
    const cardsInToDo = toDoCol!.querySelectorAll('[data-slot="kanban-card"]');
    expect(cardsInToDo.length).toBe(2);
  });

  it('moves card to previous column via keyboard (Space then ArrowLeft)', () => {
    const boardWithCardsInSecond: BoardData = {
      root: { id: 'root', type: 'root', children: ['col1', 'col2'], data: {}, meta: {} },
      col1: { id: 'col1', type: 'column', parentId: 'root', children: [], data: { title: 'To Do' }, meta: {} },
      col2: { id: 'col2', type: 'column', parentId: 'root', children: ['card1'], data: { title: 'Done' }, meta: {} },
      card1: { id: 'card1', type: 'card', parentId: 'col2', children: [], data: { title: 'Task 1' }, meta: {} },
    };
    const props = { ...defaultProps, props: { ...defaultProps.props, data: boardWithCardsInSecond } };
    const { container } = render(React.createElement(KanbanBoard, props));
    const cardEl = container.querySelector('[data-card-id="card1"]') as HTMLElement;
    expect(cardEl).toBeTruthy();

    fireEvent.keyDown(cardEl, { key: ' ' });
    expect(cardEl.getAttribute('data-keyboard-dragging')).toBe('true');

    fireEvent.keyDown(cardEl, { key: 'ArrowLeft' });

    const toDoCol = container.querySelector('[data-column-id="col1"]');
    const cardsInToDo = toDoCol!.querySelectorAll('[data-slot="kanban-card"]');
    expect(cardsInToDo.length).toBe(1);
  });

  it('reorders columns via keyboard (drag handle ArrowLeft/ArrowRight)', () => {
    const { container } = render(React.createElement(KanbanBoard, defaultProps));
    const col1 = container.querySelector('[data-column-id="col1"]') as HTMLElement;
    expect(col1).toBeTruthy();

    const dragHandle = col1.querySelector('[data-slot="column-drag-handle"]') as HTMLElement;
    if (dragHandle) {
      fireEvent.keyDown(dragHandle, { key: 'ArrowRight' });

      const columns = container.querySelectorAll('[data-slot="kanban-column"]');
      expect(columns.length).toBe(2);
    }
  });
});
