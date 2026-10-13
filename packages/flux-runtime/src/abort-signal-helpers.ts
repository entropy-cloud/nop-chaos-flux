import {
  composeAbortSignals as composeAbortSignalsPrimitive,
  type AbortSignalLike,
} from '@nop-chaos/flux-core';

export type { AbortSignalLike };

/**
 * Compose multiple abort signals into a single signal that aborts when ANY
 * input signal aborts. Thin shell over the flux-core primitive with the
 * default (non-detachable) strategy: the native `AbortSignal.any` fast path
 * when available, manual fallback otherwise, and the shared never-aborting
 * singleton for no inputs. The composite lives for its own lifetime, so no
 * detachable cleanup is exposed here.
 */
export function composeAbortSignals(signals: readonly (AbortSignalLike | undefined)[]): AbortSignal {
  return composeAbortSignalsPrimitive(signals).signal;
}
