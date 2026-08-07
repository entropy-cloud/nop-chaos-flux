import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { ComponentHandle, ComponentHandleRegistry } from '@nop-chaos/flux-core';
import type { BoardData } from './kanban.types.js';

const registryMock = vi.hoisted(() => {
  const state: { handle: ComponentHandle | null } = { handle: null };
  return {
    register: vi.fn((handle: ComponentHandle) => {
      state.handle = handle;
      return () => {};
    }),
    state,
  };
});

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({
    id: 'mock-scope',
    path: '/mock',
    readVisible: () => ({}),
    readOwn: () => ({}),
    update: vi.fn(),
    merge: vi.fn(),
    replace: vi.fn(),
    dispose: vi.fn(),
  }),
  useScopeSelector: () => undefined,
  useCurrentComponentRegistry: () => registryMock as unknown as ComponentHandleRegistry,
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
      'scheduling.kanban.resizeColumnLabel': 'Resize column',
      'scheduling.kanban.columnTitlePlaceholder': '列标题',
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

afterEach(() => {
  registryMock.register.mockClear();
  registryMock.state.handle = null;
});

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

import { KanbanBoard } from './kanban-board.js';

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
    children: [], data: { title: 'Task 1' }, meta: {},
  },
  card2: {
    id: 'card2', type: 'card', parentId: 'col1',
    children: [], data: { title: 'Task 2' }, meta: {},
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

describe('KanbanBoard component handle registration (22-12)', () => {
  it('registers a kanban handle whose listMethods exposes the 7 design.md §8 handles', async () => {
    render(<KanbanBoard {...defaultProps} />);
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const handle = registryMock.state.handle!;
    expect(handle.type).toBe('kanban');
    expect(handle.id).toBe('test-kanban');
    expect(handle.capabilities.listMethods!()).toEqual([
      'scrollToCard',
      'scrollToColumn',
      'addCard',
      'removeCard',
      'moveCard',
      'collapseColumn',
      'getData',
    ]);
    for (const method of ['scrollToCard', 'scrollToColumn', 'addCard', 'removeCard', 'moveCard', 'collapseColumn', 'getData']) {
      expect(handle.capabilities.hasMethod!(method)).toBe(true);
    }
  });

  it('getData returns the current board snapshot (design.md §8)', async () => {
    render(<KanbanBoard {...defaultProps} />);
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const result = registryMock.state.handle!.capabilities.invoke('getData', undefined, {});
    expect(result).toEqual({ ok: true, data: sampleBoard });
  });

  it('addCard handle inserts a card into the target column and fires onCardAdd (design.md §8)', async () => {
    const onCardAdd = vi.fn();
    const { container } = render(<KanbanBoard {...defaultProps} events={{ onCardAdd } as any} />);
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const newCard = { id: 'card-new', title: 'Handle Added' };
    const result = registryMock.state.handle!.capabilities.invoke('addCard', {
      columnId: 'col2',
      card: newCard,
    }, {});
    expect(result).toEqual({ ok: true });
    await waitFor(() => {
      expect(container.querySelector('[data-card-id="card-new"]')).toBeTruthy();
    });
    expect(onCardAdd).toHaveBeenCalledTimes(1);
  });

  it('removeCard handle removes the card and fires onCardRemove (design.md §8)', async () => {
    const onCardRemove = vi.fn();
    const { container } = render(<KanbanBoard {...defaultProps} events={{ onCardRemove } as any} />);
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const result = registryMock.state.handle!.capabilities.invoke('removeCard', { cardId: 'card1' }, {});
    expect(result).toEqual({ ok: true });
    await waitFor(() => {
      expect(container.querySelector('[data-card-id="card1"]')).toBeNull();
    });
    expect(onCardRemove).toHaveBeenCalledTimes(1);
  });

  it('moveCard handle moves the card across columns (design.md §8)', async () => {
    const { container } = render(<KanbanBoard {...defaultProps} />);
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const result = registryMock.state.handle!.capabilities.invoke('moveCard', {
      cardId: 'card1',
      toColumnId: 'col2',
      toIndex: 0,
    }, {});
    expect(result).toEqual({ ok: true });
    await waitFor(() => {
      const moved = container.querySelector('[data-card-id="card1"]');
      expect(moved?.getAttribute('data-column-id')).toBe('col2');
    });
  });

  it('moveCard handle returns ok:false and fires no onCardMove when the target column is missing (1-4)', async () => {
    const onCardMove = vi.fn();
    const { container } = render(<KanbanBoard {...defaultProps} events={{ onCardMove } as any} />);
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const result = registryMock.state.handle!.capabilities.invoke('moveCard', {
      cardId: 'card1',
      toColumnId: 'missing-col',
      toIndex: 0,
    }, {});
    expect(result).toMatchObject({ ok: false });
    expect(onCardMove).not.toHaveBeenCalled();
    const card = container.querySelector('[data-card-id="card1"]');
    expect(card?.getAttribute('data-column-id')).toBe('col1');
  });

  it('undo of a card removal restores the full card including meta (1-5)', async () => {
    const boardWithMeta: BoardData = {
      ...sampleBoard,
      card1: {
        ...sampleBoard.card1,
        meta: {
          color: '#ff0000',
          tags: [{ id: 't1', text: 'urgent', color: '#ff0000' }],
          members: [{ id: 'm1', name: 'Alice', color: '#00ff00' }],
        },
      },
    };
    const { container } = render(<KanbanBoard {...defaultProps} props={{ data: boardWithMeta } as any} />);
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const handle = registryMock.state.handle!;
    expect(handle.capabilities.invoke('removeCard', { cardId: 'card1' }, {})).toEqual({ ok: true });
    await waitFor(() => {
      expect(container.querySelector('[data-card-id="card1"]')).toBeNull();
    });
    const undoButton = container.querySelector('button[title="撤销 (Ctrl+Z)"]') as HTMLElement;
    expect(undoButton).toBeTruthy();
    undoButton.click();
    await waitFor(() => {
      expect(container.querySelector('[data-card-id="card1"]')).toBeTruthy();
    });
    const snapshot = handle.capabilities.invoke('getData', undefined, {}) as { ok: boolean; data: BoardData };
    expect(snapshot.data.card1.meta).toEqual({
      color: '#ff0000',
      tags: [{ id: 't1', text: 'urgent', color: '#ff0000' }],
      members: [{ id: 'm1', name: 'Alice', color: '#00ff00' }],
    });
    expect(snapshot.data.card1.data.title).toBe('Task 1');
    const restoredCard = container.querySelector('[data-card-id="card1"]');
    expect(restoredCard?.querySelector('.nop-kanban-card-color-dot')).toBeTruthy();
  });

  it('collapseColumn handle collapses the column (design.md §8)', async () => {
    const { container } = render(<KanbanBoard {...defaultProps} />);
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const result = registryMock.state.handle!.capabilities.invoke('collapseColumn', {
      columnId: 'col1',
      collapsed: true,
    }, {});
    expect(result).toEqual({ ok: true });
    await waitFor(() => {
      expect(container.querySelector('[data-column-id="col1"]')?.className).toContain('nop-kanban-column-collapsed');
    });
  });

  it('mutation handles are rejected in controlled mode (mutation dropped semantics)', async () => {
    const onCardAdd = vi.fn();
    render(
      <KanbanBoard
        {...defaultProps}
        props={{ ...defaultProps.props, kanbanOwnership: 'controlled' } as any}
        events={{ onCardAdd } as any}
      />,
    );
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const handle = registryMock.state.handle!;
    const addResult = handle.capabilities.invoke('addCard', { columnId: 'col2', card: { id: 'x', title: 'X' } }, {});
    expect(addResult).toMatchObject({ ok: false });
    const removeResult = handle.capabilities.invoke('removeCard', { cardId: 'card1' }, {});
    expect(removeResult).toMatchObject({ ok: false });
    const moveResult = handle.capabilities.invoke('moveCard', { cardId: 'card1', toColumnId: 'col2', toIndex: 0 }, {});
    expect(moveResult).toMatchObject({ ok: false });
    expect(onCardAdd).not.toHaveBeenCalled();
  });
});
