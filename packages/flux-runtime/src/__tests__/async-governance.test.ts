import { describe, expect, it } from 'vitest';
import { createAsyncGovernanceStore } from '../async-data/async-governance';

describe('createAsyncGovernanceStore', () => {
  it('tracks current runs, cancellation, stale settles, and sorted snapshots', () => {
    const store = createAsyncGovernanceStore({ retention: 2 });

    const first = store.beginRun({
      ownerKind: 'reaction',
      ownerId: 'owner-b',
      scopeId: 'scope-b',
      cause: 'dependency-change'
    });

    expect(store.isCurrentRun(first)).toBe(true);

    store.markCancelled(first, { supersededBy: 99 });
    expect(store.getOwnerState('owner-b')?.currentRun).toMatchObject({
      runId: 1,
      cancelled: true,
      supersededBy: 99
    });

    const second = store.beginRun({
      ownerKind: 'reaction',
      ownerId: 'owner-b',
      scopeId: 'scope-c',
      cause: 'manual-refresh'
    });

    expect(store.getOwnerState('owner-b')).toMatchObject({
      ownerKind: 'reaction',
      scopeId: 'scope-c',
      currentRun: expect.objectContaining({ runId: 2, outcome: 'running' })
    });

    const staleSettled = store.settleRun(first, { outcome: 'failed', error: 'boom' });
    expect(staleSettled).toMatchObject({
      runId: 1,
      outcome: 'stale-dropped',
      supersededBy: 2,
      error: { message: 'boom' }
    });

    const finished = store.settleRun(second, { outcome: 'succeeded' });
    expect(finished.outcome).toBe('succeeded');
    expect(store.getOwnerState('owner-b')?.currentRun).toBeUndefined();

    const snapshotOwner = store.beginRun({
      ownerKind: 'validation',
      ownerId: 'owner-a',
      scopeId: 'scope-a',
      cause: 'submit'
    });
    store.settleRun(snapshotOwner, {
      outcome: 'failed',
      timedOut: true,
      error: new TypeError('timed out')
    });

    expect(store.getSnapshot()).toEqual({
      owners: [
        expect.objectContaining({ ownerId: 'owner-a', scopeId: 'scope-a' }),
        expect.objectContaining({ ownerId: 'owner-b', scopeId: 'scope-c' })
      ]
    });
  });

  it('ignores stale cancellations, invalidations, and enforces minimum retention', () => {
    const store = createAsyncGovernanceStore({ retention: 0 });

    const first = store.beginRun({
      ownerKind: 'data-source',
      ownerId: 'owner-x',
      scopeId: 'scope-x',
      cause: 'initial-load'
    });
    const second = store.beginRun({
      ownerKind: 'data-source',
      ownerId: 'owner-x',
      scopeId: 'scope-x',
      cause: 'refresh'
    });

    store.markCancelled(first, { supersededBy: 123 });
    expect(store.getOwnerState('owner-x')?.currentRun).toMatchObject({ runId: 2 });

    store.invalidateCurrentRun('missing-owner');
    store.invalidateCurrentRun('owner-x');
    expect(store.isCurrentRun(second)).toBe(false);

    store.settleRun(first, { outcome: 'cancelled', cancelled: true });
    store.settleRun(second, { outcome: 'failed', error: undefined });

    expect(store.getOwnerState('owner-x')?.recentRuns).toHaveLength(1);
    expect(store.getOwnerState('owner-x')?.recentRuns[0]).toMatchObject({
      runId: 2,
      outcome: 'stale-dropped',
      error: undefined
    });

    store.clearOwner('owner-x');
    expect(store.getOwnerState('owner-x')).toBeUndefined();
  });
});
