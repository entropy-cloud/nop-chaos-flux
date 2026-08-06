import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { KanbanBoard } from './kanban-board.js';
import type { BoardData } from './kanban.types.js';

const { scopeSelectorSpy } = vi.hoisted(() => ({
  scopeSelectorSpy: vi.fn((..._args: unknown[]) => undefined),
}));

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
  useScopeSelector: scopeSelectorSpy,
  useCurrentComponentRegistry: () => undefined,
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

afterEach(() => {
  cleanup();
  scopeSelectorSpy.mockClear();
});

const singleColumnBoard: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1'], data: {}, meta: {} },
  col1: {
    id: 'col1', type: 'column', parentId: 'root',
    children: ['card1'],
    data: { title: 'Backlog' }, meta: {},
  },
  card1: { id: 'card1', type: 'card', parentId: 'col1', children: [], data: { title: 'Task A' }, meta: {} },
};

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-kanban-gating',
    path: 'test' as any,
    schema: { type: 'kanban' as const },
    templateNode: {} as any,
    node: {} as any,
    props: { data: singleColumnBoard } as any,
    meta: { visible: true, disabled: false } as any,
    regions: {} as any,
    events: {} as any,
    reactions: {} as any,
    helpers: {} as any,
    ...overrides,
  } as any;
}

function getCallOptions(call: unknown[]) {
  return call[2] as { enabled?: boolean; paths?: readonly string[] } | undefined;
}

describe('Kanban useScopeSelector ownership gating (05-01)', () => {
  it('local ownership: both board and collapsed subscriptions are disabled', () => {
    render(React.createElement(KanbanBoard, makeProps()));
    expect(scopeSelectorSpy).toHaveBeenCalledTimes(2);
    const [boardCall, collapsedCall] = scopeSelectorSpy.mock.calls;
    expect(getCallOptions(boardCall)?.enabled).toBe(false);
    expect(getCallOptions(collapsedCall)?.enabled).toBe(false);
  });

  it('local ownership with state paths configured still subscribes nothing', () => {
    render(React.createElement(KanbanBoard, makeProps({
      props: {
        data: singleColumnBoard,
        kanbanStatePath: 'state.board',
        collapsedStatePath: 'state.collapsed',
      },
    })));
    const [boardCall, collapsedCall] = scopeSelectorSpy.mock.calls;
    expect(getCallOptions(boardCall)?.enabled).toBe(false);
    expect(getCallOptions(collapsedCall)?.enabled).toBe(false);
  });

  it('scope ownership: board subscribes with its own path; collapsed stays local', () => {
    render(React.createElement(KanbanBoard, makeProps({
      props: {
        data: singleColumnBoard,
        kanbanOwnership: 'scope',
        kanbanStatePath: 'state.board',
      },
    })));
    const [boardCall, collapsedCall] = scopeSelectorSpy.mock.calls;
    expect(getCallOptions(boardCall)?.enabled).not.toBe(false);
    expect(getCallOptions(boardCall)?.paths).toEqual(['state.board']);
    expect(getCallOptions(collapsedCall)?.enabled).toBe(false);
  });

  it('collapsed scope ownership: collapsed subscribes with its own path; board stays local', () => {
    render(React.createElement(KanbanBoard, makeProps({
      props: {
        data: singleColumnBoard,
        collapsedOwnership: 'scope',
        collapsedStatePath: 'state.collapsed',
      },
    })));
    const [boardCall, collapsedCall] = scopeSelectorSpy.mock.calls;
    expect(getCallOptions(boardCall)?.enabled).toBe(false);
    expect(getCallOptions(collapsedCall)?.enabled).not.toBe(false);
    expect(getCallOptions(collapsedCall)?.paths).toEqual(['state.collapsed']);
  });

  it('scope ownership without a state path subscribes nothing (no path to read)', () => {
    render(React.createElement(KanbanBoard, makeProps({
      props: {
        data: singleColumnBoard,
        kanbanOwnership: 'scope',
        collapsedOwnership: 'scope',
      },
    })));
    const [boardCall, collapsedCall] = scopeSelectorSpy.mock.calls;
    expect(getCallOptions(boardCall)?.enabled).toBe(false);
    expect(getCallOptions(collapsedCall)?.enabled).toBe(false);
  });
});
