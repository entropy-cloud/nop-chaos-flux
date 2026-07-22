import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { BoardData } from '../kanban.types.js';
import { useColumnDnd } from './use-column-dnd.js';
import { moveColumn } from '../kanban-helpers.js';

const mocks = vi.hoisted(() => {
  return {
    monitorForElements: vi.fn(),
    draggable: vi.fn(() => () => {}),
    dropTargetForElements: vi.fn(() => () => {}),
  };
});

vi.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  monitorForElements: mocks.monitorForElements,
  draggable: mocks.draggable,
  dropTargetForElements: mocks.dropTargetForElements,
}));

let capturedMonitor: { onDrop?: (data: any) => void; canMonitor?: (data: any) => boolean } = {};

beforeEach(() => {
  vi.clearAllMocks();
  capturedMonitor = {};
  mocks.monitorForElements.mockImplementation((args: { onDrop?: (data: any) => void; canMonitor?: (data: any) => boolean }) => {
    capturedMonitor = args;
    return () => {};
  });
});

const sampleBoard: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1', 'col2', 'col3'], data: {}, meta: {} },
  col1: { id: 'col1', type: 'column', parentId: 'root', children: [], data: { title: 'A' }, meta: {} },
  col2: { id: 'col2', type: 'column', parentId: 'root', children: [], data: { title: 'B' }, meta: {} },
  col3: { id: 'col3', type: 'column', parentId: 'root', children: [], data: { title: 'C' }, meta: {} },
};

describe('useColumnDnd', () => {
  it('returns registerColumnHeader and registerBoardDropZone functions', () => {
    const onBoardChange = vi.fn();
    const { result } = renderHook(() =>
      useColumnDnd({ boardData: sampleBoard, onBoardChange }),
    );

    expect(result.current.registerColumnHeader).toBeInstanceOf(Function);
    expect(result.current.registerBoardDropZone).toBeInstanceOf(Function);
  });

  it('moveColumn helper reorders columns correctly', () => {
    const result = moveColumn(sampleBoard, 'col3', 0);
    expect(result.root.children).toEqual(['col3', 'col1', 'col2']);
  });

  it('moveColumn helper is immutable', () => {
    const original = JSON.parse(JSON.stringify(sampleBoard));
    moveColumn(sampleBoard, 'col3', 0);
    expect(sampleBoard).toEqual(original);
  });

  it('does not register monitor when enabled is false', () => {
    const onBoardChange = vi.fn();
    renderHook(() =>
      useColumnDnd({ boardData: sampleBoard, onBoardChange, enabled: false }),
    );

    expect(mocks.monitorForElements).not.toHaveBeenCalled();
  });

  it('returns noop cleanup when registerColumnHeader called with enabled false', () => {
    const onBoardChange = vi.fn();
    const { result } = renderHook(() =>
      useColumnDnd({ boardData: sampleBoard, onBoardChange, enabled: false }),
    );

    act(() => {
      const el = document.createElement('div');
      const cleanup = result.current.registerColumnHeader(el, 'col1');
      expect(cleanup).toBeInstanceOf(Function);
      cleanup();
    });

    expect(mocks.draggable).not.toHaveBeenCalled();
  });

  it('handles onDrop with no target (drag cancellation)', () => {
    const onBoardChange = vi.fn();
    renderHook(() =>
      useColumnDnd({ boardData: sampleBoard, onBoardChange }),
    );

    act(() => {
      capturedMonitor.onDrop?.({
        source: { data: { type: 'kanban-column-header', columnId: 'col1' } },
        location: { current: { dropTargets: [] } },
      });
    });

    expect(onBoardChange).not.toHaveBeenCalled();
  });

  it('handles onDrop with missing targetIndex', () => {
    const onBoardChange = vi.fn();
    renderHook(() =>
      useColumnDnd({ boardData: sampleBoard, onBoardChange }),
    );

    act(() => {
      capturedMonitor.onDrop?.({
        source: { data: { type: 'kanban-column-header', columnId: 'col1' } },
        location: {
          current: {
            dropTargets: [
              { data: { columnIndex: null, type: 'kanban-column-drop-zone' } },
            ],
          },
        },
      });
    });

    expect(onBoardChange).not.toHaveBeenCalled();
  });

  it('handles onDrop with missing root in board data', () => {
    const noRootBoard: BoardData = {
      col1: { id: 'col1', type: 'column', parentId: 'root', children: [], data: { title: 'A' }, meta: {} },
    };
    const onBoardChange = vi.fn();
    renderHook(() =>
      useColumnDnd({ boardData: noRootBoard, onBoardChange }),
    );

    act(() => {
      capturedMonitor.onDrop?.({
        source: { data: { type: 'kanban-column-header', columnId: 'col1' } },
        location: {
          current: {
            dropTargets: [
              { data: { columnIndex: 0, type: 'kanban-column-drop-zone' } },
            ],
          },
        },
      });
    });

    expect(onBoardChange).not.toHaveBeenCalled();
  });

  it('does nothing when dropping at same position', () => {
    const onBoardChange = vi.fn();
    renderHook(() =>
      useColumnDnd({ boardData: sampleBoard, onBoardChange }),
    );

    act(() => {
      capturedMonitor.onDrop?.({
        source: { data: { type: 'kanban-column-header', columnId: 'col1' } },
        location: {
          current: {
            dropTargets: [
              { data: { columnIndex: 0, type: 'kanban-column-drop-zone' } },
            ],
          },
        },
      });
    });

    expect(onBoardChange).not.toHaveBeenCalled();
  });

  it('calls onColumnReorder when provided', () => {
    const onBoardChange = vi.fn();
    const onColumnReorder = vi.fn();
    renderHook(() =>
      useColumnDnd({ boardData: sampleBoard, onBoardChange, onColumnReorder }),
    );

    act(() => {
      capturedMonitor.onDrop?.({
        source: { data: { type: 'kanban-column-header', columnId: 'col1' } },
        location: {
          current: {
            dropTargets: [
              { data: { columnIndex: 2, type: 'kanban-column-drop-zone' } },
            ],
          },
        },
      });
    });

    expect(onBoardChange).toHaveBeenCalled();
    expect(onColumnReorder).toHaveBeenCalledWith({
      columnId: 'col1',
      fromIndex: 0,
      toIndex: 2,
    });
  });
});
