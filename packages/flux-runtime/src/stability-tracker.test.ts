import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStabilityTracker } from './stability-tracker';

describe('createStabilityTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts stable with zero counters', () => {
    const tracker = createStabilityTracker();
    expect(tracker.isStable()).toBe(true);
    expect(tracker.getSnapshot()).toEqual({
      stable: true,
      degraded: undefined,
      counters: { fetch: 0, stream: 0, transition: 0, suspense: 0, scopeDebounce: 0 },
    });
  });

  it('reports unstable while any counter is held and resolves whenStable on release', async () => {
    const tracker = createStabilityTracker();
    const releaseFetch = tracker.acquire('fetch');
    expect(tracker.isStable()).toBe(false);

    let resolved = false;
    const promise = tracker.whenStable().then((snapshot) => {
      resolved = true;
      return snapshot;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(false);

    releaseFetch();
    const snapshot = await promise;
    expect(resolved).toBe(true);
    expect(snapshot.stable).toBe(true);
    expect(tracker.isStable()).toBe(true);
  });

  it('resolves immediately when already stable', async () => {
    const tracker = createStabilityTracker();
    const snapshot = await tracker.whenStable();
    expect(snapshot.stable).toBe(true);
  });

  it('marks degraded and resolves on timeout while work is in flight', async () => {
    const tracker = createStabilityTracker();
    tracker.acquire('stream');
    const promise = tracker.whenStable(1000);
    await vi.advanceTimersByTimeAsync(1001);
    const snapshot = await promise;
    expect(snapshot.stable).toBe(false);
    expect(snapshot.degraded).toBe(true);
    expect(snapshot.counters.stream).toBe(1);
  });

  it('ignores double release and clamps negative counters', () => {
    const tracker = createStabilityTracker();
    const release = tracker.acquire('fetch');
    release();
    release();
    expect(tracker.getSnapshot().counters.fetch).toBe(0);
  });

  it('holds a 50ms scope debounce window after noteScopeWrite', async () => {
    const tracker = createStabilityTracker();
    tracker.noteScopeWrite();
    expect(tracker.isStable()).toBe(false);
    await vi.advanceTimersByTimeAsync(49);
    expect(tracker.isStable()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(tracker.isStable()).toBe(true);
  });

  it('notifies onChange listeners with snapshots on transitions', async () => {
    const tracker = createStabilityTracker();
    const seen: boolean[] = [];
    tracker.onChange((snapshot) => seen.push(snapshot.stable));
    const release = tracker.acquire('transition');
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(seen).toContain(false);
    expect(seen).toContain(true);
  });

  it('unsubscribed listeners are no longer called', () => {
    const tracker = createStabilityTracker();
    const seen: boolean[] = [];
    const off = tracker.onChange((snapshot) => seen.push(snapshot.stable));
    off();
    const release = tracker.acquire('fetch');
    release();
    expect(seen).toEqual([]);
  });
});
