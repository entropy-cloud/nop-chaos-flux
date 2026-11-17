import { describe, expect, it, vi } from 'vitest';
import { buildLogTree, toDisplayProjection, type NopDebugEventTreeNode } from './log-tree.js';
import { createDebuggerStore } from './store.js';
import type { NopDebugEvent } from './types.js';

function makeEvent(overrides: Partial<NopDebugEvent> & { id: number }): NopDebugEvent {
  return {
    sessionId: 's',
    timestamp: 1000,
    kind: 'action:start',
    group: 'action',
    level: 'info',
    source: 'test',
    summary: `event-${overrides.id}`,
    ...overrides,
  } as NopDebugEvent;
}

describe('buildLogTree (M1 nested insertion)', () => {
  it('nests children under parents in pre-order and hoists orphans to roots', () => {
    const events = [
      makeEvent({ id: 4, parentEventId: 2 }),
      makeEvent({ id: 3, parentEventId: 2 }),
      makeEvent({ id: 2, parentEventId: 1 }),
      makeEvent({ id: 1 }),
      makeEvent({ id: 99, parentEventId: 42 }),
    ];
    const tree = buildLogTree(events);
    expect(tree.length).toBe(2);
    expect(tree.map((node) => node.event.id)).toEqual([99, 1]);
    const rootChildren = (tree[1] as NopDebugEventTreeNode).children.map((child) => child.event.id);
    expect(rootChildren).toEqual([2]);
    expect((tree[1]!.children[0] as NopDebugEventTreeNode).children.map((child) => child.event.id)).toEqual([3, 4]);
  });
});

describe('toDisplayProjection', () => {
  it('keeps the small projection subset and omits detail payloads', () => {
    const projection = toDisplayProjection(
      makeEvent({ id: 7, summary: 'click submit', detail: 'FULL PAYLOAD', durationMs: 12, nodeId: 'n-1' }),
    );
    expect(projection).toEqual({
      id: 7,
      kind: 'action:start',
      group: 'action',
      level: 'info',
      source: 'test',
      summary: 'click submit',
      timestamp: 1000,
      nodeId: 'n-1',
      durationMs: 12,
    });
    expect(JSON.stringify(projection)).not.toContain('FULL PAYLOAD');
  });
});

describe('store log bus upgrade (M1)', () => {
  function makeStore() {
    return createDebuggerStore({
      enabled: true,
      sessionId: 's',
      maxEvents: 50,
      defaultOpen: false,
      defaultTab: 'overview',
      position: { x: 0, y: 0 },
      errorBufferKeepEarliest: 5,
      errorBufferKeepLatest: 5,
    });
  }

  it('updateEvent is a no-op when the patch changes nothing (diff gate)', () => {
    const store = makeStore();
    store.append({ kind: 'action:start', group: 'action', level: 'info', source: 't', summary: 'x' });
    const id = store.getSnapshot().events[0]!.id;
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.updateEvent(id, { summary: 'x' })).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    store.updateEvent(id, { summary: 'y' });
    expect(store.getSnapshot().events[0]!.summary).toBe('x');
  });

  it('applies updateEvent patches after the 4ms trailing merge', () => {
    vi.useFakeTimers();
    try {
      const store = makeStore();
      store.append({ kind: 'action:start', group: 'action', level: 'info', source: 't', summary: 'pending' });
      const id = store.getSnapshot().events[0]!.id;
      store.updateEvent(id, { status: 'passed' } as never);
      store.updateEvent(id, { status: 'failed' } as never);
      vi.advanceTimersByTime(5);
      const event = store.getSnapshot().events[0]!;
      expect((event as unknown as { status?: string }).status).toBe('failed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('getFullEvent returns the full event; getDisplayEvents returns projections', () => {
    const store = makeStore();
    store.append({ kind: 'action:start', group: 'action', level: 'info', source: 't', summary: 'x', detail: 'FULL' });
    const id = store.getSnapshot().events[0]!.id;
    expect(store.getFullEvent(id)?.detail).toBe('FULL');
    const projections = store.getDisplayEvents();
    expect(projections.length).toBe(1);
    expect(projections[0]!.summary).toBe('x');
    expect(JSON.stringify(projections)).not.toContain('FULL');
  });
});
