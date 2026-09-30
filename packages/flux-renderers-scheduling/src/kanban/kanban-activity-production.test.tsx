import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, fireEvent, screen } from '@testing-library/react';
import { KanbanBoard } from './kanban-board.js';
import type { BoardData } from './kanban.types.js';

/**
 * V12f Phase 3 — [G4-R4-视角11-03] kanban 活动日志生产契约：board 内既有
 * mutation 通道（加卡/删卡/建列）必须同步产出活动记录。修复前六类动作中
 * 五类零生产，删除卡片后日志毫无痕迹。
 * cardUpdate / columnDelete 在 board 内不存在既有 emitter（无卡片编辑、
 * 无删列能力），不在本批凭空造通道——见 plan 488 对账的 adjudication。
 */
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
  useCurrentComponentRegistry: () => undefined,
}));

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      'scheduling.kanban.expandColumn': 'Expand column',
      'scheduling.kanban.collapseColumn': 'Collapse column',
      'scheduling.kanban.searchCards': '搜索卡片...',
      'scheduling.kanban.addColumn': '+ 添加列',
      'scheduling.kanban.addCard': '+ 添加卡片',
      'scheduling.kanban.dragColumnLabel': 'Drag to reorder column {{title}}',
      'scheduling.kanban.currentUser': '当前用户',
      'scheduling.kanban.undo': '撤销 (Ctrl+Z)',
      'scheduling.kanban.redo': '重做 (Ctrl+Shift+Z)',
      'scheduling.kanban.activityLog': '活动日志',
      'scheduling.kanban.dragCardHere': '拖拽卡片到此处',
      'scheduling.kanban.removeCardLabel': '移除卡片',
      'scheduling.kanban.columnLabel': 'Column: {{title}}',
      'scheduling.kanban.resizeColumnLabel': 'Resize column',
      'scheduling.kanban.columnTitlePlaceholder': '列标题',
      'scheduling.kanban.newCard': '新卡片',
      'scheduling.kanban.newColumn': '新列',
      'scheduling.kanban.boardSummary': '{{columns}} 列，{{cards}} 张卡片',
      'scheduling.kanban.noActivity': '暂无活动记录',
      'scheduling.kanban.cardCreated': 'LOG-CREATED {{column}}',
      'scheduling.kanban.cardDeleted': 'LOG-DELETED {{column}}',
      'scheduling.kanban.columnCreated': 'LOG-COLUMN-CREATED {{column}}',
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

const sampleBoard: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1'], data: {}, meta: {} },
  col1: {
    id: 'col1', type: 'column', parentId: 'root',
    children: ['card1'],
    data: { title: 'To Do' }, meta: {},
  },
  card1: {
    id: 'card1', type: 'card', parentId: 'col1',
    children: [], data: { title: 'Task 1', description: 'First task' }, meta: {},
  },
};

function renderBoard() {
  return render(
    <KanbanBoard
      id="test-kanban"
      path={'test' as any}
      schema={{ type: 'kanban' as const }}
      templateNode={{} as any}
      node={{} as any}
      props={{ data: sampleBoard } as any}
      meta={{ visible: true, disabled: false } as any}
      regions={{} as any}
      events={{} as any}
      reactions={{} as any}
      helpers={{} as any}
    />,
  );
}

function openActivityLog(container: HTMLElement) {
  const toggle = container.querySelector('button[title="活动日志"]') as HTMLButtonElement | null;
  expect(toggle).toBeTruthy();
  fireEvent.click(toggle!);
}

afterEach(cleanup);

describe('KanbanBoard — activity log production from existing emitters (G4-R4-视角11-03)', () => {
  it('records cardCreate when a card is added via the column footer', () => {
    const { container } = renderBoard();
    openActivityLog(container);
    expect(document.body.querySelector('[data-slot="kanban-activity-log"]')).toBeTruthy();

    const addCardButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.textContent === '+ 添加卡片',
    );
    fireEvent.click(addCardButtons[0]!);

    expect(screen.getByText(/LOG-CREATED To Do/)).toBeTruthy();
  });

  it('records cardDelete when a card is removed — the log keeps a trace after deletion', () => {
    const { container } = renderBoard();
    openActivityLog(container);

    const removeButton = container.querySelector('button[aria-label="移除卡片"]') as HTMLButtonElement | null;
    expect(removeButton).toBeTruthy();
    fireEvent.click(removeButton!);

    expect(screen.getByText(/LOG-DELETED To Do/)).toBeTruthy();
  });

  it('records columnCreate when a column is added via the adder', () => {
    const { container } = renderBoard();
    openActivityLog(container);

    const addColumnButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '+ 添加列',
    );
    expect(addColumnButton).toBeTruthy();
    fireEvent.click(addColumnButton!);

    const input = container.querySelector('input[aria-label="列标题"]') as HTMLInputElement | null;
    expect(input).toBeTruthy();
    fireEvent.change(input!, { target: { value: 'Blocked' } });
    const confirmButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === '确认',
    );
    fireEvent.click(confirmButton!);

    expect(screen.getByText(/LOG-COLUMN-CREATED Blocked/)).toBeTruthy();
  });

  it('starts with an empty log — no fabricated entries', () => {
    const { container } = renderBoard();
    openActivityLog(container);
    expect(screen.getByText('暂无活动记录')).toBeTruthy();
  });
});
