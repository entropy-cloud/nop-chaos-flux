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

function createTarget() {
  const el = document.createElement('div');
  el.style.width = '100px';
  el.style.height = '20px';
  el.classList.add('nop-gantt-bar-task');
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    top: 100, left: 100, bottom: 120, right: 200,
    width: 100, height: 20, x: 100, y: 100,
    toJSON: () => ({}),
  });
  document.body.appendChild(el);
  return el;
}

describe('useGanttDrag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should return dragRef and onPointerDown', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(mockStore as any, containerRef));
    expect(result.current.dragRef).toBeDefined();
    expect(typeof result.current.onPointerDown).toBe('function');
  });

  it('should not start drag when mode is falsy', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(mockStore as any, containerRef));
    expect(typeof result.current.onPointerDown).toBe('function');
  });

  it('should create ghost element on pointer down with move mode', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(mockStore as any, containerRef));
    const target = createTarget();

    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 't1', 'move');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }));

    const ghost = document.querySelector('.nop-gantt-bar-ghost');
    expect(ghost).not.toBeNull();
    expect((ghost as HTMLElement).style.position).toBe('fixed');
    expect((ghost as HTMLElement).style.pointerEvents).toBe('none');
  });

  it('should follow pointer on move', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(mockStore as any, containerRef));
    const target = createTarget();

    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 't1', 'move');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }));

    const ghost = document.querySelector('.nop-gantt-bar-ghost') as HTMLElement;
    expect(ghost).not.toBeNull();

    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 180, clientY: 200 }));
    expect(ghost.style.transform).toContain('translateX(80px');
  });

  it('should move task on pointer up (move mode)', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(mockStore as any, containerRef));
    const target = createTarget();

    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 't1', 'move');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }));

    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 180, clientY: 200 }));
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 180, clientY: 200 }));

    expect(mockStore.updateTask).toHaveBeenCalledWith('t1', expect.objectContaining({
      start: expect.any(String),
      end: expect.any(String),
    }));
  });

  it('should not call updateTask when dayDelta is 0', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(mockStore as any, containerRef));
    const target = createTarget();

    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 't1', 'move');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }));

    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 100, clientY: 200 }));
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 100, clientY: 200 }));

    expect(mockStore.updateTask).not.toHaveBeenCalled();
  });

  it('should handle resize-end mode', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(mockStore as any, containerRef));
    const target = createTarget();

    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 't1', 'resize-end');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }));

    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 180, clientY: 200 }));
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 180, clientY: 200 }));

    expect(mockStore.updateTask).toHaveBeenCalledWith('t1', { end: expect.any(String) });
  });

  it('should handle resize-start mode', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(mockStore as any, containerRef));
    const target = createTarget();

    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 't1', 'resize-start');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 150, clientY: 200, bubbles: true }));

    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 230, clientY: 200 }));
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 230, clientY: 200 }));

    expect(mockStore.updateTask).toHaveBeenCalledWith('t1', { start: expect.any(String) });
  });

  it('should cancel drag on Escape key', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(mockStore as any, containerRef));
    const target = createTarget();

    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 't1', 'move');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }));

    expect(document.querySelector('.nop-gantt-bar-ghost')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(document.querySelector('.nop-gantt-bar-ghost')).toBeNull();
    expect(mockStore.updateTask).not.toHaveBeenCalled();
  });

  it('should cleanup ghost on unmount', () => {
    const containerRef = { current: document.createElement('div') };
    const { unmount } = renderHook(() => useGanttDrag(mockStore as any, containerRef));
    expect(unmount).not.toThrow();
  });

  it('should cleanup document listeners on unmount during active drag', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const containerRef = { current: document.createElement('div') };
    const { result, unmount } = renderHook(() => useGanttDrag(mockStore as any, containerRef));

    const target = createTarget();
    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 't1', 'move');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }));

    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    addSpy.mockClear();

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('should call onCommit on pointer up with changes', () => {
    const containerRef = { current: document.createElement('div') };
    const onCommit = vi.fn();
    const { result } = renderHook(() => useGanttDrag(mockStore as any, containerRef, onCommit));
    const target = createTarget();

    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 't1', 'move');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }));

    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 180, clientY: 200 }));
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 180, clientY: 200 }));

    expect(onCommit).toHaveBeenCalledWith('t1', expect.objectContaining({
      start: expect.any(String),
      end: expect.any(String),
    }));
  });

  it('should use translateX only (no vertical drift)', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(mockStore as any, containerRef));
    const target = createTarget();

    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 't1', 'move');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }));

    const ghost = document.querySelector('.nop-gantt-bar-ghost') as HTMLElement;
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 180, clientY: 300 }));

    expect(ghost.style.transform).not.toContain('translateY');
    expect(ghost.style.transform).toContain('translateX');
  });

  it('should reduce original bar opacity to 0.3 during drag', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(mockStore as any, containerRef));
    const target = createTarget();

    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 't1', 'move');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }));

    expect(target.style.opacity).toBe('0.3');
  });

  it('should not call updateTask when task not found in store', () => {
    const containerRef = { current: document.createElement('div') };
    const unknownStore = {
      cellWidth: 40,
      tasks: new Map(),
      updateTask: vi.fn(),
    };
    const { result } = renderHook(() => useGanttDrag(unknownStore as any, containerRef));
    const target = createTarget();

    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 'unknown-task', 'move');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }));

    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 180, clientY: 200 }));
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 180, clientY: 200 }));

    expect(unknownStore.updateTask).not.toHaveBeenCalled();
  });

  it('should not apply resize-end when end would be <= start', () => {
    const store = {
      cellWidth: 40,
      tasks: new Map([
        ['t1', { id: 't1', text: 'Task', start: '2026-01-05', end: '2026-01-05', $x: 0, $y: 0, $w: 100, $h: 20 }],
      ]),
      updateTask: vi.fn(),
    };
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(store as any, containerRef));
    const target = createTarget();

    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 't1', 'resize-end');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }));

    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 100 - 40, clientY: 200 }));
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 100 - 40, clientY: 200 }));

    expect(store.updateTask).not.toHaveBeenCalled();
  });

  it('should not apply resize-start when start would be >= end', () => {
    const store = {
      cellWidth: 40,
      tasks: new Map([
        ['t1', { id: 't1', text: 'Task', start: '2026-01-05', end: '2026-01-10', $x: 0, $y: 0, $w: 100, $h: 20 }],
      ]),
      updateTask: vi.fn(),
    };
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() => useGanttDrag(store as any, containerRef));
    const target = createTarget();

    target.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onPointerDown(e, 't1', 'resize-start');
    });
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 200, bubbles: true }));

    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 100 + 200, clientY: 200 }));
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 100 + 200, clientY: 200 }));

    expect(store.updateTask).not.toHaveBeenCalled();
  });

  it('should guard pointerMove with null dragRef', () => {
    const containerRef = { current: document.createElement('div') };
    renderHook(() => useGanttDrag(mockStore as any, containerRef));

    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 180, clientY: 200 }));

    expect(document.querySelector('.nop-gantt-bar-ghost')).toBeNull();
  });
});
