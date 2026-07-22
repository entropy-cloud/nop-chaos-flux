import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKanbanColumnResize } from './use-kanban-column-resize.js';

describe('useKanbanColumnResize', () => {
  it('returns default width for unknown column', () => {
    const { result } = renderHook(() =>
      useKanbanColumnResize({ minWidth: 100, maxWidth: 800, defaultWidth: 280 }),
    );
    expect(result.current.getWidth('unknown')).toBe(280);
  });

  it('returns stored width when set', () => {
    const { result } = renderHook(() =>
      useKanbanColumnResize({ minWidth: 100, maxWidth: 800, defaultWidth: 280, columnWidths: { col1: 350 } }),
    );
    expect(result.current.getWidth('col1')).toBe(350);
  });

  it('clamps width to minWidth', () => {
    const { result } = renderHook(() =>
      useKanbanColumnResize({ minWidth: 200, maxWidth: 600, defaultWidth: 280, columnWidths: { col1: 50 } }),
    );
    expect(result.current.getWidth('col1')).toBe(200);
  });

  it('clamps width to maxWidth', () => {
    const { result } = renderHook(() =>
      useKanbanColumnResize({ minWidth: 200, maxWidth: 600, defaultWidth: 280, columnWidths: { col1: 1000 } }),
    );
    expect(result.current.getWidth('col1')).toBe(600);
  });

  it('returns defaultWidth when no stored width and columnWidths empty', () => {
    const { result } = renderHook(() =>
      useKanbanColumnResize({ minWidth: 100, maxWidth: 800, defaultWidth: 320 }),
    );
    expect(result.current.getWidth('col1')).toBe(320);
  });

  it('sets initial resizing state to null', () => {
    const { result } = renderHook(() =>
      useKanbanColumnResize({ minWidth: 100, maxWidth: 800, defaultWidth: 280 }),
    );
    expect(result.current.isResizing).toBe(false);
    expect(result.current.resizing).toBeNull();
  });

  it('handleResizeStart sets resizing state', () => {
    const { result } = renderHook(() =>
      useKanbanColumnResize({ minWidth: 100, maxWidth: 800, defaultWidth: 280 }),
    );
    expect(result.current.isResizing).toBe(false);
    expect(result.current.resizing).toBeNull();
    const mockEvent = { preventDefault: vi.fn(), clientX: 100, pointerId: 1 } as unknown as React.PointerEvent;
    act(() => {
      result.current.handleResizeStart(mockEvent, 'col1');
    });
    expect(result.current.isResizing).toBe(true);
    expect(result.current.resizing).toBe('col1');
  });

  it('works with minWidth = maxWidth for fixed columns', () => {
    const { result } = renderHook(() =>
      useKanbanColumnResize({ minWidth: 300, maxWidth: 300, defaultWidth: 300 }),
    );
    expect(result.current.getWidth('col1')).toBe(300);
  });

  it('updates width via initial columnWidths', () => {
    const { result, rerender } = renderHook(
      ({ widths }) => useKanbanColumnResize({ minWidth: 100, maxWidth: 800, defaultWidth: 280, columnWidths: widths }),
      { initialProps: { widths: { col1: 350 } as Record<string, number> } },
    );
    expect(result.current.getWidth('col1')).toBe(350);
    rerender({ widths: { col1: 500 } });
    expect(result.current.getWidth('col1')).toBe(500);
  });

  it('calls onWidthsChange after resize completes', () => {
    const onWidthsChange = vi.fn();
    const { result } = renderHook(() =>
      useKanbanColumnResize({ minWidth: 100, maxWidth: 800, defaultWidth: 280, onWidthsChange, columnWidths: { col1: 300 } }),
    );
    const mockEvent = { preventDefault: vi.fn(), clientX: 100, pointerId: 1 } as unknown as React.PointerEvent;
    act(() => {
      result.current.handleResizeStart(mockEvent, 'col1');
    });
    expect(result.current.isResizing).toBe(true);
    expect(result.current.resizing).toBe('col1');

    act(() => {
      document.dispatchEvent(new PointerEvent('pointerup'));
    });
    expect(result.current.isResizing).toBe(false);
    expect(onWidthsChange).toHaveBeenCalled();
    expect(onWidthsChange.mock.calls[0][0]).toEqual({ col1: 300 });
  });

  it('calls onWidthsChange during pointer move when using external widths', () => {
    const onWidthsChange = vi.fn();
    const { result } = renderHook(() =>
      useKanbanColumnResize({ minWidth: 100, maxWidth: 800, defaultWidth: 280, onWidthsChange, columnWidths: { col1: 300 } }),
    );
    const mockEvent = { preventDefault: vi.fn(), clientX: 100, pointerId: 1 } as unknown as React.PointerEvent;
    act(() => {
      result.current.handleResizeStart(mockEvent, 'col1');
    });
    act(() => {
      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 150 }));
    });
    expect(onWidthsChange).toHaveBeenCalledWith({ col1: 350 });
  });
});
