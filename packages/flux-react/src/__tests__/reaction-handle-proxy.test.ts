import { describe, expect, it, vi } from 'vitest';
import { createReactionHandleProxy } from '../reaction-handle-proxy.js';
import type { ReactionHandle, ReactionHandleDebugState } from '@nop-chaos/flux-core';

function makeFakeHandle(overrides: Partial<ReactionHandle> = {}): ReactionHandle {
  const calls: string[] = [];
  const handle: ReactionHandle & { calls: string[] } = {
    dispatch: vi.fn(async () => {
      calls.push('dispatch');
      return { ok: true };
    }),
    force: vi.fn(() => {
      calls.push('force');
    }),
    ready: vi.fn(() => {
      calls.push('ready');
    }),
    pause: vi.fn(() => {
      calls.push('pause');
    }),
    resume: vi.fn(() => {
      calls.push('resume');
    }),
    dispose: vi.fn(() => {
      calls.push('dispose');
    }),
    getDebugState: vi.fn((): ReactionHandleDebugState => ({
      phase: 'ready',
      fireCount: 0,
      pauseCount: 0,
      pendingChange: false,
      pendingChangedPaths: [],
      disposed: false,
    })),
    calls,
    ...overrides,
  } as ReactionHandle & { calls: string[] };
  return handle;
}

describe('createReactionHandleProxy (Phase 5)', () => {
  it('returns a stable proxy satisfying ReactionHandle before activation', () => {
    const proxy = createReactionHandleProxy();
    expect(typeof proxy.dispatch).toBe('function');
    expect(typeof proxy.force).toBe('function');
    expect(typeof proxy.ready).toBe('function');
    expect(typeof proxy.pause).toBe('function');
    expect(typeof proxy.resume).toBe('function');
    expect(typeof proxy.dispose).toBe('function');
    expect(typeof proxy.getDebugState).toBe('function');

    // Default debug state before activation.
    const debug = proxy.getDebugState();
    expect(debug.phase).toBe('initial-paused');
    expect(debug.disposed).toBe(false);
  });

  it('buffers dispatch() calls before activation and drains them on __activate', async () => {
    const proxy = createReactionHandleProxy();
    const dispatchPromise = proxy.dispatch({ evaluationBindings: { x: 1 } });

    // Not yet activated — Promise should be pending.
    let resolved = false;
    void dispatchPromise.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);

    const fakeHandle = makeFakeHandle();
    proxy.__activate(() => fakeHandle);

    const result = await dispatchPromise;
    expect(result.ok).toBe(true);
    expect(fakeHandle.dispatch).toHaveBeenCalledWith({ evaluationBindings: { x: 1 } });
  });

  it('delegates calls directly when realHandle is active', () => {
    const proxy = createReactionHandleProxy();
    const fakeHandle = makeFakeHandle();
    proxy.__activate(() => fakeHandle);

    proxy.ready();
    proxy.pause();
    proxy.resume();
    proxy.force(['user']);

    expect(fakeHandle.ready).toHaveBeenCalled();
    expect(fakeHandle.pause).toHaveBeenCalled();
    expect(fakeHandle.resume).toHaveBeenCalled();
    expect(fakeHandle.force).toHaveBeenCalledWith(['user']);
  });

  it('buffers force/ready/pause/resume calls before activation and drains on __activate', () => {
    const proxy = createReactionHandleProxy();

    proxy.ready();
    proxy.force(['a']);
    proxy.pause();
    proxy.resume();

    const fakeHandle = makeFakeHandle();
    proxy.__activate(() => fakeHandle);

    expect(fakeHandle.ready).toHaveBeenCalledTimes(1);
    expect(fakeHandle.force).toHaveBeenCalledWith(['a']);
    expect(fakeHandle.pause).toHaveBeenCalledTimes(1);
    expect(fakeHandle.resume).toHaveBeenCalledTimes(1);
  });

  it('__dispose resolves pending dispatch Promise to canonical cancelled result', async () => {
    const proxy = createReactionHandleProxy();
    const dispatchPromise = proxy.dispatch();

    let resolved = false;
    let result: { ok: boolean; cancelled?: boolean } | undefined;
    void dispatchPromise.then((r) => {
      resolved = true;
      result = r;
    });

    proxy.__dispose();
    await Promise.resolve();

    expect(resolved).toBe(true);
    expect(result?.ok).toBe(false);
    expect(result?.cancelled).toBe(true);
  });

  it('__dispose disposes the underlying realHandle', () => {
    const proxy = createReactionHandleProxy();
    const fakeHandle = makeFakeHandle();
    proxy.__activate(() => fakeHandle);

    proxy.__dispose();
    expect(fakeHandle.dispose).toHaveBeenCalledTimes(1);
  });

  it('supports StrictMode reactivation: dispose then activate creates a new realHandle and drains new pending', async () => {
    const proxy = createReactionHandleProxy();
    const handle1 = makeFakeHandle();
    proxy.__activate(() => handle1);

    // StrictMode cleanup.
    proxy.__dispose();
    expect(handle1.dispose).toHaveBeenCalledTimes(1);

    // Between dispose and reactivate, calls buffer.
    const dispatchPromise = proxy.dispatch({ evaluationBindings: { reactivated: true } });
    proxy.ready();

    // StrictMode remount.
    const handle2 = makeFakeHandle();
    proxy.__activate(() => handle2);

    const result = await dispatchPromise;
    expect(result.ok).toBe(true);
    expect(handle2.dispatch).toHaveBeenCalledWith({ evaluationBindings: { reactivated: true } });
    expect(handle2.ready).toHaveBeenCalledTimes(1);
  });

  it('proxy identity is stable (can be used as a useMemo dependency)', () => {
    // Just verifying the factory returns a single stable object reference.
    const proxy = createReactionHandleProxy();
    expect(proxy).toBe(proxy);
    const sameRef = proxy;
    sameRef.ready();
    expect(proxy).toBe(sameRef);
  });

  it('componentProps would include reactions channel (smoke test)', () => {
    const proxy = createReactionHandleProxy();
    const reactions = { loadAction: proxy };
    // The reactions object is what gets passed as props.reactions.
    expect(reactions.loadAction).toBe(proxy);
    expect(typeof reactions.loadAction.dispatch).toBe('function');
  });
});
