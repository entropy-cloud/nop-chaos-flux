import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useKanbanColumnResize, type ColumnWidthMap } from './use-kanban-column-resize.js';

function pointerAt(clientX: number): React.PointerEvent {
  return { clientX, preventDefault: () => {} } as unknown as React.PointerEvent;
}

function fire(type: string, clientX: number) {
  document.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }));
}

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

// Plan 862 L5: drag lifecycle must be torn down by pointercancel and by
// unmount — no stale document listeners writing widths afterwards.
describe('useKanbanColumnResize drag cleanup (plan 862 L5)', () => {
  it('pointercancel ends the drag: later pointermove does not resize, isResizing false', () => {
    const { result } = renderHook(() =>
      useKanbanColumnResize({ minWidth: 100, maxWidth: 600, defaultWidth: 280 }),
    );

    act(() => {
      result.current.handleResizeStart(pointerAt(100), 'col-a');
    });
    expect(result.current.isResizing).toBe(true);

    act(() => {
      fire('pointercancel', 150);
    });
    expect(result.current.isResizing).toBe(false);

    const before = result.current.getWidth('col-a');
    act(() => {
      fire('pointermove', 400);
    });
    expect(result.current.getWidth('col-a')).toBe(before);
  });

  it('unmount mid-drag: a late pointerup does not invoke onWidthsChange', () => {
    const onWidthsChange = vi.fn((widths: ColumnWidthMap) => widths);
    const { result, unmount } = renderHook(() =>
      useKanbanColumnResize({
        minWidth: 100,
        maxWidth: 600,
        defaultWidth: 280,
        columnWidths: {},
        onWidthsChange,
      }),
    );

    act(() => {
      result.current.handleResizeStart(pointerAt(100), 'col-a');
    });
    act(() => {
      unmount();
    });

    act(() => {
      fire('pointerup', 300);
    });
    expect(onWidthsChange).not.toHaveBeenCalled();
  });
});
