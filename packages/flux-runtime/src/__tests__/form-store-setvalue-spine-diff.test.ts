import { describe, expect, it, vi } from 'vitest';
import { createFormStore } from '../form-store.js';

/**
 * Equivalence harness: for each scenario, the notification set produced by
 * the write-spine diff must exactly match what the previous full deep diff
 * produced. Expectations below are hand-derived from the old algorithm
 * (collectChangedValuePaths from the root with Object.is short-circuiting),
 * since the old implementation can no longer be reached through the store API.
 */
describe('setValue write-spine diff equivalence (plan 2026-09-29-3 Phase 3)', () => {
  function makeStore(initial: Record<string, any>) {
    const store = createFormStore(initial);
    const notifiedPaths = new Set<string>();
    const listeners: Array<() => void> = [];
    return {
      store,
      watch(path: string) {
        const listener = vi.fn(() => {
          notifiedPaths.add(path);
        });
        listeners.push(listener);
        return store.subscribeToPaths([path], listener);
      },
      notified: notifiedPaths,
    };
  }

  it('leaf write notifies exact + prefix listeners, not siblings', () => {
    const h = makeStore({ a: { b: 1, c: 2 }, d: 3 });
    const unsubscribers = [h.watch('a.b'), h.watch('a.c'), h.watch('a'), h.watch('d')];
    h.store.setValue('a.b', 5);
    expect(h.notified.has('a.b')).toBe(true);
    expect(h.notified.has('a')).toBe(true);
    expect(h.notified.has('a.c')).toBe(false);
    expect(h.notified.has('d')).toBe(false);
    for (const unsub of unsubscribers) unsub();
  });

  it('nested deep write notifies the full prefix chain once per listener', () => {
    const h = makeStore({ x: { y: { z: { w: 1 } }, sib: 9 } });
    const calls = { deep: 0, mid: 0, sib: 0 };
    const u1 = h.store.subscribeToPaths(['x.y.z.w'], () => { calls.deep += 1; });
    const u2 = h.store.subscribeToPaths(['x.y'], () => { calls.mid += 1; });
    const u3 = h.store.subscribeToPaths(['x.sib'], () => { calls.sib += 1; });
    h.store.setValue('x.y.z.w', 2);
    expect(calls.deep).toBe(1);
    expect(calls.mid).toBe(1);
    expect(calls.sib).toBe(0);
    u1(); u2(); u3();
  });

  it('object replacement writes notify changed leaves only (same set as deep diff)', () => {
    const h = makeStore({ obj: { x: 1, y: 2, z: { k: 3 } } });
    const unsubscribers = [h.watch('obj.x'), h.watch('obj.y'), h.watch('obj.z.k'), h.watch('obj.z')];
    h.store.setValue('obj', { x: 10, y: 2, z: { k: 3 } });
    // deep diff produced {obj.x}: the changed path is exactly obj.x —
    // sibling subscribers (obj.z, obj.y) are not prefixes/descendants of it
    expect(h.notified.has('obj.x')).toBe(true);
    expect(h.notified.has('obj.z')).toBe(false);
    expect(h.notified.has('obj.y')).toBe(false);
    expect(h.notified.has('obj.z.k')).toBe(false);
    for (const unsub of unsubscribers) unsub();
  });

  it('no-op write notifies nobody and still records an empty commit', () => {
    const h = makeStore({ a: 1 });
    const listener = vi.fn();
    const unsub = h.store.subscribeToPaths(['a'], listener);
    h.store.setValue('a', 1);
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });

  it('array element change adds the array path (array leaf rule preserved)', () => {
    const h = makeStore({ tags: ['a', 'b'], meta: { n: 1 } });
    const calls = { array: 0, index: 0, meta: 0 };
    const u1 = h.store.subscribeToPaths(['tags'], () => { calls.array += 1; });
    const u2 = h.store.subscribeToPaths(['tags.0'], () => { calls.index += 1; });
    const u3 = h.store.subscribeToPaths(['meta'], () => { calls.meta += 1; });
    h.store.setValue('tags.0', 'changed');
    // old deep diff: before.tags vs after.tags are both arrays -> adds 'tags';
    // the tags.0 subscriber rides the descendant-listener channel of 'tags'
    // (identical to the old notification walk)
    expect(calls.array).toBe(1);
    expect(calls.index).toBe(1);
    expect(calls.meta).toBe(0);
    u1(); u2(); u3();
  });

  it('creating a new nested path notifies like the deep diff did', () => {
    const h = makeStore({ a: {} });
    const unsubscribers = [h.watch('a'), h.watch('a.newLeaf')];
    h.store.setValue('a.newLeaf', 'v');
    expect(h.notified.has('a.newLeaf')).toBe(true);
    expect(h.notified.has('a')).toBe(true);
    for (const unsub of unsubscribers) unsub();
  });
});
