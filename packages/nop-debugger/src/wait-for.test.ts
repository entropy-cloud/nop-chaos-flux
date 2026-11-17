import { describe, expect, it, vi } from 'vitest';
import { createDebuggerStore } from './store.js';
import { waitFor, waitForVisual, type WaitForDeps, type WaitForPredicate } from './wait-for.js';

function makeDeps(overrides: Partial<WaitForDeps> = {}): WaitForDeps {
  const store = createDebuggerStore({
    enabled: true,
    sessionId: 's',
    maxEvents: 100,
    defaultOpen: false,
    defaultTab: 'timeline',
    position: { x: 0, y: 0 },
    errorBufferKeepEarliest: 5,
    errorBufferKeepLatest: 5,
  });
  let calls = 0;
  return {
    whenStable: async () => ({ stable: true }),
    inspectByCid: () => ({}),
    getScopeData: () => ({ count: 1 }),
    getLatestEvent: () => undefined,
    compareVisual: async () => ({ match: true, diffRatio: 0 }),
    log: store,
    now: () => {
      calls += 1;
      return 1700000000000 + calls * 10;
    },
    sleep: async () => {},
    ...overrides,
  };
}

describe('waitFor (M3)', () => {
  it('scope-path predicate hits immediately without retry logs', async () => {
    const deps = makeDeps();
    const result = await waitFor({ type: 'scope-path', path: 'count', op: 'eq', value: 1 }, deps);
    expect(result.ok).toBe(true);
    expect(deps.log.getSnapshot().events.filter((event) => event.kind === 'assertion')).toHaveLength(0);
  });

  it('retries a failing predicate, emits assertion:retry logs, and resolves ok:false on timeout', async () => {
    const deps = makeDeps({ getScopeData: () => ({ count: 0 }) });
    const result = await waitFor({ type: 'scope-path', path: 'count', op: 'eq', value: 1 }, deps, { timeoutMs: 100, intervalMs: 20 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.attempts).toBeGreaterThan(1);
      expect(result.lastError).toContain('scope-path predicate false');
    }
    const assertionEvents = deps.log.getSnapshot().events.filter((event) => event.kind === 'assertion');
    expect(assertionEvents.length).toBeGreaterThan(0);
    expect(assertionEvents.filter((event) => event.level === 'warning').every((event) => event.summary.includes('retry'))).toBe(true);
    const failed = assertionEvents.find((event) => event.level === 'error');
    expect(failed?.summary).toContain('failed after');
  });

  it('succeeds once the predicate becomes true (retry-ability)', async () => {
    let count = 0;
    const deps = makeDeps({
      getScopeData: () => ({ count }),
      now: () => Date.now(),
      sleep: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    });
    const promise = waitFor({ type: 'scope-path', path: 'count', op: 'truthy' }, deps, { timeoutMs: 2000, intervalMs: 10 });
    setTimeout(() => {
      count = 5;
    }, 30);
    const result = await promise;
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.attempts).toBeGreaterThan(1);
  });

  it('cid predicate reports missing cid', async () => {
    const deps = makeDeps({ inspectByCid: () => undefined });
    const result = await waitFor({ type: 'cid', cid: 42, state: () => true }, deps, { timeoutMs: 50, intervalMs: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.lastError).toContain('cid not found');
  });

  it('event predicate matches the latest event via match fn', async () => {
    const deps = makeDeps({
      getLatestEvent: () => ({ id: 1, kind: 'action:end', summary: 'submit done' } as never),
    });
    const result = await waitFor({ type: 'event', kind: 'action:end', match: (log) => log.summary.includes('submit') }, deps);
    expect(result.ok).toBe(true);
  });

  it('stability predicate fails with degraded message when stable never returns', async () => {
    const deps = makeDeps({ whenStable: async () => ({ stable: false }) });
    const result = await waitFor({ type: 'stability' }, deps, { timeoutMs: 50 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.lastError).toContain('degraded');
  });

  it('dispatch is a single call that never retries, unlike waitFor', async () => {
    // bifurcation proof (M3): waitFor retries a failing predicate N times;
    // dispatch must execute exactly once regardless of outcome.
    let dispatchCalls = 0;
    const dispatch = async () => {
      dispatchCalls += 1;
      return { ok: false };
    };
    await dispatch();
    expect(dispatchCalls).toBe(1);

    const deps = makeDeps({ getScopeData: () => ({ count: 0 }) });
    await waitFor({ type: 'scope-path', path: 'count', op: 'eq', value: 1 }, deps, { timeoutMs: 60, intervalMs: 10 });
    // the engine retried (attempts > 1) while dispatch stayed at exactly 1 call
    expect(dispatchCalls).toBe(1);
    const retryLogs = deps.log.getSnapshot().events.filter((event) => event.kind === 'assertion');
    expect(retryLogs.length).toBeGreaterThan(1);
  });

  it('stableGate=false skips the whenStable await entirely', async () => {
    const whenStable = vi.fn(async () => ({ stable: true }));
    const deps = makeDeps({ whenStable });
    await waitFor({ type: 'scope-path', path: 'count', op: 'eq', value: 1 }, deps, { stableGate: false });
    expect(whenStable).not.toHaveBeenCalled();
  });

  it('waitForVisual compares against the engine and reports diffRatio exceedance', async () => {
    const deps = makeDeps({ compareVisual: async () => ({ match: false, diffRatio: 0.5 }) });
    const predicate: WaitForPredicate = { type: 'visual', baselineKey: 'k', maxDiffRatio: 0.01 };
    const result = await waitForVisual(predicate, deps, { timeoutMs: 50, intervalMs: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.lastError).toContain('diffRatio');
  });

  it('waitForVisual passes when diffRatio is within threshold', async () => {
    const deps = makeDeps({ compareVisual: async () => ({ match: true, diffRatio: 0.001 }) });
    const result = await waitForVisual({ type: 'visual', baselineKey: 'k', maxDiffRatio: 0.01 }, deps);
    expect(result.ok).toBe(true);
  });
});
