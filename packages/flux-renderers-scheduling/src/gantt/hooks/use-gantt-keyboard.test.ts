import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGanttKeyboard } from './use-gantt-keyboard.js';

const mockStore = {
  tasks: new Map([
    ['t1', { id: 't1', text: 'Task 1' }],
    ['t2', { id: 't2', text: 'Task 2' }],
  ]),
  getVisibleTasks: vi.fn(() => [
    { id: 't1', text: 'Task 1' },
    { id: 't2', text: 'Task 2' },
  ]),
  getVisibleDescendantCount: vi.fn(() => 0),
  toggleOpen: vi.fn(),
  deleteTask: vi.fn(),
};

vi.mock('../gantt-context.js', () => ({
  useGanttStore: () => mockStore,
}));

describe('useGanttKeyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return handleKeyDown and updateRowAria', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() =>
      useGanttKeyboard({
        containerRef,
        selectedTaskId: null,
        onSelectTask: vi.fn(),
      }),
    );
    expect(typeof result.current.handleKeyDown).toBe('function');
    expect(typeof result.current.updateRowAria).toBe('function');
  });

  it('should set up keydown listener on container', () => {
    const container = document.createElement('div');
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const containerRef = { current: container };
    renderHook(() =>
      useGanttKeyboard({
        containerRef,
        selectedTaskId: null,
        onSelectTask: vi.fn(),
      }),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(container.getAttribute('tabindex')).toBe('0');
    expect(container.getAttribute('role')).toBe('treegrid');
  });

  it('should do nothing when containerRef is null', () => {
    const containerRef = { current: null };
    expect(() => {
      renderHook(() =>
        useGanttKeyboard({
          containerRef,
          selectedTaskId: null,
          onSelectTask: vi.fn(),
        }),
      );
    }).not.toThrow();
  });

  it('should call deleteTask on Delete key', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const onSelectTask = vi.fn();
    renderHook(() =>
      useGanttKeyboard({
        containerRef,
        selectedTaskId: 't1',
        onSelectTask,
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true });
    container.dispatchEvent(event);
    expect(mockStore.deleteTask).toHaveBeenCalledWith('t1');
    expect(onSelectTask).toHaveBeenCalledWith(null);
  });
});
