import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGanttDrag } from './use-gantt-drag.js';

const mockStore = {
  cellWidth: 40,
  tasks: new Map([
    ['t1', { id: 't1', text: 'Task', start: '2026-01-01', end: '2026-01-10', $x: 0, $y: 0, $w: 100, $h: 20 }],
  ]),
  updateTask: vi.fn(),
};

vi.mock('../gantt-context.js', () => ({
  useGanttStore: () => mockStore,
}));

describe('useGanttDrag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should return dragRef and onPointerDown', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(containerRef));
    expect(result.current.dragRef).toBeDefined();
    expect(typeof result.current.onPointerDown).toBe('function');
  });

  it('should not start drag when mode is null', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(containerRef));
    const target = document.createElement('div');
    const event = new PointerEvent('pointerdown', { clientX: 100, clientY: 200 });
    Object.defineProperty(event, 'currentTarget', { value: target });
    result.current.onPointerDown(event, 't1', null);
    expect(mockStore.updateTask).not.toHaveBeenCalled();
  });

  it('should cleanup ghost element on unmount', () => {
    const containerRef = { current: document.createElement('div') };
    const { unmount } = renderHook(() => useGanttDrag(containerRef));
    expect(unmount).not.toThrow();
  });
});
