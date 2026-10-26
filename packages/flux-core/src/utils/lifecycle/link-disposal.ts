import type { AbortSignalLike } from '../abort-signals.js';

export interface DisposableGenerator {
  return?: (value?: unknown) => unknown;
}

export interface DisposalLinkOptions {
  signal?: AbortSignalLike;
  detach?: () => void;
  abort: () => void;
  generators?: Iterable<DisposableGenerator>;
}

export interface DisposalLink {
  readonly disposed: boolean;
  dispose(): void;
}

// Fixed teardown order: detach listeners first (so nothing observes the
// abort and re-saves a snapshot), force-return in-flight generators, then
// abort. Idempotent, and bound to an optional external signal.
export function linkDisposal(options: DisposalLinkOptions): DisposalLink {
  let disposed = false;
  const generators = [...(options.generators ?? [])];

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    options.signal?.removeEventListener?.('abort', dispose);
    options.detach?.();
    for (const generator of generators) {
      try {
        generator.return?.(undefined);
      } catch {
        // A generator that throws on return must not block teardown.
      }
    }
    options.abort();
  };

  if (options.signal) {
    if (options.signal.aborted) {
      dispose();
    } else {
      options.signal.addEventListener?.('abort', dispose);
    }
  }

  return {
    get disposed() {
      return disposed;
    },
    dispose,
  };
}
