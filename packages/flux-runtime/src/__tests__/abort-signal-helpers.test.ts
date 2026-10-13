import { afterEach, describe, expect, it } from 'vitest';
import { composeAbortSignals, type AbortSignalLike } from '../abort-signal-helpers.js';

const NATIVE_ANY = AbortSignal.any;

afterEach(() => {
  (AbortSignal as { any?: unknown }).any = NATIVE_ANY;
});

function stubNativeAnyAway() {
  delete (AbortSignal as { any?: unknown }).any;
}

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

describe('composeAbortSignals (characterization)', () => {
  it('filters undefined entries before composing', () => {
    const first = new AbortController();
    expect(composeAbortSignals([undefined, first.signal, undefined])).toBe(first.signal);

    const second = new AbortController();
    const composed = composeAbortSignals([undefined, first.signal, undefined, second.signal]);
    expect(composed.aborted).toBe(false);
    first.abort();
    expect(composed.aborted).toBe(true);
  });

  it('returns the never-aborted singleton identity for zero valid signals', () => {
    const singleton = composeAbortSignals([]);
    expect(singleton.aborted).toBe(false);
    expect(composeAbortSignals([])).toBe(singleton);
    expect(composeAbortSignals([undefined, undefined])).toBe(singleton);
    expect(composeAbortSignals([undefined])).toBe(singleton);
  });

  it('passes a single native signal through by identity, including an already-aborted one', () => {
    const live = new AbortController();
    expect(composeAbortSignals([live.signal])).toBe(live.signal);

    const aborted = new AbortController();
    aborted.abort();
    expect(composeAbortSignals([aborted.signal])).toBe(aborted.signal);
  });

  it('composes multiple native signals through the native AbortSignal.any fast path with reason passthrough', () => {
    expect(typeof NATIVE_ANY).toBe('function');

    const first = new AbortController();
    const second = new AbortController();
    const composed = composeAbortSignals([first.signal, second.signal]);
    expect(composed).not.toBe(first.signal);
    expect(composed).not.toBe(second.signal);
    expect(composed.aborted).toBe(false);

    const reason = new Error('fast-path-cancel');
    first.abort(reason);
    expect(composed.aborted).toBe(true);
    expect(composed.reason).toBe(reason);
  });

  it('native any fast path observes a pre-aborted input immediately with its reason', () => {
    const live = new AbortController();
    const aborted = new AbortController();
    const reason = new Error('pre-aborted-reason');
    aborted.abort(reason);

    const composed = composeAbortSignals([live.signal, aborted.signal]);
    expect(composed.aborted).toBe(true);
    expect(composed.reason).toBe(reason);
  });

  it('bridges AbortSignal-like inputs through the fast path', () => {
    const like = createLikeSignal();
    const native = new AbortController();
    const composed = composeAbortSignals([like.signal, native.signal]);

    expect(composed.aborted).toBe(false);
    like.abort();
    expect(composed.aborted).toBe(true);
  });

  describe('manual fallback (AbortSignal.any stubbed away)', () => {
    it('composes native inputs via manual listeners', () => {
      stubNativeAnyAway();

      const first = new AbortController();
      const second = new AbortController();
      const composed = composeAbortSignals([first.signal, second.signal]);
      expect(composed.aborted).toBe(false);

      first.abort();
      expect(composed.aborted).toBe(true);
      expect(composed.reason.name).toBe('AbortError');
    });

    it('composes AbortSignal-like inputs via manual listeners', () => {
      stubNativeAnyAway();

      const first = createLikeSignal();
      const second = createLikeSignal();
      const composed = composeAbortSignals([first.signal, second.signal]);
      expect(composed.aborted).toBe(false);

      second.abort();
      expect(composed.aborted).toBe(true);
    });

    it('stops subscribing remaining inputs once an already-aborted input is seen', () => {
      stubNativeAnyAway();

      const preAborted = createLikeSignal();
      preAborted.abort();
      const later = createLikeSignal();

      const composed = composeAbortSignals([preAborted.signal, later.signal]);
      expect(composed.aborted).toBe(true);
      expect(later.listenerCount()).toBe(0);
    });
  });
});
