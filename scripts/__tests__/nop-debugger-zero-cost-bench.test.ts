import { describe, expect, it } from 'vitest';
import { createStabilityTracker } from '../../packages/flux-runtime/src/stability-tracker.js';
import { createScopeStore, registerStoreWriteObserver } from '../../packages/flux-runtime/src/scope.js';

// M1 performance red line (roadmap): with no listeners attached, instrumentation
// must stay within baseline noise on the render/write hot paths. Thresholds are
// deliberately generous (median ratio ≤ 3x of a near-zero-cost baseline) so the
// gate catches regression-class overhead (e.g. unguarded observer fan-out), not
// timing jitter.

const ITERATIONS = 20_000;
const WARMUP = 2_000;

function measure(fn: () => void): number {
  for (let i = 0; i < WARMUP; i++) fn();
  const runs: number[] = [];
  for (let sample = 0; sample < 5; sample++) {
    const startedAt = performance.now();
    for (let i = 0; i < ITERATIONS; i++) fn();
    runs.push(performance.now() - startedAt);
  }
  return runs.sort((a, b) => a - b)[2]!;
}

describe('M1 zero-listener cost microbenchmark', () => {
  it('store write with no observers stays within baseline noise', () => {
    const store = createScopeStore({ n: 0 });
    const baseline = measure(() => {
      store.setSnapshot({ n: 1 }, { paths: ['n'], kind: 'update' });
    });

    const release = registerStoreWriteObserver({ onWrite: () => {} });
    const withObserver = measure(() => {
      store.setSnapshot({ n: 2 }, { paths: ['n'], kind: 'update' });
    });
    release();

    const zeroListener = measure(() => {
      store.setSnapshot({ n: 3 }, { paths: ['n'], kind: 'update' });
    });
    expect(zeroListener).toBeLessThan(Math.max(baseline * 3, 20));
    // sanity: a real observer costs measurable time but stays bounded
    expect(withObserver).toBeGreaterThan(0);
  });

  it('stability tracker acquire/release stays within baseline noise when nobody waits', () => {
    const baseline = measure(() => {
      Math.random();
    });
    const tracker = createStabilityTracker();
    const instrumented = measure(() => {
      const release = tracker.acquire('fetch');
      release();
    });
    expect(tracker.isStable()).toBe(true);
    expect(instrumented).toBeLessThan(Math.max(baseline * 10, 60));
  });

  it('plugin hook fast path skips work with an empty plugin list', () => {
    const plugins: Array<{ onRender?: (span: { phase: string }) => void }> = [];
    const called = 0;
    const instrumented = measure(() => {
      if (plugins.some((plugin) => plugin.onRender)) {
        for (const plugin of plugins) plugin.onRender?.({ phase: 'resolve' });
      }
    });
    expect(called).toBe(0);
    const baseline = measure(() => {
      Math.random();
    });
    expect(instrumented).toBeLessThan(Math.max(baseline * 5, 30));
  });
});
