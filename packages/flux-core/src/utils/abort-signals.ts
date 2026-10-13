export interface AbortSignalLike {
  readonly aborted: boolean;
  addEventListener(
    type: 'abort',
    listener: () => void,
    options?: { once?: boolean },
  ): void;
  removeEventListener?(type: 'abort', listener: () => void): void;
}

const NEVER_ABORTED_SIGNAL: AbortSignal = new AbortController().signal;

function noop(): void {}

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

/**
 * Compose multiple abort signals into a single signal that aborts when ANY
 * input signal aborts, together with a `cleanup` that detaches the composite.
 *
 * Semantics:
 *  - `undefined` entries are filtered out.
 *  - Zero valid inputs return the shared never-aborting singleton (noop cleanup).
 *  - One valid input passes the (bridged) signal through by identity (noop cleanup).
 *  - Two or more inputs: by default the native `AbortSignal.any` fast path
 *    (Node 20.3+, modern browsers) with a noop cleanup; `options.detachable`
 *    forces the manual listener-based composite so `cleanup` actually detaches
 *    every input listener (plan 583 张力点③ — per-dispatch consumers such as the
 *    action dispatcher need teardown; a noop cleanup there would leak listeners
 *    and make late root aborts re-visible after the dispatch settled).
 *
 * The manual composite forwards the aborting source's `reason` into the
 * composite (plan 583 张力点① — the action dispatcher reads `.reason` off the
 * merged signal, so reason passthrough is externally observable). Abort-signal
 * -like inputs without a `reason` field fall back to the default `AbortError`.
 */
export function composeAbortSignals(
  signals: readonly (AbortSignalLike | undefined)[],
  options?: { detachable?: boolean },
): { signal: AbortSignal; cleanup: () => void } {
  const valid = signals.filter((s): s is AbortSignalLike => s !== undefined);

  if (valid.length === 0) {
    return { signal: NEVER_ABORTED_SIGNAL, cleanup: noop };
  }

  if (valid.length === 1) {
    return { signal: toStandardAbortSignal(valid[0]), cleanup: noop };
  }

  // Fast path: native AbortSignal.any (Node 20.3+, modern browsers). Must be
  // called on the AbortSignal constructor itself (static method), not as a
  // detached reference, otherwise `this` is wrong and it throws.
  if (options?.detachable !== true && typeof AbortSignal.any === 'function') {
    return { signal: AbortSignal.any(valid.map(toStandardAbortSignal)), cleanup: noop };
  }

  // Manual composite: create a controller and wire up listeners.
  const controller = new AbortController();
  const subscriptions: Array<readonly [AbortSignalLike, () => void]> = [];

  const detachAll = () => {
    for (const [source, listener] of subscriptions) {
      source.removeEventListener?.('abort', listener);
    }
  };

  const onSourceAbort = (source: AbortSignalLike) => {
    if (!controller.signal.aborted) {
      // AbortSignalLike predates `reason` structurally; native signals always
      // carry it and `abort(undefined)` falls back to the default AbortError.
      controller.abort((source as { reason?: unknown }).reason);
    }
    detachAll();
  };

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    detachAll();
  };

  for (const source of valid) {
    if (source.aborted) {
      onSourceAbort(source);
      break;
    }
    const listener = () => onSourceAbort(source);
    subscriptions.push([source, listener]);
    source.addEventListener('abort', listener, { once: true });
  }

  controller.signal.addEventListener('abort', cleanup, { once: true });

  return { signal: controller.signal, cleanup };
}
