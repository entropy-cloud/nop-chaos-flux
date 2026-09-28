import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { BoardData } from './kanban.types.js';
import { KanbanColumn } from './kanban-column.js';
import { KanbanCard } from './kanban-card.js';
import { KanbanBoard } from './kanban-board.js';
import { addCard, moveCard, moveColumn, removeCard, changeCard, addColumn, removeColumn } from './kanban-helpers.js';

vi.mock('@nop-chaos/flux-react', () => {
  const stableScope = { id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() };
  return {
    useRendererRuntime: () => ({ dispatch: vi.fn() }),
    useRenderScope: () => stableScope,
    useScopeSelector: () => undefined,
    useCurrentComponentRegistry: () => undefined,
  };
});

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      'scheduling.kanban.columnLabel': 'Column {{title}}',
      'scheduling.kanban.addCard': '+ 添加卡片',
      'scheduling.kanban.activityLog': '活动日志',
      'scheduling.kanban.searchCards': '搜索卡片...',
      'scheduling.kanban.removeCardLabel': '移除卡片',
      'scheduling.kanban.boardSummary': '{{columns}} 列 {{cards}} 卡',
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
  col1: { id: 'col1', type: 'column', parentId: 'root', children: ['card1', 'card2'], data: { title: 'To Do' }, meta: {} },
  col2: { id: 'col2', type: 'column', parentId: 'root', children: [], data: { title: 'Done' }, meta: {} },
  card1: { id: 'card1', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 1', description: 'First task' }, meta: {} },
  card2: { id: 'card2', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 2', description: 'Second task' }, meta: { color: '#ff0000' } },
};

describe('kanban structural-sharing mutations (plan 2026-09-29-1 Phase 1)', () => {
  it('moveCard shares untouched entries by reference and refreshes only involved ones', () => {
    const next = moveCard(sampleBoard, 'card1', 'col2', 0);
    expect(next).not.toBe(sampleBoard);
    expect(next['root']).toBe(sampleBoard['root']);
    expect(next['col1']).not.toBe(sampleBoard['col1']);
    expect(next['col2']).not.toBe(sampleBoard['col2']);
    expect(next['card1']).not.toBe(sampleBoard['card1']);
    expect(next['card1']!.parentId).toBe('col2');
    expect(next['card2']).toBe(sampleBoard['card2']);
    expect(next['col1']!.children).toEqual(['card2']);
    expect(next['col2']!.children).toEqual(['card1']);
  });

  it('moveCard same-column move keeps a single fresh column entry', () => {
    const next = moveCard(sampleBoard, 'card1', 'col1', 1);
    expect(next['col1']).not.toBe(sampleBoard['col1']);
    expect(next['col1']!.children).toEqual(['card2', 'card1']);
    expect(next['root']).toBe(sampleBoard['root']);
    expect(next['card2']).toBe(sampleBoard['card2']);
  });

  it('moveCard returns the same board when target column missing (card not orphaned)', () => {
    const next = moveCard(sampleBoard, 'card1', 'missing-col', 0);
    expect(next).toBe(sampleBoard);
  });

  it('moveColumn refreshes only root children', () => {
    const next = moveColumn(sampleBoard, 'col1', 1);
    expect(next['root']).not.toBe(sampleBoard['root']);
    expect(next['root']!.children).toEqual(['col2', 'col1']);
    expect(next['col1']).toBe(sampleBoard['col1']);
    expect(next['card1']).toBe(sampleBoard['card1']);
  });

  it('addCard shares untouched columns and cards', () => {
    const next = addCard(sampleBoard, 'col2', { id: 'card9', title: 'New' });
    expect(next['card9']).toBeDefined();
    expect(next['col1']).toBe(sampleBoard['col1']);
    expect(next['card1']).toBe(sampleBoard['card1']);
    expect(next['col2']).not.toBe(sampleBoard['col2']);
    expect(next['col2']!.children).toEqual(['card9']);
  });

  it('removeCard drops only the card entry and its parent children array', () => {
    const next = removeCard(sampleBoard, 'card1');
    expect(next['card1']).toBeUndefined();
    expect(next['col1']).not.toBe(sampleBoard['col1']);
    expect(next['col1']!.children).toEqual(['card2']);
    expect(next['card2']).toBe(sampleBoard['card2']);
    expect(next['col2']).toBe(sampleBoard['col2']);
  });

  it('changeCard does not mutate the previous board card data/meta objects', () => {
    const next = changeCard(sampleBoard, 'card1', { data: { title: 'Changed' }, meta: { color: '#00ff00' } });
    expect(next['card1']).not.toBe(sampleBoard['card1']);
    expect((sampleBoard['card1']!.data as Record<string, unknown>).title).toBe('Task 1');
    expect((next['card1']!.data as Record<string, unknown>).title).toBe('Changed');
    expect((sampleBoard['card1']!.meta as Record<string, unknown>).color).toBeUndefined();
    expect((next['card1']!.meta as Record<string, unknown>).color).toBe('#00ff00');
    expect(next['col1']).toBe(sampleBoard['col1']);
  });

  it('changeCard parentId move refreshes both parent columns and card entry', () => {
    const next = changeCard(sampleBoard, 'card1', { parentId: 'col2' });
    expect(next['card1']!.parentId).toBe('col2');
    expect(next['col1']!.children).toEqual(['card2']);
    expect(next['col2']!.children).toEqual(['card1']);
    expect(next['col1']).not.toBe(sampleBoard['col1']);
    expect(next['col2']).not.toBe(sampleBoard['col2']);
  });

  it('addColumn refreshes only root children and adds the column entry', () => {
    const next = addColumn(sampleBoard, { id: 'col3', title: 'New Col' });
    expect(next['col3']).toBeDefined();
    expect(next['root']).not.toBe(sampleBoard['root']);
    expect(next['root']!.children).toEqual(['col1', 'col2', 'col3']);
    expect(next['col1']).toBe(sampleBoard['col1']);
  });

  it('removeColumn drops column + children entries, refreshes root children', () => {
    const next = removeColumn(sampleBoard, 'col1');
    expect(next['col1']).toBeUndefined();
    expect(next['card1']).toBeUndefined();
    expect(next['card2']).toBeUndefined();
    expect(next['col2']).toBe(sampleBoard['col2']);
    expect(next['root']!.children).toEqual(['col2']);
  });
});

describe('kanban memoization render gates (plan 2026-09-29-1 Phase 1)', () => {
  const column = sampleBoard['col1']!;
  const card = sampleBoard['card1']!;

  function makeColumnProps() {
    const probeRender = vi.fn(() => null);
    const props: any = {
      column,
      board: sampleBoard,
      collapsed: false,
      onToggleCollapse: vi.fn(),
      onCardClick: vi.fn(),
      onCardRemove: vi.fn(),
      onAddCard: vi.fn(),
      onColumnClick: vi.fn(),
      onDragHandleKeyDown: vi.fn(),
      filterCardFn: undefined,
      columnFooterRegion: { render: probeRender },
      virtualize: true,
    };
    return { props, probeRender };
  }

  it('KanbanColumn bails identical-props rerender and re-renders on real prop change', () => {
    const { props, probeRender } = makeColumnProps();
    const { rerender } = render(<KanbanColumn {...props} />);
    expect(probeRender).toHaveBeenCalledTimes(1);

    rerender(<KanbanColumn {...props} />);
    expect(probeRender).toHaveBeenCalledTimes(1);

    rerender(<KanbanColumn {...props} collapsed />);
    expect(probeRender).toHaveBeenCalledTimes(2);
  });

  it('KanbanCard bails identical-props rerender; board-index identity change re-renders', () => {
    const probeRender = vi.fn(() => null);
    const onRovingKeyDown = vi.fn();
    const base: any = {
      card,
      column,
      index: 0,
      displayIndex: 0,
      onCardClick: vi.fn(),
      onCardRemove: vi.fn(),
      onRovingKeyDown,
      cardTemplateRegion: { render: probeRender },
    };
    const { rerender } = render(<KanbanCard {...base} />);
    expect(probeRender).toHaveBeenCalledTimes(1);

    rerender(<KanbanCard {...base} />);
    expect(probeRender).toHaveBeenCalledTimes(1);

    rerender(<KanbanCard {...base} index={1} />);
    expect(probeRender).toHaveBeenCalledTimes(2);
  });

  it('KanbanCard roving handler receives displayIndex over board index', () => {
    const onRovingKeyDown = vi.fn();
    const base: any = {
      card,
      column,
      index: 3,
      displayIndex: 1,
      onCardClick: vi.fn(),
      onCardRemove: vi.fn(),
      onRovingKeyDown,
    };
    render(<KanbanCard {...base} />);
    const el = document.querySelector('[data-card-id="card1"]') as HTMLElement;
    fireEvent.keyDown(el, { key: 'ArrowDown' });
    expect(onRovingKeyDown).toHaveBeenCalledWith(expect.anything(), 1);
  });

  it('board-level unrelated state change keeps non-target columns bailed (drop-tick shape)', () => {
    const footerRender = vi.fn(() => null);
    const props: any = {
      id: 'test-kanban',
      path: 'test',
      schema: { type: 'kanban' },
      templateNode: {},
      node: {},
      props: { data: sampleBoard },
      meta: { visible: true, disabled: false },
      regions: { columnFooter: { render: footerRender } },
      events: {},
      reactions: {},
      helpers: {},
    };
    render(<KanbanBoard {...props} />);
    const initialCalls = footerRender.mock.calls.length;
    expect(initialCalls).toBeGreaterThanOrEqual(2);

    fireEvent.change(screen.getByLabelText('搜索卡片...'), { target: { value: 'x' } });
    expect(footerRender.mock.calls.length).toBe(initialCalls);
  });
});
