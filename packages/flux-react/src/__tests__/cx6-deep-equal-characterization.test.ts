import { describe, expect, it, vi } from 'vitest';
import { createNodeSourcePropController } from '../node-source-prop-controller.js';

// CX-6 characterization (plan 584): pins the current behavior of the
// module-private arePlainObjectsEqual in node-source-prop-controller.ts
// through the controller's observable short-circuit. Two consecutive run()
// calls with the same scope/ctx produce exactly one observer.run call when
// the baseValues are structurally equal, and a second observer.run call when
// they are not. After the flux-core deepEqual primitive lands, the same
// eight pins are replicated directly against it in flux-core.

function createObserverMock() {
  let snapshot = { value: {} as Record<string, unknown> };
  return {
    observer: {
      getSnapshot: vi.fn(() => snapshot),
      subscribe: vi.fn(() => () => undefined),
      run: vi.fn((input: { baseValue?: Record<string, unknown> }) => {
        snapshot = { value: input.baseValue ?? {} };
      }),
      dispose: vi.fn(),
    },
  };
}

function createScope() {
  return {
    id: 'scope-1',
    path: '$',
    value: {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    update() {},
    merge() {},
  } as any;
}

function countObserverRuns(firstBaseValue: unknown, secondBaseValue: unknown): number {
  const { observer } = createObserverMock();
  const controller = createNodeSourcePropController(
    {
      sourcePropKeys: [],
      sourceStatePropKeys: {},
    } as any,
    { createSourceObserver: () => observer } as any,
  );
  const scope = createScope();
  controller.run(firstBaseValue as Record<string, unknown>, scope);
  controller.run(secondBaseValue as Record<string, unknown>, scope);
  return observer.run.mock.calls.length;
}

describe('arePlainObjectsEqual characterization via controller short-circuit (CX-6 eight-pin grid)', () => {
  it('pin 1 cyclic pair compares equal (WeakMap visited pairing)', () => {
    const left: { name: string; self?: unknown } = { name: 'a' };
    left.self = left;
    const right: { name: string; self?: unknown } = { name: 'a' };
    right.self = right;

    expect(countObserverRuns(left, right)).toBe(1);
  });

  it('pin 2 DAG shared reference compares equal', () => {
    const shared = { v: 1 };

    expect(countObserverRuns({ x: shared, y: shared }, { x: { v: 1 }, y: { v: 1 } })).toBe(1);
  });

  it('pin 3 inherited key on the right satisfies `key in` membership: equal', () => {
    const right: Record<string, unknown> = Object.assign(Object.create({ a: 1 }), { z: 5 });

    expect(countObserverRuns({ a: 1 }, right)).toBe(1);
  });

  it('pin 4 zero-own-key branded objects: Date(1) equals Date(2) (quirk, do not fix)', () => {
    expect(countObserverRuns(new Date(1), new Date(2))).toBe(1);
  });

  it('pin 5 {a: undefined} vs {}: not equal (undefined-valued key counts in key length)', () => {
    expect(countObserverRuns({ a: undefined }, {})).toBe(2);
  });

  it('pin 6 NaN pair compares equal (Object.is)', () => {
    expect(countObserverRuns({ v: NaN }, { v: NaN })).toBe(1);
  });

  it('pin 7 +0 vs -0: not equal (Object.is)', () => {
    expect(countObserverRuns({ v: 0 }, { v: -0 })).toBe(2);
  });

  it('pin 8 distinct function values: not equal (not same reference)', () => {
    expect(countObserverRuns({ fn: () => 1 }, { fn: () => 1 })).toBe(2);
  });
});
