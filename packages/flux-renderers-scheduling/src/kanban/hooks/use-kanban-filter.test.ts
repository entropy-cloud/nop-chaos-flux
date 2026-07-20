import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKanbanFilter } from './use-kanban-filter.js';

describe('useKanbanFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns all cards as matching when no filter text', () => {
    const { result } = renderHook(() => useKanbanFilter({}));
    expect(result.current.matchesCard({ title: 'Any Card' })).toBe(true);
  });

  it('filters cards by title', () => {
    const { result } = renderHook(() => useKanbanFilter({}));
    act(() => {
      result.current.setFilterText('Task');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.matchesCard({ title: 'Task 1' })).toBe(true);
    expect(result.current.matchesCard({ title: 'Other' })).toBe(false);
  });

  it('filters cards by description', () => {
    const { result } = renderHook(() => useKanbanFilter({}));
    act(() => {
      result.current.setFilterText('urgent');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.matchesCard({ title: 'Task', description: 'This is urgent' })).toBe(true);
    expect(result.current.matchesCard({ title: 'Task', description: 'Normal task' })).toBe(false);
  });

  it('debounces filter text changes', () => {
    const { result } = renderHook(() => useKanbanFilter({ debounceMs: 300 }));
    act(() => {
      result.current.setFilterText('A');
    });

    expect(result.current.activeFilterText).toBe('');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.activeFilterText).toBe('A');
  });

  it('uses custom filterCard function', () => {
    const filterCard = vi.fn((card, text) => {
      return (card.priority as number) >= parseInt(text, 10);
    });
    const { result } = renderHook(() => useKanbanFilter({ filterCard }));
    act(() => {
      result.current.setFilterText('3');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.matchesCard({ title: 'High', priority: 5 })).toBe(true);
    expect(result.current.matchesCard({ title: 'Low', priority: 1 })).toBe(false);
    expect(filterCard).toHaveBeenCalled();
  });
});
