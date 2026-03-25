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
      position: { x: 10, y: 20 }
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
      position: { x: 1, y: 2 }
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
      position: { x: 0, y: 0 }
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
});
