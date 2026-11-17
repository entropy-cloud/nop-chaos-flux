import { describe, expect, it } from 'vitest';
import { createForestSnapshotCollector } from './snapshot-repository.js';

describe('createForestSnapshotCollector (M1)', () => {
  it('collects epochs per microtask with revision vectors and changed scope ids', async () => {
    const collector = createForestSnapshotCollector();
    collector.observe({ scopeId: 'root', revision: 1, snapshot: { a: 1 }, change: { paths: ['a'], revision: 1 } });
    collector.observe({ scopeId: 'child', revision: 5, snapshot: { b: 2 }, change: { paths: ['b'], revision: 5 } });
    const first = await Promise.resolve().then(() => collector.flush());
    expect(first).not.toBeNull();
    expect(first!.epoch).toBe(1);
    expect(first!.revisions).toEqual({ root: 1, child: 5 });
    expect(first!.changedScopeIds).toEqual(['root', 'child']);

    collector.observe({ scopeId: 'root', revision: 2, snapshot: { a: 9 }, change: { paths: ['a'], revision: 2 } });
    await Promise.resolve();
    const second = collector.getLatest()!;
    expect(second.epoch).toBe(2);
    // structural sharing: unchanged scope keeps the exact same reference
    expect(second.scopes.child).toBe(first!.scopes.child);
    expect(second.scopes.root).toEqual({ a: 9 });
  });

  it('prunes disposed scope ids via pruneScopeIds', async () => {
    const collector = createForestSnapshotCollector({ pruneScopeIds: () => ['root'] });
    collector.observe({ scopeId: 'root', revision: 1, snapshot: {}, change: { paths: ['*'], revision: 1 } });
    collector.observe({ scopeId: 'gone', revision: 1, snapshot: {}, change: { paths: ['*'], revision: 1 } });
    await Promise.resolve();
    collector.observe({ scopeId: 'root', revision: 2, snapshot: {}, change: { paths: ['*'], revision: 2 } });
    await Promise.resolve();
    const latest = collector.getLatest()!;
    expect(Object.keys(latest.scopes)).toEqual(['root']);
  });

  it('evicts the oldest snapshot beyond the ring limit and misses evicted epochs', async () => {
    const collector = createForestSnapshotCollector({ maxSnapshots: 3 });
    for (let i = 1; i <= 5; i++) {
      collector.observe({ scopeId: 'root', revision: i, snapshot: { i }, change: { paths: ['*'], revision: i } });
      await Promise.resolve();
      await Promise.resolve();
    }
    expect(collector.getEpochs()).toEqual([3, 4, 5]);
    expect(collector.getSnapshotAt(1)).toBeNull();
    expect(collector.getSnapshotAt(2)).toBeNull();
    expect(collector.getSnapshotAt(4)?.revisions.root).toBe(4);
    expect(collector.getSnapshotAt(999)).toBeNull();
  });

  it('dispose clears the ring and ignores later writes', () => {
    const collector = createForestSnapshotCollector();
    collector.observe({ scopeId: 'root', revision: 1, snapshot: {}, change: { paths: ['*'], revision: 1 } });
    collector.flush();
    collector.dispose();
    expect(collector.getLatest()).toBeNull();
    expect(collector.getEpochs()).toEqual([]);
  });
});
