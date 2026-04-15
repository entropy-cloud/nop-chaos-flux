import { describe, expect, it } from 'vitest';
import { createScopeRef, createScopeStore } from '../scope';

const performanceApi = globalThis.performance;
const processEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
const runBenchmarks = processEnv?.NOP_RUN_SCOPE_BENCH === '1';
const benchDescribe = runBenchmarks ? describe : describe.skip;

type BenchStats = {
  name: string;
  iterations: number;
  samples: number;
  medianNsPerOp: number;
  p95NsPerOp: number;
  minNsPerOp: number;
  maxNsPerOp: number;
};

function createParentSnapshot(rootCount: number) {
  const parent: Record<string, unknown> = {};

  for (let index = 0; index < rootCount; index += 1) {
    parent[`shared${index}`] = index;
  }

  parent.deep = {
    stable: 'parent',
    score: 42,
  };

  return parent;
}

function createChildSnapshot(rootCount: number) {
  const child: Record<string, unknown> = {};

  for (let index = 0; index < rootCount; index += 1) {
    child[`local${index}`] = index * 3;
  }

  child.deep = {
    stable: 'child',
    score: 84,
  };

  return child;
}

function createPrototypeView(parent: Record<string, unknown>, child: Record<string, unknown>) {
  return Object.assign(Object.create(parent), child) as Record<string, unknown>;
}

function getByPath(input: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = input;

  for (const segment of segments) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function percentile(sorted: number[], ratio: number) {
  if (sorted.length === 0) {
    return 0;
  }

  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function runBenchmark(name: string, iterations: number, samples: number, fn: (iteration: number) => number): BenchStats {
  let sink = 0;

  for (let warmup = 0; warmup < 5; warmup += 1) {
    for (let iteration = 0; iteration < Math.min(10_000, iterations); iteration += 1) {
      sink ^= fn(iteration);
    }
  }

  const durations: number[] = [];
  for (let sample = 0; sample < samples; sample += 1) {
    const startedAt = performanceApi.now();
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      sink ^= fn(iteration);
    }
    const endedAt = performanceApi.now();
    durations.push(((endedAt - startedAt) * 1_000_000) / iterations);
  }

  if (sink === Number.MIN_SAFE_INTEGER) {
    throw new Error('unreachable benchmark sink');
  }

  const sorted = [...durations].sort((left, right) => left - right);

  return {
    name,
    iterations,
    samples,
    medianNsPerOp: percentile(sorted, 0.5),
    p95NsPerOp: percentile(sorted, 0.95),
    minNsPerOp: sorted[0],
    maxNsPerOp: sorted[sorted.length - 1],
  };
}

function formatStats(stats: BenchStats) {
  return {
    benchmark: stats.name,
    iterations: stats.iterations,
    samples: stats.samples,
    median_ns_op: stats.medianNsPerOp.toFixed(1),
    p95_ns_op: stats.p95NsPerOp.toFixed(1),
    min_ns_op: stats.minNsPerOp.toFixed(1),
    max_ns_op: stats.maxNsPerOp.toFixed(1),
  };
}

benchDescribe('Scope read benchmark', () => {
  it('measures steady-state access and cold materialization against a prototype-chain view', { timeout: 20_000 }, () => {
    const parentSnapshot = createParentSnapshot(64);
    const childSnapshotA = createChildSnapshot(12);
    const childSnapshotB = { ...createChildSnapshot(12) };

    const parentScope = createScopeRef({
      id: 'bench-parent',
      path: 'bench-parent',
      initialData: parentSnapshot,
    });
    const childStore = createScopeStore(childSnapshotA);
    const childScope = createScopeRef({
      id: 'bench-child',
      path: 'bench-child',
      store: childStore,
      parent: parentScope,
    });

    const prototypeView = createPrototypeView(parentSnapshot, childSnapshotA);
    const sharedKey = 'shared32';
    const localKey = 'local6';
    const deepPath = 'deep.score';

    expect(childScope.read()[sharedKey]).toBe(prototypeView[sharedKey]);
    expect(childScope.read()[localKey]).toBe(prototypeView[localKey]);
    expect((childScope.read().deep as Record<string, unknown>).score).toBe((prototypeView.deep as Record<string, unknown>).score);
    expect(childScope.get(deepPath)).toBe(getByPath(prototypeView, deepPath));

    const hotScopeRead = runBenchmark('scope.read() cached + root access', 250_000, 12, () => {
      const value = childScope.read();
      return Number(value[sharedKey]) + Number(value[localKey]) + Number((value.deep as Record<string, unknown>).score);
    });

    const hotPrototypeRead = runBenchmark('prototype view + root access', 250_000, 12, () => {
      return Number(prototypeView[sharedKey]) + Number(prototypeView[localKey]) + Number((prototypeView.deep as Record<string, unknown>).score);
    });

    const hotScopeGet = runBenchmark('scope.get(path)', 250_000, 12, () => {
      return Number(childScope.get(sharedKey)) + Number(childScope.get(localKey)) + Number(childScope.get(deepPath));
    });

    const hotPrototypeGet = runBenchmark('prototype view getByPath(path)', 250_000, 12, () => {
      return Number(getByPath(prototypeView, sharedKey)) + Number(getByPath(prototypeView, localKey)) + Number(getByPath(prototypeView, deepPath));
    });

    let toggle = false;
    const coldScopeRead = runBenchmark('scope.read() rematerialize + root access', 35_000, 10, () => {
      toggle = !toggle;
      childStore.setSnapshot(toggle ? childSnapshotA : childSnapshotB, {
        paths: ['local6', 'deep'],
        kind: 'replace',
        sourceScopeId: 'bench-child',
      });
      const value = childScope.read();
      return Number(value[sharedKey]) + Number(value[localKey]) + Number((value.deep as Record<string, unknown>).score);
    });

    toggle = false;
    const coldPrototypeRead = runBenchmark('prototype create + root access', 35_000, 10, () => {
      toggle = !toggle;
      const view = createPrototypeView(parentSnapshot, toggle ? childSnapshotA : childSnapshotB);
      return Number(view[sharedKey]) + Number(view[localKey]) + Number((view.deep as Record<string, unknown>).score);
    });

    const hotScopeKeys = runBenchmark('Object.keys(scope.read())', 120_000, 10, () => Object.keys(childScope.read()).length);

    const hotPrototypeKeys = runBenchmark('Object.keys(prototype view)', 120_000, 10, () => Object.keys(prototypeView).length);

    const hotScopeStringify = runBenchmark('JSON.stringify(scope.read())', 10_000, 8, () => JSON.stringify(childScope.read()).length);

    const hotPrototypeStringify = runBenchmark('JSON.stringify(prototype view)', 10_000, 8, () => JSON.stringify(prototypeView).length);

    const hotScopeSpread = runBenchmark('spread clone from scope.read()', 40_000, 10, () => Object.keys({ ...childScope.read() }).length);

    const hotPrototypeSpread = runBenchmark('spread clone from prototype view', 40_000, 10, () => Object.keys({ ...prototypeView }).length);

    console.table([
      formatStats(hotScopeRead),
      formatStats(hotPrototypeRead),
      formatStats(hotScopeGet),
      formatStats(hotPrototypeGet),
      formatStats(coldScopeRead),
      formatStats(coldPrototypeRead),
      formatStats(hotScopeKeys),
      formatStats(hotPrototypeKeys),
      formatStats(hotScopeStringify),
      formatStats(hotPrototypeStringify),
      formatStats(hotScopeSpread),
      formatStats(hotPrototypeSpread),
    ]);

    expect(hotScopeRead.medianNsPerOp).toBeGreaterThan(0);
    expect(hotPrototypeRead.medianNsPerOp).toBeGreaterThan(0);
    expect(hotScopeGet.medianNsPerOp).toBeGreaterThan(0);
    expect(hotPrototypeGet.medianNsPerOp).toBeGreaterThan(0);
    expect(coldScopeRead.medianNsPerOp).toBeGreaterThan(0);
    expect(coldPrototypeRead.medianNsPerOp).toBeGreaterThan(0);
    expect(hotScopeKeys.medianNsPerOp).toBeGreaterThan(0);
    expect(hotPrototypeKeys.medianNsPerOp).toBeGreaterThan(0);
    expect(hotScopeStringify.medianNsPerOp).toBeGreaterThan(0);
    expect(hotPrototypeStringify.medianNsPerOp).toBeGreaterThan(0);
    expect(hotScopeSpread.medianNsPerOp).toBeGreaterThan(0);
    expect(hotPrototypeSpread.medianNsPerOp).toBeGreaterThan(0);
  });
});
