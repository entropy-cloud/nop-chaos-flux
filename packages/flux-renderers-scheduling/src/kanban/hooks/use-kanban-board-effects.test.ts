import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { t } from '@nop-chaos/flux-i18n';
import { useKanbanBoardEffects } from './use-kanban-board-effects.js';
import type { BoardData } from '../kanban.types.js';

const boardData: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1'], data: {}, meta: {} },
  col1: { id: 'col1', type: 'column', parentId: 'root', children: ['card1'], data: { title: 'To Do' }, meta: {} },
  card1: { id: 'card1', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 1' }, meta: {} },
};

function makeOptions(overrides?: Partial<Parameters<typeof useKanbanBoardEffects>[0]>) {
  const setDndAnnouncement = vi.fn();
  return {
    boardRef: { current: document.createElement('div') },
    draggable: true,
    boardDataRef: { current: boardData },
    columns: [{ id: 'col1', title: 'To Do', children: ['card1'] }],
    moveCardKeyboard: vi.fn(),
    keyboardMoveCard: null,
    setKeyboardMoveCard: vi.fn(),
    setDndAnnouncement,
    dragState: { isDragging: false, draggingCardId: null },
    dropState: { targetColumnId: null, targetCardIndex: null, closestEdge: null },
    boardData,
    handleUndo: vi.fn(),
    handleRedo: vi.fn(),
    ...overrides,
  };
}

describe('useKanbanBoardEffects — dragging aria-live announcement (2-17)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('announces the dragging card through the flux.kanban translation key, not a hardcoded string', () => {
    const cardEl = document.createElement('div');
    cardEl.setAttribute('data-card-id', 'card1');
    const root = document.createElement('div');
    root.appendChild(cardEl);
    document.body.appendChild(root);
    const options = makeOptions({
      boardRef: { current: root },
      dragState: { isDragging: true, draggingCardId: 'card1' },
    });

    renderHook(() => useKanbanBoardEffects(options));

    act(() => {
      // force the effect chain (deps changed since mount) — the effect runs
      // on mount with the initial dragState, which is already dragging.
    });

    expect(options.setDndAnnouncement).toHaveBeenCalledWith(
      t('scheduling.kanban.draggingCard', { title: 'Task 1' }),
    );
    expect(options.setDndAnnouncement).not.toHaveBeenCalledWith('Dragging card: Task 1');
  });

  it('announces the raw card id when the card has no title', () => {
    const boardDataNoTitle: BoardData = {
      ...boardData,
      card1: { ...boardData.card1, data: {} },
    };
    const cardEl = document.createElement('div');
    cardEl.setAttribute('data-card-id', 'card1');
    const root = document.createElement('div');
    root.appendChild(cardEl);
    document.body.appendChild(root);
    const options = makeOptions({
      boardRef: { current: root },
      boardData: boardDataNoTitle,
      boardDataRef: { current: boardDataNoTitle },
      dragState: { isDragging: true, draggingCardId: 'card1' },
    });

    renderHook(() => useKanbanBoardEffects(options));

    expect(options.setDndAnnouncement).toHaveBeenCalledWith(
      t('scheduling.kanban.draggingCard', { title: 'card1' }),
    );
  });

  it('clears the announcement when the drag ends', () => {
    const cardEl = document.createElement('div');
    cardEl.setAttribute('data-card-id', 'card1');
    const root = document.createElement('div');
    root.appendChild(cardEl);
    document.body.appendChild(root);
    const options = makeOptions({ boardRef: { current: root } });
    const { rerender } = renderHook(() => useKanbanBoardEffects(options));

    // Transition into dragging, then out — the announcement is cleared.
    options.dragState = { isDragging: true, draggingCardId: 'card1' };
    rerender();
    expect(options.setDndAnnouncement).toHaveBeenCalledWith(
      t('scheduling.kanban.draggingCard', { title: 'Task 1' }),
    );

    options.dragState = { isDragging: false, draggingCardId: null };
    rerender();
    expect(options.setDndAnnouncement).toHaveBeenLastCalledWith('');
  });
});
