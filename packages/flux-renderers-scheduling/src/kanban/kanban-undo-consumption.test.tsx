import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
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

vi.mock('@nop-chaos/flux-react', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
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
  // RM-11 plan 613: ownership hooks delegate to the shared primitive — emulate its
  // inactive read as undefined (matches this file's scope emulation).
  useOwnershipScopeValue: () => undefined,
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

describe('kanban Ctrl+Z keyboard consumption chain (P1-MA4.3-009)', () => {
  it('undo via keyboard after a handle-driven move restores the card column ownership', async () => {
    const { container } = render(<KanbanBoard {...defaultProps} />);
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const handle = registryMock.state.handle!;

    // production move through the handle (the same push path the pointer dnd feeds)
    expect(
      handle.capabilities.invoke('moveCard', { cardId: 'card1', toColumnId: 'col2', toIndex: 0 }, {}),
    ).toEqual({ ok: true });
    await waitFor(() => {
      expect(container.querySelector('[data-card-id="card1"]')?.getAttribute('data-column-id')).toBe('col2');
    });

    // focus inside the board (the keydown consumer gates on activeElement containment)
    const focusTarget = container.querySelector('[data-card-id="card1"]') as HTMLElement | null;
    (focusTarget ?? container.querySelector('[data-slot="kanban"]'))?.focus?.();
    fireEvent.keyDown(window, { ctrlKey: true, key: 'z' });

    await waitFor(() => {
      expect(container.querySelector('[data-card-id="card1"]')?.getAttribute('data-column-id')).toBe('col1');
    });
  });

  it('Ctrl+Shift+Z redo re-applies the undone move', async () => {
    const { container } = render(<KanbanBoard {...defaultProps} />);
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });
    const handle = registryMock.state.handle!;

    handle.capabilities.invoke('moveCard', { cardId: 'card1', toColumnId: 'col2', toIndex: 0 }, {});
    await waitFor(() => {
      expect(container.querySelector('[data-card-id="card1"]')?.getAttribute('data-column-id')).toBe('col2');
    });

    (container.querySelector('[data-card-id="card1"]') as HTMLElement).focus();
    fireEvent.keyDown(window, { ctrlKey: true, key: 'z' });
    await waitFor(() => {
      expect(container.querySelector('[data-card-id="card1"]')?.getAttribute('data-column-id')).toBe('col1');
    });

    // undo 重渲染可能替换焦点节点——keydown 消费者有 activeElement 包含门
    // （use-kanban-board-effects.ts:56），redo 前重新聚焦板内元素
    (container.querySelector('[data-card-id="card1"]') as HTMLElement).focus();
    // shift 在真实浏览器中把 key 报为大写 Z——两种形态都驱动一次
    fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'Z' });
    fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: 'z' });
    await waitFor(() => {
      expect(container.querySelector('[data-card-id="card1"]')?.getAttribute('data-column-id')).toBe('col2');
    });
  });

  it('Ctrl+Z with empty undo history is a no-op (no board churn)', async () => {
    const { container } = render(<KanbanBoard {...defaultProps} />);
    await waitFor(() => {
      expect(registryMock.state.handle).toBeTruthy();
    });

    (container.querySelector('[data-card-id="card1"]') as HTMLElement).focus();
    fireEvent.keyDown(window, { ctrlKey: true, key: 'z' });

    expect(container.querySelector('[data-card-id="card1"]')?.getAttribute('data-column-id')).toBe('col1');
    expect(container.querySelector('[data-card-id="card2"]')?.getAttribute('data-column-id')).toBe('col1');
  });
});
