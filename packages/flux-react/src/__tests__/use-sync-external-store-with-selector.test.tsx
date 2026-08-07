import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSyncExternalStoreWithSelector } from '../use-sync-external-store-with-selector.js';

interface TestStore<T> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): T;
  setSnapshot(next: T): void;
  notify(): void;
  listenerCount: number;
}

function makeStore<T>(initial: T): TestStore<T> {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    setSnapshot(next: T) {
      snapshot = next;
      for (const listener of [...listeners]) listener();
    },
    notify() {
      for (const listener of [...listeners]) listener();
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

describe('useSyncExternalStoreWithSelector', () => {
  it('keeps the selection stable and calls the selector once per distinct snapshot', () => {
    const store = makeStore({ count: 1 });
    const selector = vi.fn((s: { count: number }) => s.count);
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useSyncExternalStoreWithSelector(
        store.subscribe,
        store.getSnapshot,
        undefined,
        selector,
      );
    });

    expect(result.current).toBe(1);
    expect(selector).toHaveBeenCalledTimes(1);
    expect(renderCount).toBe(1);

    act(() => store.setSnapshot({ count: 1 }));
    expect(result.current).toBe(1);
    expect(selector).toHaveBeenCalledTimes(2);
    expect(renderCount).toBe(1);

    act(() => store.notify());
    expect(result.current).toBe(1);
    expect(selector).toHaveBeenCalledTimes(2);
    expect(renderCount).toBe(1);
  });

  it('renders when the server snapshot argument is explicitly undefined (optional contract)', () => {
    const store = makeStore({ count: 1 });
    const subscribe = vi.fn(store.subscribe);
    const getSnapshot = vi.fn(store.getSnapshot);
    const selector = (s: { count: number }) => s.count;
    const { result, unmount } = renderHook(() =>
      useSyncExternalStoreWithSelector(subscribe, getSnapshot, undefined, selector),
    );

    expect(result.current).toBe(1);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(getSnapshot).toHaveBeenCalled();
    unmount();
  });

  it('does not call getServerSnapshot during client rendering', () => {
    const store = makeStore({ count: 1 });
    const getServerSnapshot = vi.fn(() => ({ count: 0 }));
    const selector = (s: { count: number }) => s.count;
    const { result } = renderHook(() =>
      useSyncExternalStoreWithSelector(store.subscribe, store.getSnapshot, getServerSnapshot, selector),
    );

    expect(result.current).toBe(1);
    expect(getServerSnapshot).not.toHaveBeenCalled();
  });

  it('re-renders on selection change with the default objectIs equality', () => {
    const store = makeStore({ count: 1 });
    const selector = (s: { count: number }) => ({ count: s.count });
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useSyncExternalStoreWithSelector(store.subscribe, store.getSnapshot, undefined, selector);
    });

    expect(result.current).toEqual({ count: 1 });
    expect(renderCount).toBe(1);

    act(() => store.setSnapshot({ count: 2 }));
    expect(result.current).toEqual({ count: 2 });
    expect(renderCount).toBe(2);
  });

  it('keeps the selection stable when a custom isEqual treats it as equal', () => {
    const store = makeStore({ count: 1 });
    const selector = (s: { count: number }) => ({ count: s.count });
    const isEqual = (a: { count: number }, b: { count: number }) => a.count === b.count;
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useSyncExternalStoreWithSelector(
        store.subscribe,
        store.getSnapshot,
        undefined,
        selector,
        isEqual,
      );
    });

    const firstSelection = result.current;
    expect(firstSelection).toEqual({ count: 1 });
    expect(renderCount).toBe(1);

    act(() => store.setSnapshot({ count: 1 }));
    expect(result.current).toBe(firstSelection);
    expect(renderCount).toBe(1);

    act(() => store.setSnapshot({ count: 2 }));
    expect(result.current).toEqual({ count: 2 });
    expect(result.current).not.toBe(firstSelection);
    expect(renderCount).toBe(2);
  });

  it('unsubscribes when the component unmounts', () => {
    const store = makeStore({ count: 1 });
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((listener: () => void) => {
      const cleanup = store.subscribe(listener);
      return () => {
        cleanup();
        unsubscribe();
      };
    });
    const selector = (s: { count: number }) => s.count;
    const { unmount } = renderHook(() =>
      useSyncExternalStoreWithSelector(subscribe, store.getSnapshot, undefined, selector),
    );

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(store.listenerCount).toBe(1);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(store.listenerCount).toBe(0);
  });

  it('propagates selector errors and still cleans up the subscription', () => {
    const store = makeStore({ count: 1 });
    const selector = (s: { count: number }) => {
      if (s.count === 2) {
        throw new Error('selector boom');
      }
      return s.count;
    };
    const { result, unmount } = renderHook(() =>
      useSyncExternalStoreWithSelector(store.subscribe, store.getSnapshot, undefined, selector),
    );
    expect(result.current).toBe(1);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => act(() => store.setSnapshot({ count: 2 }))).toThrow('selector boom');
    } finally {
      consoleErrorSpy.mockRestore();
    }
    expect(store.listenerCount).toBe(0);
    unmount();
  });
});
