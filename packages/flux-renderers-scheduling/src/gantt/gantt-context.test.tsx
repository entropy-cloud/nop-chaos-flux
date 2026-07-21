import { describe, expect, it } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import { GanttStoreProvider, useGanttStore, useGanttStoreSnapshot, useGanttTaskSnapshot, useGanttLinkSnapshot, useGanttLayoutSnapshot, useGanttTreeSnapshot } from './gantt-context.js';
import { GanttStore } from './gantt-store.js';
import type { GanttTaskData } from './gantt.types.js';

function createTestStore() {
  const store = new GanttStore({ cellWidth: 40 });
  store.parse([{ id: 't1', text: 'Task 1', start: '2026-01-01', end: '2026-01-10' } as GanttTaskData], []);
  return store;
}

describe('GanttStoreProvider', () => {
  it('renders children', () => {
    const store = createTestStore();
    const { container } = render(
      <GanttStoreProvider store={store}>
        <div data-testid="child" />
      </GanttStoreProvider>,
    );
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
  });
});

describe('useGanttStore', () => {
  it('returns the store when used within provider', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useGanttStore(), {
      wrapper: ({ children }) => <GanttStoreProvider store={store}>{children}</GanttStoreProvider>,
    });
    expect(result.current).toBe(store);
  });

  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useGanttStore())).toThrow('useGanttStore must be used within GanttStoreProvider');
  });
});

describe('snapshot hooks', () => {
  it('useGanttStoreSnapshot returns current revision', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useGanttStoreSnapshot(), {
      wrapper: ({ children }) => <GanttStoreProvider store={store}>{children}</GanttStoreProvider>,
    });
    expect(result.current).toBe(store.revision);
  });

  it('useGanttTaskSnapshot returns current taskRevision', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useGanttTaskSnapshot(), {
      wrapper: ({ children }) => <GanttStoreProvider store={store}>{children}</GanttStoreProvider>,
    });
    expect(result.current).toBe(store.taskRevision);
  });

  it('useGanttLinkSnapshot returns current linkRevision', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useGanttLinkSnapshot(), {
      wrapper: ({ children }) => <GanttStoreProvider store={store}>{children}</GanttStoreProvider>,
    });
    expect(result.current).toBe(store.linkRevision);
  });

  it('useGanttLayoutSnapshot returns current layoutRevision', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useGanttLayoutSnapshot(), {
      wrapper: ({ children }) => <GanttStoreProvider store={store}>{children}</GanttStoreProvider>,
    });
    expect(result.current).toBe(store.layoutRevision);
  });

  it('useGanttTreeSnapshot returns current treeRevision', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useGanttTreeSnapshot(), {
      wrapper: ({ children }) => <GanttStoreProvider store={store}>{children}</GanttStoreProvider>,
    });
    expect(result.current).toBe(store.treeRevision);
  });

  it('all snapshot hooks throw when used outside provider', () => {
    expect(() => renderHook(() => useGanttStoreSnapshot())).toThrow();
    expect(() => renderHook(() => useGanttTaskSnapshot())).toThrow();
    expect(() => renderHook(() => useGanttLinkSnapshot())).toThrow();
    expect(() => renderHook(() => useGanttLayoutSnapshot())).toThrow();
    expect(() => renderHook(() => useGanttTreeSnapshot())).toThrow();
  });
});
