import { describe, expect, it } from 'vitest';
import type { RenderMetrics } from './types.js';
import { INITIAL_METRICS } from './types.js';
import { recordProfilerCommit, summarizeBatchRun, waitForMetricQuiescence } from './measurement.js';

function createMetrics(overrides: Partial<RenderMetrics> = {}): RenderMetrics {
  return {
    ...INITIAL_METRICS,
    ...overrides,
  };
}

describe('performance-table measurement helpers', () => {
  it('records synchronized profiler commit aggregates', () => {
    const first = recordProfilerCommit(INITIAL_METRICS, 10, 1000);
    const second = recordProfilerCommit(first, 20, 1100);

    expect(first).toMatchObject({
      commitCount: 1,
      totalActualDuration: 10,
      averageActualDuration: 10,
      maxActualDuration: 10,
      commitRevision: 1,
      lastCommitAt: 1000,
    });
    expect(second).toMatchObject({
      commitCount: 2,
      totalActualDuration: 30,
      averageActualDuration: 15,
      maxActualDuration: 20,
      commitRevision: 2,
      lastCommitAt: 1100,
    });
  });

  it('builds batch-local summaries from before/after snapshots', () => {
    const summary = summarizeBatchRun({
      label: 'Host row mutation benchmark',
      steps: 20,
      before: createMetrics({ commitCount: 2, totalActualDuration: 15, maxActualDuration: 8 }),
      after: createMetrics({ commitCount: 5, totalActualDuration: 45, maxActualDuration: 18 }),
      schedulingStartedAt: 10,
      schedulingEndedAt: 70,
      settledAt: 95,
    });

    expect(summary).toEqual({
      label: 'Host row mutation benchmark',
      steps: 20,
      schedulingDurationMs: 60,
      quiescenceWaitMs: 25,
      totalDurationMs: 85,
      commitsDelta: 3,
      totalCommitMs: 30,
      avgCommitMs: 10,
      maxCommitMs: 18,
    });
  });

  it('waits until commit revision stays stable across idle frames', async () => {
    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      return setTimeout(() => callback(performance.now()), 0) as unknown as number;
    }) as typeof requestAnimationFrame;

    try {
      let metrics = createMetrics({ commitRevision: 1 });
      const pending = waitForMetricQuiescence({
        getMetrics: () => metrics,
        idleFrames: 2,
        timeoutMs: 100,
      });

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          metrics = createMetrics({ commitRevision: 2 });
          resolve();
        }, 0);
      });

      await expect(pending).resolves.toMatchObject({ commitRevision: 2 });
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
    }
  });
});
