// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  computeProbeDeltas,
  createPerformanceDiagnosticsStore,
  diffChangedItemKeys,
  diffChangedRowKeys,
  diffProfiler,
} from './diagnostics';

describe('performance diagnostics store', () => {
  it('tracks sessions, probe counters, and profiler snapshots', () => {
    const store = createPerformanceDiagnosticsStore();

    store.recordProbeEvent('target', 'render', { cid: 11, instancePath: '["row"]' });
    store.recordProbeEvent('target', 'mount', { cid: 11, instancePath: '["row"]' });
    store.recordProfilerSnapshot({
      commitCount: 2,
      totalActualDuration: 3,
      lastActualDuration: 2,
      averageActualDuration: 1.5,
      maxActualDuration: 2,
    });

    const session = store.startSession({
      id: 'session-1',
      scenario: 'table-single-row-locality',
      profilerBefore: store.getLatestProfilerSnapshot(),
    });

    expect(session.id).toBe('session-1');
    expect(store.getLatestSession()?.status).toBe('running');

    store.completeSession('session-1', {
      changedRowKeys: ['user-25'],
      debuggerSummary: {
        covered: true,
        failureCount: 0,
        errorCount: 0,
      },
    });

    expect(store.getLatestSession()).toMatchObject({
      id: 'session-1',
      status: 'completed',
      changedRowKeys: ['user-25'],
    });
    expect(store.getProbeCounters().target).toMatchObject({ render: 1, mount: 1, unmount: 0, lastCid: 11 });
  });

  it('computes probe and data deltas deterministically', () => {
    expect(
      computeProbeDeltas({
        before: { target: { render: 1, mount: 1, unmount: 0 } },
        after: { target: { render: 3, mount: 1, unmount: 0, lastCid: 7 } },
        probeKeys: ['target'],
      }),
    ).toEqual({
      target: { render: 2, mount: 0, unmount: 0, lastCid: 7, lastInstancePath: undefined },
    });

    expect(
      diffChangedRowKeys(
        [{ id: 'user-25', score: 1 } as any, { id: 'user-26', score: 2 } as any],
        [{ id: 'user-25', score: 3 } as any, { id: 'user-26', score: 2 } as any],
      ),
    ).toEqual(['user-25']);

    expect(
      diffChangedItemKeys(
        [{ itemKey: 'line-7', qty: 1 }, { itemKey: 'line-8', qty: 2 }],
        [{ itemKey: 'line-7', qty: 1 }, { itemKey: 'line-8', qty: 9 }],
      ),
    ).toEqual(['line-8']);

    expect(
      diffProfiler(
        {
          commitCount: 2,
          totalActualDuration: 4,
          lastActualDuration: 2,
          averageActualDuration: 2,
          maxActualDuration: 2,
        },
        {
          commitCount: 5,
          totalActualDuration: 9,
          lastActualDuration: 3,
          averageActualDuration: 1.8,
          maxActualDuration: 3,
        },
      ),
    ).toEqual({ commitsDelta: 3, totalCommitMs: 5, maxCommitMs: 3 });
  });
});
