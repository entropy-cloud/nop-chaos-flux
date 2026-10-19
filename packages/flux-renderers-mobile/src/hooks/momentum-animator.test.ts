import { afterEach, describe, expect, it, vi } from 'vitest';
import { MomentumAnimator } from './momentum-animator.js';

type FrameCallback = (now: number) => void;

function installRafStub() {
  let nextHandle = 0;
  const queue = new Map<number, FrameCallback>();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameCallback): number => {
    const handle = ++nextHandle;
    queue.set(handle, cb);
    return handle;
  });
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
    queue.delete(handle);
  });
  return {
    fireFrame(now: number) {
      // Real rAF semantics: the callback is dequeued before invocation, and
      // a cancel between dequeue and invocation prevents the run.
      const entries = [...queue.entries()];
      for (const [handle, cb] of entries) {
        if (!queue.has(handle)) continue;
        queue.delete(handle);
        cb(now);
      }
    },
    pendingCount: () => queue.size,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MomentumAnimator', () => {
  it('is not running before start and after natural completion', () => {
    const raf = installRafStub();
    const animator = new MomentumAnimator();
    expect(animator.running).toBe(false);

    const seen: number[] = [];
    animator.start({ from: 0, to: 120, duration: 600, onUpdate: (v) => seen.push(v) });
    expect(animator.running).toBe(true);

    raf.fireFrame(0);
    raf.fireFrame(300);
    raf.fireFrame(600);
    expect(animator.running).toBe(false);
    expect(seen[seen.length - 1]).toBe(120);
  });

  it('advances eased progress monotonically and ends exactly at `to`', () => {
    const raf = installRafStub();
    const animator = new MomentumAnimator();
    const seen: number[] = [];
    let completed = 0;
    animator.start({
      from: 10,
      to: -50,
      duration: 400,
      onUpdate: (v) => seen.push(v),
      onComplete: () => {
        completed += 1;
      },
    });

    raf.fireFrame(0);
    raf.fireFrame(100);
    raf.fireFrame(200);
    raf.fireFrame(400);

    expect(seen[0]).toBe(10);
    const magnitudes = seen.map((v) => Math.abs(v - 10));
    for (let i = 1; i < magnitudes.length; i += 1) {
      expect(magnitudes[i]).toBeGreaterThanOrEqual(magnitudes[i - 1]);
    }
    expect(seen[seen.length - 1]).toBe(-50);
    expect(completed).toBe(1);
  });

  it('stop() interrupts synchronously: no further frames, no onComplete', () => {
    const raf = installRafStub();
    const animator = new MomentumAnimator();
    const seen: number[] = [];
    let completed = 0;
    animator.start({
      from: 0,
      to: 100,
      duration: 500,
      onUpdate: (v) => seen.push(v),
      onComplete: () => {
        completed += 1;
      },
    });

    raf.fireFrame(0);
    animator.stop();
    expect(animator.running).toBe(false);

    const framesAfterStop = seen.length;
    raf.fireFrame(250);
    raf.fireFrame(700);
    expect(seen.length).toBe(framesAfterStop);
    expect(completed).toBe(0);
  });

  it('a new start cancels the previous animation', () => {
    const raf = installRafStub();
    const animator = new MomentumAnimator();
    const first: number[] = [];
    const second: number[] = [];
    animator.start({ from: 0, to: 100, duration: 500, onUpdate: (v) => first.push(v) });
    raf.fireFrame(0);
    animator.start({ from: 0, to: -40, duration: 500, onUpdate: (v) => second.push(v) });

    raf.fireFrame(50);
    raf.fireFrame(550);
    expect(first).toHaveLength(1);
    expect(second[second.length - 1]).toBe(-40);
  });

  it('completes immediately for zero duration', () => {
    const raf = installRafStub();
    const animator = new MomentumAnimator();
    const seen: number[] = [];
    let completed = 0;
    animator.start({
      from: 5,
      to: 9,
      duration: 0,
      onUpdate: (v) => seen.push(v),
      onComplete: () => {
        completed += 1;
      },
    });
    raf.fireFrame(42);
    expect(seen).toEqual([9]);
    expect(completed).toBe(1);
  });

  it('degrades to a synchronous jump when requestAnimationFrame is unavailable', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const animator = new MomentumAnimator();
    const seen: number[] = [];
    let completed = 0;
    animator.start({
      from: 5,
      to: 9,
      duration: 500,
      onUpdate: (v) => seen.push(v),
      onComplete: () => {
        completed += 1;
      },
    });
    expect(seen).toEqual([9]);
    expect(completed).toBe(1);
    expect(animator.running).toBe(false);
  });
});
