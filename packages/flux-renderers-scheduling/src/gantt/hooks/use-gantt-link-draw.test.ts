import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGanttLinkDraw } from './use-gantt-link-draw.js';

const mockStore = {
  tasks: new Map([
    ['t1', { id: 't1', text: 'Task 1', $x: 0, $y: 0, $w: 100, $h: 20 }],
    ['t2', { id: 't2', text: 'Task 2', $x: 200, $y: 0, $w: 100, $h: 20 }],
  ]),
  addLink: vi.fn(),
};

vi.mock('../gantt-context.js', () => ({
  useGanttStore: () => mockStore,
}));

describe('useGanttLinkDraw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should return link drawing functions', () => {
    const svgRef = { current: document.createElementNS('http://www.w3.org/2000/svg', 'svg') };
    const { result } = renderHook(() => useGanttLinkDraw(svgRef));
    expect(typeof result.current.onLinkHandlePointerDown).toBe('function');
    expect(typeof result.current.startKeyboardLink).toBe('function');
    expect(typeof result.current.completeKeyboardLink).toBe('function');
    expect(typeof result.current.cancelLink).toBe('function');
    expect(result.current.isLinking).toBe(false);
  });

  it('should cancel link via cancelLink', () => {
    const svgRef = { current: document.createElementNS('http://www.w3.org/2000/svg', 'svg') };
    const { result } = renderHook(() => useGanttLinkDraw(svgRef));
    result.current.cancelLink();
    expect(result.current.isLinking).toBe(false);
  });

  it('should clean up temp line on unmount', () => {
    const svgRef = { current: document.createElementNS('http://www.w3.org/2000/svg', 'svg') };
    const { unmount } = renderHook(() => useGanttLinkDraw(svgRef));
    expect(unmount).not.toThrow();
  });

  it('should do nothing when svgRef is null', () => {
    const { result } = renderHook(() => useGanttLinkDraw({ current: null }));
    result.current.startKeyboardLink('t1');
    expect(result.current.isLinking).toBe(false);
  });
});
