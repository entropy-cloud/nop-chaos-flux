import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGanttKeyboard } from './use-gantt-keyboard.js';

const mockStore = {
  tasks: new Map([
    ['t1', { id: 't1', text: 'Task 1' }],
    ['t2', { id: 't2', text: 'Task 2' }],
    ['t3', { id: 't3', text: 'Task 3', children: ['t4'] }],
  ]),
  getVisibleTasks: vi.fn(() => [
    { id: 't1', text: 'Task 1' },
    { id: 't2', text: 'Task 2' },
  ]),
  getVisibleDescendantCount: vi.fn(() => 0),
  isOpen: vi.fn(() => false),
  toggleOpen: vi.fn(),
  deleteTask: vi.fn(),
};

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'scheduling.gantt.chartLabel': 'Gantt Chart',
    };
    return map[key] ?? key;
  },
}));

describe('useGanttKeyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should return updateRowAria', () => {
    const containerRef = { current: document.createElement('div') };
    const { result } = renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: null,
        onSelectTask: vi.fn(),
      }),
    );
    expect(typeof result.current.updateRowAria).toBe('function');
  });

  it('should set up keydown listener on container', () => {
    const container = document.createElement('div');
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const containerRef = { current: container };
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: null,
        onSelectTask: vi.fn(),
      }),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(container.getAttribute('tabindex')).toBe('0');
    expect(container.getAttribute('role')).toBe('grid');
    expect(container.getAttribute('aria-label')).toBe('Gantt Chart');
  });

  it('should do nothing when containerRef is null', () => {
    const containerRef = { current: null };
    expect(() => {
      renderHook(() =>
        useGanttKeyboard({ store: mockStore as any,
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
      useGanttKeyboard({ store: mockStore as any,
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

  it('should call deleteTask on Backspace key', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const onSelectTask = vi.fn();
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: 't1',
        onSelectTask,
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true });
    container.dispatchEvent(event);
    expect(mockStore.deleteTask).toHaveBeenCalledWith('t1');
    expect(onSelectTask).toHaveBeenCalledWith(null);
  });

  it('should collapse task on ArrowLeft when expanded', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    mockStore.getVisibleDescendantCount = vi.fn(() => 1);
    mockStore.isOpen = vi.fn(() => true);
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: 't1',
        onSelectTask: vi.fn(),
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
    expect(() => container.dispatchEvent(event)).not.toThrow();
    expect(mockStore.toggleOpen).toHaveBeenCalledWith('t1');
  });

  it('should expand task on ArrowRight when collapsed', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    mockStore.getVisibleDescendantCount = vi.fn(() => 3);
    mockStore.isOpen = vi.fn(() => false);
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: 't1',
        onSelectTask: vi.fn(),
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    expect(() => container.dispatchEvent(event)).not.toThrow();
    expect(mockStore.toggleOpen).toHaveBeenCalledWith('t1');
  });

  it('should not toggle on ArrowLeft when no visible descendants', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    mockStore.getVisibleDescendantCount = vi.fn(() => 0);
    mockStore.toggleOpen.mockClear();
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: 't1',
        onSelectTask: vi.fn(),
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
    expect(() => container.dispatchEvent(event)).not.toThrow();
    expect(mockStore.toggleOpen).not.toHaveBeenCalled();
  });

  it('should call updateRowAria via ArrowDown navigation', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const row = document.createElement('div');
    row.setAttribute('data-task-id', 't1');
    container.appendChild(row);
    const onSelectTask = vi.fn();
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: 't2',
        onSelectTask,
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
    container.dispatchEvent(event);
    expect(onSelectTask).toHaveBeenCalledWith('t1');
  });

  it('should select next task on ArrowDown', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const onSelectTask = vi.fn();
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: 't1',
        onSelectTask,
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
    container.dispatchEvent(event);
    expect(onSelectTask).toHaveBeenCalledWith('t2');
  });

  it('should select previous task on ArrowUp', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const onSelectTask = vi.fn();
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: 't2',
        onSelectTask,
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
    container.dispatchEvent(event);
    expect(onSelectTask).toHaveBeenCalledWith('t1');
  });

  it('should select first task on ArrowUp when no selection', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const onSelectTask = vi.fn();
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: null,
        onSelectTask,
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
    container.dispatchEvent(event);
    expect(onSelectTask).toHaveBeenCalledWith('t1');
  });

  it('should clamp to last task on ArrowDown at end', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const onSelectTask = vi.fn();
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: 't2',
        onSelectTask,
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
    container.dispatchEvent(event);
    expect(onSelectTask).toHaveBeenCalledWith('t2');
  });

  it('should call onOpenEditor on Enter', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const onSelectTask = vi.fn();
    const onOpenEditor = vi.fn();
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: 't1',
        onSelectTask,
        onOpenEditor,
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    container.dispatchEvent(event);
    expect(onOpenEditor).toHaveBeenCalledWith('t1');
  });

  it('should not call onOpenEditor on Enter when no selection', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const onOpenEditor = vi.fn();
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: null,
        onSelectTask: vi.fn(),
        onOpenEditor,
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    container.dispatchEvent(event);
    expect(onOpenEditor).not.toHaveBeenCalled();
  });

  it('should call onUndo on Ctrl+Z', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const onUndo = vi.fn();
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: 't1',
        onSelectTask: vi.fn(),
        onUndo,
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true });
    container.dispatchEvent(event);
    expect(onUndo).toHaveBeenCalled();
  });

  it('should call onUndo on Cmd+Z', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const onUndo = vi.fn();
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: 't1',
        onSelectTask: vi.fn(),
        onUndo,
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'Z', metaKey: true, bubbles: true });
    container.dispatchEvent(event);
    expect(onUndo).toHaveBeenCalled();
  });

  it('should not call onUndo for plain Z without modifier', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const onUndo = vi.fn();
    renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: 't1',
        onSelectTask: vi.fn(),
        onUndo,
      }),
    );
    const event = new KeyboardEvent('keydown', { key: 'z', bubbles: true });
    container.dispatchEvent(event);
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('should set aria attributes via updateRowAria', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    const { result } = renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: null,
        onSelectTask: vi.fn(),
      }),
    );
    const row = document.createElement('div');
    row.setAttribute('data-task-id', 't1');
    container.appendChild(row);
    result.current.updateRowAria('t1', true);
    expect(row.getAttribute('role')).toBe('row');
    expect(row.getAttribute('aria-selected')).toBe('true');
    expect(row.getAttribute('tabindex')).toBe('0');
  });

  it('should not throw for updateRowAria with null container', () => {
    const containerRef = { current: null };
    const { result } = renderHook(() =>
      useGanttKeyboard({ store: mockStore as any,
        containerRef,
        selectedTaskId: null,
        onSelectTask: vi.fn(),
      }),
    );
    expect(() => result.current.updateRowAria('t1', true)).not.toThrow();
  });
});
