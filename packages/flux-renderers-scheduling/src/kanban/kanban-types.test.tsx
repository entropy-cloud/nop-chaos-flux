import { describe, expect, it } from 'vitest';
import type { RendererHelpers } from '@nop-chaos/flux-core';
import type { KanbanCardProps } from './kanban-card.js';
import type { KanbanColumnProps } from './kanban-column.js';
import type { BoardData, BoardItem } from './kanban.types.js';

const card: BoardItem = { id: 'c1', type: 'card', parentId: 'col1', children: [], data: {}, meta: {} };
const column: BoardItem = { id: 'col1', type: 'column', parentId: 'root', children: ['c1'], data: {}, meta: {} };
const board: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1'], data: {}, meta: {} },
  col1: column,
  c1: card,
};

describe('13-02 kanban public helpers prop type contract', () => {
  it('accepts an object with only render as helpers', () => {
    const cardProps: KanbanCardProps = {
      card,
      column,
      index: 0,
      helpers: { render: () => null },
    };
    const columnProps: KanbanColumnProps = {
      column,
      board,
      collapsed: false,
      onToggleCollapse: () => {},
      helpers: { render: () => null },
    };
    expect(cardProps.helpers?.render).toBeTypeOf('function');
    expect(columnProps.helpers?.render).toBeTypeOf('function');
  });

  it('accepts a Pick<RendererHelpers, "render"> value as helpers', () => {
    const helpers: Pick<RendererHelpers, 'render'> = { render: () => null };
    const cardProps: KanbanCardProps = { card, column, index: 0, helpers };
    const columnProps: KanbanColumnProps = {
      column,
      board,
      collapsed: false,
      onToggleCollapse: () => {},
      helpers,
    };
    expect(cardProps.helpers?.render).toBeTypeOf('function');
    expect(columnProps.helpers?.render).toBeTypeOf('function');
  });

  it('rejects helpers missing render (tsc-enforced, do not cast as any)', () => {
    const validCardProps: KanbanCardProps = { card, column, index: 0, helpers: { render: () => null } };
    // @ts-expect-error 13-02: helpers requires a render function; regressing to `any` would make this line unused (TS2578)
    const badCardProps: KanbanCardProps = { ...validCardProps, helpers: {} };
    const validColumnProps: KanbanColumnProps = {
      column,
      board,
      collapsed: false,
      onToggleCollapse: () => {},
      helpers: { render: () => null },
    };
    // @ts-expect-error 13-02: helpers requires a render function; regressing to `any` would make this line unused (TS2578)
    const badColumnProps: KanbanColumnProps = { ...validColumnProps, helpers: {} };
    expect(badCardProps.helpers).toEqual({});
    expect(badColumnProps.helpers).toEqual({});
  });
});
