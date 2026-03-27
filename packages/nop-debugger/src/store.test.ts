import { describe, expect, it, vi } from 'vitest';
import { createDebuggerStore } from './store';

describe('createDebuggerStore', () => {
  it('appends bounded events and notifies subscribers', async () => {
    const store = createDebuggerStore({
      enabled: true,
      sessionId: 'session-1',
      maxEvents: 2,
      defaultOpen: false,
      defaultTab: 'timeline',
      position: { x: 10, y: 20 },
      errorBufferKeepEarliest: 3,
      errorBufferKeepLatest: 5
    });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.append({
      kind: 'notify',
      group: 'notify',
      level: 'info',
      source: 'test',
      summary: 'first',
      timestamp: 100
    });
    store.append({
      kind: 'notify',
      group: 'notify',
      level: 'info',
      source: 'test',
      summary: 'second',
      timestamp: 200
    });
    store.append({
      kind: 'notify',
      group: 'notify',
      level: 'info',
      source: 'test',
      summary: 'third',
      timestamp: 300
    });

    const snapshot = store.getSnapshot();
    expect(snapshot.events).toHaveLength(2);
    expect(snapshot.events.map((event) => event.summary)).toEqual(['third', 'second']);
    expect(snapshot.events[0]).toMatchObject({
      id: 3,
      sessionId: 'session-1'
    });
    expect(listener).toHaveBeenCalledTimes(0);

    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.clear();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('tracks panel state, filters, and paused append behavior', () => {
    const store = createDebuggerStore({
      enabled: true,
      sessionId: 'session-2',
      maxEvents: 5,
      defaultOpen: true,
      defaultTab: 'overview',
      position: { x: 1, y: 2 },
      errorBufferKeepEarliest: 3,
      errorBufferKeepLatest: 5
    });

    store.hide();
    store.toggle();
    store.pause();
    store.append({
      kind: 'error',
      group: 'error',
      level: 'error',
      source: 'test',
      summary: 'ignored while paused'
    });
    store.resume();
    store.setActiveTab('network');
    store.setPosition({ x: 30, y: 40 });

    store.toggleFilter('render');
    expect(store.getSnapshot().filters.includes('render')).toBe(false);

    store.getSnapshot().filters.slice(0, -1).forEach((filter) => {
      store.toggleFilter(filter);
    });
    const lastFilter = store.getSnapshot().filters[0];
    store.toggleFilter(lastFilter);

    const snapshot = store.getSnapshot();
    expect(snapshot.panelOpen).toBe(true);
    expect(snapshot.activeTab).toBe('network');
    expect(snapshot.position).toEqual({ x: 30, y: 40 });
    expect(snapshot.events).toHaveLength(0);
    expect(snapshot.filters).toHaveLength(1);
    expect(snapshot.filters[0]).toBe(lastFilter);
  });

  it('does not append events when disabled', () => {
    const store = createDebuggerStore({
      enabled: false,
      sessionId: 'session-3',
      maxEvents: 5,
      defaultOpen: false,
      defaultTab: 'timeline',
      position: { x: 0, y: 0 },
      errorBufferKeepEarliest: 3,
      errorBufferKeepLatest: 5
    });

    store.append({
      kind: 'notify',
      group: 'notify',
      level: 'info',
      source: 'test',
      summary: 'ignored while disabled'
    });

    expect(store.getSnapshot().events).toHaveLength(0);
  });

  it('maintains pinned error buffer with earliest and latest errors', () => {
    const store = createDebuggerStore({
      enabled: true,
      sessionId: 'session-pinned',
      maxEvents: 3,
      defaultOpen: false,
      defaultTab: 'timeline',
      position: { x: 0, y: 0 },
      errorBufferKeepEarliest: 2,
      errorBufferKeepLatest: 2
    });

    store.append({ kind: 'error', group: 'error', level: 'error', source: 'test', summary: 'error-1', timestamp: 100 });
    store.append({ kind: 'notify', group: 'notify', level: 'info', source: 'test', summary: 'info-1', timestamp: 150 });
    store.append({ kind: 'error', group: 'error', level: 'error', source: 'test', summary: 'error-2', timestamp: 200 });
    store.append({ kind: 'notify', group: 'notify', level: 'warning', source: 'test', summary: 'warn-1', timestamp: 250 });
    store.append({ kind: 'error', group: 'error', level: 'error', source: 'test', summary: 'error-3', timestamp: 300 });
    store.append({ kind: 'error', group: 'error', level: 'error', source: 'test', summary: 'error-4', timestamp: 350 });

    const snapshot = store.getSnapshot();
    expect(snapshot.events).toHaveLength(3);
    expect(snapshot.events[0].summary).toBe('error-4');

    expect(snapshot.pinnedErrors.earliest).toHaveLength(2);
    expect(snapshot.pinnedErrors.earliest[0].summary).toBe('error-1');
    expect(snapshot.pinnedErrors.earliest[1].summary).toBe('error-2');

    expect(snapshot.pinnedErrors.latest).toHaveLength(2);
    expect(snapshot.pinnedErrors.latest[0].summary).toBe('error-3');
    expect(snapshot.pinnedErrors.latest[1].summary).toBe('error-4');
  });

  it('clears pinned error buffer when events are cleared', () => {
    const store = createDebuggerStore({
      enabled: true,
      sessionId: 'session-clear',
      maxEvents: 10,
      defaultOpen: false,
      defaultTab: 'timeline',
      position: { x: 0, y: 0 },
      errorBufferKeepEarliest: 3,
      errorBufferKeepLatest: 3
    });

    store.append({ kind: 'error', group: 'error', level: 'error', source: 'test', summary: 'err', timestamp: 100 });
    store.clear();

    const snapshot = store.getSnapshot();
    expect(snapshot.pinnedErrors.earliest).toHaveLength(0);
    expect(snapshot.pinnedErrors.latest).toHaveLength(0);
  });

  it('does not pin info-level events', () => {
    const store = createDebuggerStore({
      enabled: true,
      sessionId: 'session-info',
      maxEvents: 10,
      defaultOpen: false,
      defaultTab: 'timeline',
      position: { x: 0, y: 0 },
      errorBufferKeepEarliest: 3,
      errorBufferKeepLatest: 3
    });

    store.append({ kind: 'notify', group: 'notify', level: 'info', source: 'test', summary: 'info-1', timestamp: 100 });
    store.append({ kind: 'action:end', group: 'action', level: 'success', source: 'test', summary: 'success-1', timestamp: 200 });

    const snapshot = store.getSnapshot();
    expect(snapshot.pinnedErrors.earliest).toHaveLength(0);
    expect(snapshot.pinnedErrors.latest).toHaveLength(0);
  });
});
