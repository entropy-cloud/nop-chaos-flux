import { describe, expect, it } from 'vitest';
import { createAutomationApi } from './automation.js';
import { createForestSnapshotCollector } from './snapshot-repository.js';

// M1 V2 surface: back-compatible additions to __NOP_DEBUGGER_API__.

function makeMinimalInput(overrides: Record<string, unknown> = {}) {
  return {
    controllerId: 'c',
    sessionId: 's',
    getSnapshot: () => {
      throw new Error('not used in this test');
    },
    getOverview: () => {
      throw new Error('not used');
    },
    queryEvents: () => [],
    ...overrides,
  } as unknown as Parameters<typeof createAutomationApi>[0];
}

describe('automation API V2 (M1)', () => {
  it('exposes getStability from the wired tracker provider', () => {
    const api = createAutomationApi(
      makeMinimalInput({
        getStability: () => ({ stable: false, counters: { fetch: 1 } }),
      }),
    );
    expect(api.getStability?.()).toEqual({ stable: false, counters: { fetch: 1 } });
  });

  it('getSnapshotAt resolves collector epochs and misses unknown ones', () => {
    const collector = createForestSnapshotCollector();
    collector.observe({ scopeId: 'root', revision: 1, snapshot: { a: 1 }, change: { paths: ['a'], revision: 1 } });
    collector.flush();
    const epoch = collector.getEpochs()[0]!;
    const api = createAutomationApi(
      makeMinimalInput({
        getSnapshotAt: (e: number) => collector.getSnapshotAt(e),
      }),
    );
    expect(api.getSnapshotAt?.(epoch)).not.toBeNull();
    expect(api.getSnapshotAt?.(epoch + 100)).toBeNull();
  });

  it('stays constructible without V2 providers (V1 back-compat)', () => {
    const api = createAutomationApi(makeMinimalInput());
    expect(api.version).toBe('1');
    expect(api.getStability).toBeUndefined();
    expect(api.getSnapshotAt).toBeUndefined();
  });
});
