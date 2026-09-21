import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { KanbanCard } from './kanban-card.js';
import { KanbanColumn } from './kanban-column.js';
import { KanbanColumnHeader } from './kanban-column-header.js';
import type { BoardData, BoardItem } from './kanban.types.js';

/**
 * V12f Phase 3 — [G4-视角9-01] + [G4-视角9-02] kanban 交互元素嵌套/列表结构：
 * 1. 卡片根节点不再承担 role="button"（内部含真实移除按钮，交互元素不得嵌套），
 *    改为 role="listitem"，点击/键盘行为保留在根节点上。
 * 2. role="list" 的直接子项必须是 listitem（或 role="none" 透明包装），占位
 *    指示条等非卡片子项以 role="none" 透明化。
 * 3. 列头同理：不再 role="button"（内含拖拽把手/折叠按钮），改为带标签的
 *    role="group"。
 */
const column: BoardItem = {
  id: 'col1', type: 'column', parentId: 'root',
  children: ['card1'], data: { title: 'To Do' }, meta: {},
};
const card: BoardItem = {
  id: 'card1', type: 'card', parentId: 'col1',
  children: [], data: { title: 'Task 1', description: 'First task' }, meta: {},
};
const board: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1'], data: {}, meta: {} },
  col1: column,
  card1: card,
};

function closestWithRole(el: Element | null, role: string): Element | null {
  let cur: Element | null = el;
  while (cur) {
    if (cur.getAttribute('role') === role) return cur;
    cur = cur.parentElement;
  }
  return null;
}

describe('Kanban card — listitem role, no nested interactive (G4-视角9-01 / G4-视角9-02)', () => {
  it('card root is a listitem, not a button', () => {
    const { container } = render(<KanbanCard card={card} column={column} index={0} />);
    const cardEl = container.querySelector('[data-slot="kanban-card"]')!;
    expect(cardEl.getAttribute('role')).toBe('listitem');
  });

  it('the remove button inside the card has no role=button ancestor', () => {
    const { container } = render(<KanbanCard card={card} column={column} index={0} />);
    const removeButton = container.querySelector('button[aria-label]')!;
    expect(removeButton).toBeTruthy();
    expect(closestWithRole(removeButton, 'button')).toBeNull();
  });

  it('card keyboard contract survives the role change (Enter click, Delete remove)', () => {
    const onCardClick = vi.fn();
    const onCardRemove = vi.fn();
    const { container } = render(
      <KanbanCard card={card} column={column} index={0} onCardClick={onCardClick} onCardRemove={onCardRemove} />,
    );
    const cardEl = container.querySelector('[data-slot="kanban-card"]') as HTMLElement;
    cardEl.focus();
    cardEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    cardEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    expect(onCardClick).toHaveBeenCalledWith('card1', 'col1', 0);
    expect(onCardRemove).toHaveBeenCalledWith('card1');
  });
});

describe('KanbanColumn — list/listitem structure (G4-视角9-02)', () => {
  it('every direct child of the card list is a listitem (non-virtual branch)', () => {
    const { container } = render(
      <KanbanColumn column={column} board={board} collapsed={false} onToggleCollapse={() => {}} />,
    );
    const list = container.querySelector('[role="list"]')!;
    expect(list).toBeTruthy();
    const children = Array.from(list.children);
    expect(children.length).toBeGreaterThan(0);
    for (const child of children) {
      expect(child.getAttribute('role')).toBe('listitem');
    }
  });

  it('drop indicators inside the list are transparent (role=none), not bare children', () => {
    const { container } = render(
      <KanbanColumn
        column={column}
        board={board}
        collapsed={false}
        onToggleCollapse={() => {}}
        dropTargetCardIndex={0}
        dropClosestEdge="before"
      />,
    );
    const list = container.querySelector('[role="list"]')!;
    const indicator = list.querySelector('.nop-kanban-drop-indicator')!;
    expect(indicator).toBeTruthy();
    expect(indicator.getAttribute('role')).toBe('none');
  });
});

describe('KanbanColumnHeader — labeled group, no nested interactive (G4-视角9-01)', () => {
  it('header root is a group carrying the column title, not a button', () => {
    const { container } = render(
      <KanbanColumnHeader column={column} cardCount={1} collapsed={false} onToggleCollapse={() => {}} />,
    );
    const header = container.querySelector('[data-slot="kanban-column-header"]')!;
    expect(header.getAttribute('role')).toBe('group');
    expect(header.getAttribute('aria-label')).toBe('To Do');
  });

  it('buttons inside the header have no role=button ancestor', () => {
    const { container } = render(
      <KanbanColumnHeader column={column} cardCount={1} collapsed={false} onToggleCollapse={() => {}} />,
    );
    for (const button of Array.from(container.querySelectorAll('button'))) {
      expect(closestWithRole(button, 'button')).toBeNull();
    }
  });
});
