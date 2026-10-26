export interface LifecycleToken {
  readonly epoch: number;
}

export interface LifecycleGuard {
  token(): LifecycleToken;
  isCurrent(token: LifecycleToken): boolean;
  invalidate(): void;
  guard<T>(token: LifecycleToken, fn: () => T): T | undefined;
}

// Monotonic epoch. Every async continuation captures a token before awaiting
// and re-checks it before writing back; a destructive transition (delete /
// clear / switch / dispose) bumps the epoch so stale continuations drop out
// instead of writing into a replaced or dead target.
export function createLifecycleGuard(): LifecycleGuard {
  let epoch = 0;
  return {
    token: () => ({ epoch }),
    isCurrent: (token) => token.epoch === epoch,
    invalidate: () => {
      epoch += 1;
    },
    guard: (token, fn) => (token.epoch === epoch ? fn() : undefined),
  };
}
