import { describe, expect, it } from 'vitest';
import { composeAbortSignals, type AbortSignalLike } from './abort-signals.js';

interface LikeSignalHandle {
  signal: AbortSignalLike;
  abort(): void;
  listenerCount(): number;
}

function createLikeSignal(): LikeSignalHandle {
  const controller = new AbortController();
  const listeners = new Set<() => void>();
  return {
    signal: {
      get aborted() {
        return controller.signal.aborted;
      },
      addEventListener(_type: 'abort', listener: () => void) {
        listeners.add(listener);
      },
      removeEventListener(_type: 'abort', listener: () => void) {
        listeners.delete(listener);
      },
    },
    abort() {
      controller.abort();
      for (const listener of [...listeners]) {
        listener();
      }
    },
    listenerCount: () => listeners.size,
  };
}

describe('composeAbortSignals', () => {
  it('returns the shared never-aborting singleton for zero valid signals', () => {
    const singleton = composeAbortSignals([]);
    expect(singleton.signal.aborted).toBe(false);
    expect(composeAbortSignals([]).signal).toBe(singleton.signal);
    expect(composeAbortSignals([undefined]).signal).toBe(singleton.signal);
    singleton.cleanup();
    singleton.cleanup();
  });

  it('passes a single native signal through by identity with a noop cleanup', () => {
    const controller = new AbortController();
    const composed = composeAbortSignals([controller.signal]);
    expect(composed.signal).toBe(controller.signal);
    composed.cleanup();
    composed.cleanup();
  });

  it('bridges a single AbortSignal-like input and forwards its abort', () => {
    const live = createLikeSignal();
    const composed = composeAbortSignals([live.signal]);
    expect(composed.signal).not.toBe(live.signal);
    expect(composed.signal.aborted).toBe(false);

    live.abort();
    expect(composed.signal.aborted).toBe(true);
  });

  it('bridges a single pre-aborted like input into an aborted standard signal', () => {
    const preAborted = createLikeSignal();
    preAborted.abort();
    const composed = composeAbortSignals([preAborted.signal]);
    expect(composed.signal.aborted).toBe(true);
    expect(composed.signal.reason.name).toBe('AbortError');
  });

  it('filters undefined entries in both modes', () => {
    const first = new AbortController();
    expect(composeAbortSignals([undefined, first.signal, undefined]).signal).toBe(first.signal);

    const second = new AbortController();
    const fast = composeAbortSignals([undefined, first.signal, undefined, second.signal]);
    expect(fast.signal.aborted).toBe(false);
    first.abort();
    expect(fast.signal.aborted).toBe(true);

    const third = new AbortController();
    const detachable = composeAbortSignals([undefined, second.signal, third.signal], {
      detachable: true,
    });
    expect(detachable.signal.aborted).toBe(false);
    third.abort();
    expect(detachable.signal.aborted).toBe(true);
  });

  it('uses the native any fast path with reason passthrough when not detachable', () => {
    const first = new AbortController();
    const second = new AbortController();
    const composed = composeAbortSignals([first.signal, second.signal]);

    expect(composed.signal).not.toBe(first.signal);
    expect(composed.signal).not.toBe(second.signal);

    const reason = new Error('fast-path-reason');
    first.abort(reason);
    expect(composed.signal.aborted).toBe(true);
    expect(composed.signal.reason).toBe(reason);
  });

  it('detachable forces the manual composite: cleanup detaches inputs so late aborts stay invisible', () => {
    const first = new AbortController();
    const second = new AbortController();
    const composed = composeAbortSignals([first.signal, second.signal], { detachable: true });

    composed.cleanup();
    composed.cleanup();

    const reason = new Error('late-reason');
    first.abort(reason);
    expect(composed.signal.aborted).toBe(false);

    second.abort(reason);
    expect(composed.signal.aborted).toBe(false);
  });

  it('detachable composite propagates the aborting source reason and auto-cleans on abort', () => {
    const first = new AbortController();
    const second = new AbortController();
    const composed = composeAbortSignals([first.signal, second.signal], { detachable: true });

    const reason = new Error('manual-reason');
    second.abort(reason);
    expect(composed.signal.aborted).toBe(true);
    expect(composed.signal.reason).toBe(reason);

    composed.cleanup();
    first.abort();
    expect(composed.signal.reason).toBe(reason);
  });

  it('detachable composite falls back to the default AbortError for reason-less like sources', () => {
    const first = createLikeSignal();
    const second = createLikeSignal();
    const composed = composeAbortSignals([first.signal, second.signal], { detachable: true });

    first.abort();
    expect(composed.signal.aborted).toBe(true);
    expect(composed.signal.reason.name).toBe('AbortError');
  });

  it('detachable composite stops subscribing once an already-aborted input is seen', () => {
    const preAborted = createLikeSignal();
    preAborted.abort();
    const later = createLikeSignal();

    const composed = composeAbortSignals([preAborted.signal, later.signal], { detachable: true });
    expect(composed.signal.aborted).toBe(true);
    expect(later.listenerCount()).toBe(0);
  });

  it('keeps the 0/1 short-circuits ahead of the detachable switch', () => {
    const controller = new AbortController();
    const single = composeAbortSignals([controller.signal], { detachable: true });
    expect(single.signal).toBe(controller.signal);
    single.cleanup();

    const singleton = composeAbortSignals([], { detachable: true });
    expect(composeAbortSignals([], { detachable: true }).signal).toBe(singleton.signal);
  });
});
