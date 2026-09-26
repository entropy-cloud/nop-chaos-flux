import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { KanbanBoard } from './kanban-board.js';
import type { BoardData } from './kanban.types.js';

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useScopeSelector: () => undefined,
  useCurrentComponentRegistry: () => undefined,
}));

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string) => key,
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

const board: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1'], data: {}, meta: {} },
  col1: { id: 'col1', type: 'column', parentId: 'root', children: ['card1', 'card2'], data: { title: 'To Do' }, meta: {} },
  card1: { id: 'card1', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 1' }, meta: {} },
  card2: { id: 'card2', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 2' }, meta: {} },
};

describe('kanban cardTemplate region bindings (L4.8)', () => {
  it('passes { card, column, index } through the bindings channel, not positional options', () => {
    const seen: Array<Record<string, unknown> | undefined> = [];
    const cardTemplateRegion = {
      render: (options?: { bindings?: Record<string, unknown> }) => {
        seen.push(options?.bindings);
        return null;
      },
    };
    const props = {
      id: 'kanban-bindings',
      path: 'test' as const,
      schema: { type: 'kanban' as const },
      templateNode: {},
      node: {},
      props: { data: board },
      meta: { visible: true, disabled: false },
      regions: { cardTemplate: cardTemplateRegion },
      events: {},
      reactions: {},
      helpers: {},
    };
    render(React.createElement(KanbanBoard, props as never));

    expect(seen.length).toBe(2);
    const first = seen[0] as { card: { id: string; data: { title: string } }; column: { id: string }; index: number };
    expect(first.card.id).toBe('card1');
    expect(first.card.data.title).toBe('Task 1');
    expect(first.column.id).toBe('col1');
    expect(first.index).toBe(0);
    const second = seen[1] as { card: { id: string }; index: number };
    expect(second.card.id).toBe('card2');
    expect(second.index).toBe(1);
    // no bindings leak through positional fields on the options object
    expect(seen.every((entry) => entry !== undefined)).toBe(true);
  });
});
