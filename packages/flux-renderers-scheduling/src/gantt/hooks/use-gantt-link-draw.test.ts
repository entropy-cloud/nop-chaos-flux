import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGanttLinkDraw } from './use-gantt-link-draw.js';

const mockStore = {
  tasks: new Map([
    ['t1', { id: 't1', text: 'Task 1', $x: 0, $y: 0, $w: 100, $h: 20 }],
    ['t2', { id: 't2', text: 'Task 2', $x: 200, $y: 0, $w: 100, $h: 20 }],
  ]),
  addLink: vi.fn(),
};

describe('useGanttLinkDraw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should return link drawing functions', () => {
    const svgRef = { current: document.createElementNS('http://www.w3.org/2000/svg', 'svg') };
    const { result } = renderHook(() => useGanttLinkDraw(mockStore as any, svgRef));
    expect(typeof result.current.onLinkHandlePointerDown).toBe('function');
    expect(typeof result.current.startKeyboardLink).toBe('function');
    expect(typeof result.current.completeKeyboardLink).toBe('function');
    expect(typeof result.current.cancelLink).toBe('function');
    expect(result.current.isLinking).toBe(false);
  });

  it('should create temp line on pointer down', async () => {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('width', '800');
    svgEl.setAttribute('height', '600');
    document.body.appendChild(svgEl);
    const svgRef = { current: svgEl };
    const { result } = renderHook(() => useGanttLinkDraw(mockStore as any, svgRef));

    const handle = document.createElement('div');
    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onLinkHandlePointerDown(e, 't1', 'end');
    });
    document.body.appendChild(handle);

    act(() => {
      handle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
    });

    await waitFor(() => expect(result.current.isLinking).toBe(true));
    expect(svgEl.querySelector('line')).not.toBeNull();
  });

  it('should update temp line on pointer move and add link on pointer up over target', async () => {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('width', '800');
    svgEl.setAttribute('height', '600');
    document.body.appendChild(svgEl);
    const svgRef = { current: svgEl };
    const { result } = renderHook(() => useGanttLinkDraw(mockStore as any, svgRef));

    const handle = document.createElement('div');
    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onLinkHandlePointerDown(e, 't1', 'end');
    });
    document.body.appendChild(handle);

    act(() => {
      handle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
    });

    await waitFor(() => expect(result.current.isLinking).toBe(true));

    act(() => {
      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 300, clientY: 100 }));
    });

    const taskBar = document.createElement('div');
    taskBar.setAttribute('data-task-id', 't2');
    document.body.appendChild(taskBar);

    vi.spyOn(document, 'elementFromPoint').mockReturnValue(taskBar);

    act(() => {
      document.dispatchEvent(new PointerEvent('pointerup', { clientX: 300, clientY: 100 }));
    });

    expect(mockStore.addLink).toHaveBeenCalledWith('t1', 't2', 'finish_to_start');
  });

  it('should not add link when target is the source task (self-link)', async () => {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('width', '800');
    svgEl.setAttribute('height', '600');
    document.body.appendChild(svgEl);
    const svgRef = { current: svgEl };
    const { result } = renderHook(() => useGanttLinkDraw(mockStore as any, svgRef));

    const handle = document.createElement('div');
    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onLinkHandlePointerDown(e, 't1', 'end');
    });
    document.body.appendChild(handle);

    act(() => {
      handle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
    });

    await waitFor(() => expect(result.current.isLinking).toBe(true));

    const taskBar = document.createElement('div');
    taskBar.setAttribute('data-task-id', 't1');
    document.body.appendChild(taskBar);

    vi.spyOn(document, 'elementFromPoint').mockReturnValue(taskBar);

    act(() => {
      document.dispatchEvent(new PointerEvent('pointerup', { clientX: 200, clientY: 100 }));
    });

    expect(mockStore.addLink).not.toHaveBeenCalled();
  });

  it('should cancel link via cancelLink', () => {
    const svgRef = { current: document.createElementNS('http://www.w3.org/2000/svg', 'svg') };
    const { result } = renderHook(() => useGanttLinkDraw(mockStore as any, svgRef));
    result.current.cancelLink();
    expect(result.current.isLinking).toBe(false);
  });

  it('should cancel link on Escape key', async () => {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('width', '800');
    svgEl.setAttribute('height', '600');
    document.body.appendChild(svgEl);
    const svgRef = { current: svgEl };
    const { result } = renderHook(() => useGanttLinkDraw(mockStore as any, svgRef));

    const handle = document.createElement('div');
    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onLinkHandlePointerDown(e, 't1', 'end');
    });
    document.body.appendChild(handle);

    act(() => {
      handle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
    });

    await waitFor(() => expect(result.current.isLinking).toBe(true));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    await waitFor(() => expect(result.current.isLinking).toBe(false));
  });

  it('should add link via startKeyboardLink and completeKeyboardLink', async () => {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('width', '800');
    svgEl.setAttribute('height', '600');
    document.body.appendChild(svgEl);
    const svgRef = { current: svgEl };
    const { result } = renderHook(() => useGanttLinkDraw(mockStore as any, svgRef));

    act(() => {
      result.current.startKeyboardLink('t1');
    });

    await waitFor(() => expect(result.current.isLinking).toBe(true));
    expect(svgEl.querySelector('line')).not.toBeNull();

    act(() => {
      result.current.completeKeyboardLink('t2');
    });

    expect(mockStore.addLink).toHaveBeenCalledWith('t1', 't2', 'finish_to_start');
  });

  it('should not add link on completeKeyboardLink with same task', async () => {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('width', '800');
    svgEl.setAttribute('height', '600');
    document.body.appendChild(svgEl);
    const svgRef = { current: svgEl };
    const { result } = renderHook(() => useGanttLinkDraw(mockStore as any, svgRef));

    act(() => {
      result.current.startKeyboardLink('t1');
    });
    await waitFor(() => expect(result.current.isLinking).toBe(true));

    act(() => {
      result.current.completeKeyboardLink('t1');
    });

    expect(mockStore.addLink).not.toHaveBeenCalled();
  });

  it('should do nothing when svgRef is null', () => {
    const { result } = renderHook(() => useGanttLinkDraw(mockStore as any, { current: null }));
    result.current.startKeyboardLink('t1');
    expect(result.current.isLinking).toBe(false);
  });

    it('should call onCommit when link is created via pointer', async () => {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('width', '800');
    svgEl.setAttribute('height', '600');
    document.body.appendChild(svgEl);
    const onCommit = vi.fn();
    const svgRef = { current: svgEl };
    const { result } = renderHook(() => useGanttLinkDraw(mockStore as any, svgRef, onCommit));

    const handle = document.createElement('div');
    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onLinkHandlePointerDown(e, 't1', 'end');
    });
    document.body.appendChild(handle);

    act(() => {
      handle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
    });

    await waitFor(() => expect(result.current.isLinking).toBe(true));

    const taskBar = document.createElement('div');
    taskBar.setAttribute('data-task-id', 't2');
    document.body.appendChild(taskBar);

    vi.spyOn(document, 'elementFromPoint').mockReturnValue(taskBar);

    act(() => {
      document.dispatchEvent(new PointerEvent('pointerup', { clientX: 300, clientY: 100 }));
    });

    expect(onCommit).toHaveBeenCalledWith('t1', 't2', 'finish_to_start');
  });

  it('should call onCommit when link is created via keyboard', async () => {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('width', '800');
    svgEl.setAttribute('height', '600');
    document.body.appendChild(svgEl);
    const onCommit = vi.fn();
    const svgRef = { current: svgEl };
    const { result } = renderHook(() => useGanttLinkDraw(mockStore as any, svgRef, onCommit));

    act(() => {
      result.current.startKeyboardLink('t1');
    });

    await waitFor(() => expect(result.current.isLinking).toBe(true));

    act(() => {
      result.current.completeKeyboardLink('t2');
    });

    expect(onCommit).toHaveBeenCalledWith('t1', 't2', 'finish_to_start');
  });

  it('should clean up temp line on unmount', () => {
    const svgRef = { current: document.createElementNS('http://www.w3.org/2000/svg', 'svg') };
    const { unmount } = renderHook(() => useGanttLinkDraw(mockStore as any, svgRef));
    expect(unmount).not.toThrow();
  });

  it('should cleanup document listeners on unmount during active link drawing', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('width', '800');
    svgEl.setAttribute('height', '600');
    document.body.appendChild(svgEl);
    const svgRef = { current: svgEl };
    const { result, unmount } = renderHook(() => useGanttLinkDraw(mockStore as any, svgRef));

    const handle = document.createElement('div');
    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      result.current.onLinkHandlePointerDown(e, 't1', 'end');
    });
    document.body.appendChild(handle);

    act(() => {
      handle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
    });

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
});
