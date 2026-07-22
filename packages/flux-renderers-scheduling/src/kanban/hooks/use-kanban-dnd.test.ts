import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { BoardData } from '../kanban.types.js';
import { useKanbanDnd } from './use-kanban-dnd.js';
import { moveCard } from '../kanban-helpers.js';

const mocks = vi.hoisted(() => {
  return {
    monitorForElements: vi.fn(),
    draggable: vi.fn(() => () => {}),
    dropTargetForElements: vi.fn(),
    combine: vi.fn((...fns: (() => void)[]) => () => fns.forEach((fn) => fn())),
  };
});

vi.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  monitorForElements: mocks.monitorForElements,
  draggable: mocks.draggable,
  dropTargetForElements: mocks.dropTargetForElements,
}));

vi.mock('@atlaskit/pragmatic-drag-and-drop/combine', () => ({
  combine: mocks.combine,
}));

let capturedMonitor: { onDragStart?: (data: any) => void; onDrop?: (data: any) => void; canMonitor?: (data: any) => boolean } = {};
let capturedDropTargets: { canDrop?: (data: any) => boolean; onDrag?: (data: any) => void; onDragLeave?: () => void; onDragEnter?: () => void; getData?: () => Record<string, unknown> }[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  capturedMonitor = {};
  capturedDropTargets = [];
  mocks.monitorForElements.mockImplementation((args: Record<string, unknown>) => {
    capturedMonitor = args as any;
    return () => {};
  });
  mocks.dropTargetForElements.mockImplementation((args: Record<string, unknown>) => {
    capturedDropTargets.push(args as any);
    return () => {};
  });
});

const sampleBoard: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1', 'col2'], data: {}, meta: {} },
  col1: {
    id: 'col1', type: 'column', parentId: 'root',
    children: ['card1', 'card2'],
    data: { title: 'To Do' }, meta: {},
  },
  col2: {
    id: 'col2', type: 'column', parentId: 'root',
    children: ['card3'],
    data: { title: 'Done' }, meta: {},
  },
  card1: { id: 'card1', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 1' }, meta: {} },
  card2: { id: 'card2', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 2' }, meta: {} },
  card3: { id: 'card3', type: 'card', parentId: 'col2', children: [], data: { title: 'Task 3' }, meta: {} },
};

describe('useKanbanDnd', () => {
  it('returns registerCard and registerColumn functions', () => {
    const onBoardChange = vi.fn();
    const { result } = renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange }),
    );

    expect(result.current.registerCard).toBeInstanceOf(Function);
    expect(result.current.registerColumn).toBeInstanceOf(Function);
    expect(result.current.dragState.isDragging).toBe(false);
    expect(result.current.dragState.draggingCardId).toBe(null);
  });

  it('moveCard helper works correctly for cross-column move', () => {
    const result = moveCard(sampleBoard, 'card1', 'col2', 0);
    expect(result.col1.children).toEqual(['card2']);
    expect(result.col2.children).toEqual(['card1', 'card3']);
    expect(result.card1.parentId).toBe('col2');
  });

  it('moveCard helper is immutable', () => {
    const original = JSON.parse(JSON.stringify(sampleBoard));
    moveCard(sampleBoard, 'card1', 'col2', 0);
    expect(sampleBoard).toEqual(original);
  });
});

describe('useKanbanDnd callbacks', () => {
  it('calls onBoardChange when moveCard is applied', () => {
    const onBoardChange = vi.fn();
    renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange }),
    );

    const newBoard = moveCard(sampleBoard, 'card1', 'col2', 0);
    expect(newBoard.card1.parentId).toBe('col2');
  });
});

describe('useKanbanDnd lifecycle - 14-02', () => {
  it('monitors DnD events on mount and cleans up on unmount', () => {
    const onBoardChange = vi.fn();
    const { unmount } = renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange }),
    );

    expect(mocks.monitorForElements).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('transitions dragState from idle to dragging on onDragStart', () => {
    const onBoardChange = vi.fn();
    const { result } = renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange }),
    );

    expect(result.current.dragState.isDragging).toBe(false);
    expect(result.current.dragState.draggingCardId).toBeNull();

    act(() => {
      capturedMonitor.onDragStart?.({
        source: { data: { type: 'kanban-card', cardId: 'card1', columnId: 'col1' } },
      });
    });

    expect(result.current.dragState.isDragging).toBe(true);
    expect(result.current.dragState.draggingCardId).toBe('card1');
    expect(result.current.dragState.sourceColumnId).toBe('col1');
  });

  it('transitions dragState back to idle and calls onBoardChange on onDrop', () => {
    const onBoardChange = vi.fn();
    const { result } = renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange }),
    );

    act(() => {
      capturedMonitor.onDragStart?.({
        source: { data: { type: 'kanban-card', cardId: 'card1', columnId: 'col1' } },
      });
    });
    expect(result.current.dragState.isDragging).toBe(true);

    act(() => {
      capturedMonitor.onDrop?.({
        source: { data: { type: 'kanban-card', cardId: 'card1', columnId: 'col1' } },
        location: {
          current: {
            dropTargets: [
              { data: { columnId: 'col2', dropIndex: 0, type: 'kanban-card-target' } },
            ],
          },
        },
      });
    });

    expect(result.current.dragState.isDragging).toBe(false);
    expect(result.current.dragState.draggingCardId).toBeNull();
    expect(onBoardChange).toHaveBeenCalledTimes(1);
  });

  it('calls onCardMove when provided during onDrop', () => {
    const onBoardChange = vi.fn();
    const onCardMove = vi.fn();
    renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange, onCardMove }),
    );

    act(() => {
      capturedMonitor.onDrop?.({
        source: { data: { type: 'kanban-card', cardId: 'card1', columnId: 'col1' } },
        location: {
          current: {
            dropTargets: [
              { data: { columnId: 'col2', dropIndex: 0, type: 'kanban-card-target' } },
            ],
          },
        },
      });
    });

    expect(onCardMove).toHaveBeenCalledTimes(1);
    expect(onCardMove).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'card1',
        fromColumnId: 'col1',
        toColumnId: 'col2',
        toIndex: 0,
      }),
    );
  });

  it('handles drop with no target (drag cancellation)', () => {
    const onBoardChange = vi.fn();
    const { result } = renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange }),
    );

    act(() => {
      capturedMonitor.onDrop?.({
        source: { data: { type: 'kanban-card', cardId: 'card1', columnId: 'col1' } },
        location: { current: { dropTargets: [] } },
      });
    });

    expect(result.current.dragState.isDragging).toBe(false);
    expect(onBoardChange).not.toHaveBeenCalled();
  });

  it('handles drop with missing target columnId or dropIndex', () => {
    const onBoardChange = vi.fn();
    renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange }),
    );

    act(() => {
      capturedMonitor.onDrop?.({
        source: { data: { type: 'kanban-card', cardId: 'card1', columnId: 'col1' } },
        location: {
          current: {
            dropTargets: [
              { data: { columnId: null, dropIndex: null, type: 'kanban-card-target' } },
            ],
          },
        },
      });
    });

    expect(onBoardChange).not.toHaveBeenCalled();
  });

  it('does nothing when dropping on the same position', () => {
    const onBoardChange = vi.fn();
    renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange }),
    );

    act(() => {
      capturedMonitor.onDrop?.({
        source: { data: { type: 'kanban-card', cardId: 'card1', columnId: 'col1', cardIndex: 0 } },
        location: {
          current: {
            dropTargets: [
              { data: { columnId: 'col1', dropIndex: 0, cardIndex: 0, type: 'kanban-card-target' } },
            ],
          },
        },
      });
    });

    expect(onBoardChange).not.toHaveBeenCalled();
  });

  it('prevents column drop when wipOverLimitColumns contains the target column', () => {
    const onBoardChange = vi.fn();
    const wipOverLimitColumns = new Set(['col2']);
    const { result } = renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange, wipOverLimitColumns }),
    );

    act(() => {
      const el = document.createElement('div');
      const cleanup = result.current.registerColumn(el, 'col2', 3);
      cleanup();
    });

    const colDropTarget = capturedDropTargets.find(
      (dt) => dt.getData?.().type === 'kanban-column',
    );
    expect(colDropTarget).toBeDefined();
    expect(colDropTarget!.canDrop?.({ source: { data: { type: 'kanban-card' } } })).toBe(false);
  });

  it('allows column drop when wipOverLimitColumns does not contain target', () => {
    const onBoardChange = vi.fn();
    const wipOverLimitColumns = new Set(['col1']);
    const { result } = renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange, wipOverLimitColumns }),
    );

    act(() => {
      const el = document.createElement('div');
      const cleanup = result.current.registerColumn(el, 'col2', 3);
      cleanup();
    });

    const colDropTarget = capturedDropTargets.find(
      (dt) => dt.getData?.().type === 'kanban-column',
    );
    expect(colDropTarget).toBeDefined();
    expect(colDropTarget!.canDrop?.({ source: { data: { type: 'kanban-card' } } })).toBe(true);
  });

  it('handles registerCard onDragLeave for active card target index', () => {
    const onBoardChange = vi.fn();
    const { result } = renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange }),
    );

    act(() => {
      const el = document.createElement('div');
      const cleanup = result.current.registerCard(el, 'card1', 'col1', 0);
      cleanup();
    });

    const cardTarget = capturedDropTargets.find(
      (dt) => dt.getData?.().type === 'kanban-card-target',
    );
    expect(cardTarget).toBeDefined();
  });

  it('moveCardKeyboard triggers onCardMove with correct overLimit flag', () => {
    const onBoardChange = vi.fn();
    const onCardMove = vi.fn();
    const { result } = renderHook(() =>
      useKanbanDnd({ boardData: sampleBoard, onBoardChange, onCardMove, wipOverLimitColumns: new Set(['col2']) }),
    );

    act(() => {
      result.current.moveCardKeyboard(sampleBoard, 'card1', 'col1', 'col2', 0, 0);
    });

    expect(onBoardChange).toHaveBeenCalled();
    expect(onCardMove).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'card1',
        fromColumnId: 'col1',
        toColumnId: 'col2',
        overLimit: true,
      }),
    );
  });
});
