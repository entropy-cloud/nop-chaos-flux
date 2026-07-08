export interface AbortSignalLike {
  readonly aborted: boolean;
  addEventListener(
    type: 'abort',
    listener: () => void,
    options?: { once?: boolean },
  ): void;
  removeEventListener?(type: 'abort', listener: () => void): void;
}

/**
 * Compose multiple abort signals into a single signal that aborts when ANY
 * input signal aborts. Uses native `AbortSignal.any` when available (Node 20+,
 * modern browsers); otherwise falls back to a manual listener-based composite.
 *
 * Returns a never-aborting signal when called with no inputs.
 */
export function composeAbortSignals(signals: readonly (AbortSignalLike | undefined)[]): AbortSignal {
  const valid = signals.filter((s): s is AbortSignalLike => s !== undefined);

  if (valid.length === 0) {
    return NEVER_ABORTED_SIGNAL;
  }

  if (valid.length === 1) {
    return toStandardAbortSignal(valid[0]);
  }

  // Fast path: native AbortSignal.any (Node 20.3+, modern browsers). Must be
  // called on the AbortSignal constructor itself (static method), not as a
  // detached reference, otherwise `this` is wrong and it throws.
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(valid.map(toStandardAbortSignal));
  }

  // Manual fallback: create a controller and wire up listeners.
  const controller = new AbortController();
  const onAbort = () => {
    controller.abort();
    for (const s of valid) {
      s.removeEventListener?.('abort', onAbort);
    }
  };

  for (const s of valid) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener('abort', onAbort, { once: true });
  }

  return controller.signal;
}

const NEVER_ABORTED_SIGNAL: AbortSignal = new AbortController().signal;

function toStandardAbortSignal(signal: AbortSignalLike): AbortSignal {
  // AbortSignal-like already satisfies the structural shape of AbortSignal for
  // our purposes. If it's already a native AbortSignal, return as-is; otherwise
  // bridge via a controller (rare path — only triggered by custom test doubles).
  if (signal instanceof AbortSignal) {
    return signal;
  }

  if (signal.aborted) {
    const controller = new AbortController();
    controller.abort();
    return controller.signal;
  }

  const controller = new AbortController();
  signal.addEventListener('abort', () => controller.abort(), { once: true });
  return controller.signal;
}
