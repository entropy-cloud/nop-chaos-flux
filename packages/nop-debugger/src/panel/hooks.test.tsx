// @vitest-environment happy-dom

import { Profiler } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDebuggerSnapshot } from './hooks.js';
import type { NopDebuggerController, NopDebuggerSnapshot } from '../types.js';

function createStore(initial: NopDebuggerSnapshot) {
  let current = initial;
  const listeners = new Set<() => void>();

  const controller = {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return current;
    },
  } as Pick<NopDebuggerController, 'subscribe' | 'getSnapshot'>;

  return {
    controller,
    update(next: NopDebuggerSnapshot) {
      current = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe('useDebuggerSnapshot', () => {
  it('skips rerenders when unrelated snapshot fields change outside the selected slice', () => {
    const filters = ['render', 'action', 'api', 'compile', 'notify', 'error'] as const;
    const store = createStore({
      enabled: true,
      panelOpen: true,
      minimized: false,
      paused: false,
      strictMode: false,
      activeTab: 'overview',
      position: { x: 24, y: 24 },
      events: [],
      filters: [...filters],
      pinnedErrors: { earliest: [], latest: [] },
    });
    let renderCount = 0;

    function Probe() {
      const selectedFilters = useDebuggerSnapshot(
        store.controller as NopDebuggerController,
        (snapshot) => snapshot.filters,
      );
      return <span data-testid="filter-count">{String(selectedFilters.length)}</span>;
    }

    render(
      <Profiler
        id="debugger-filters-probe"
        onRender={() => {
          renderCount += 1;
        }}
      >
        <Probe />
      </Profiler>,
    );
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('filter-count').textContent).toBe('6');

    act(() => {
      store.update({
        ...store.controller.getSnapshot(),
        events: [
          {
            id: 1,
            sessionId: 'session-1',
            timestamp: 1,
            kind: 'render:end',
            group: 'render',
            level: 'info',
            source: 'test',
            summary: 'rendered',
          },
        ],
      });
    });

    expect(renderCount).toBe(1);

    act(() => {
      store.update({
        ...store.controller.getSnapshot(),
        filters: ['render', 'action'],
      });
    });

    expect(renderCount).toBe(2);
    expect(screen.getByTestId('filter-count').textContent).toBe('2');
  });
});
