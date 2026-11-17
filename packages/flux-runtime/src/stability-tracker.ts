import type { StabilityCounters, StabilitySnapshot, StabilityTracker } from '@nop-chaos/flux-core';

const ZERO_COUNTERS: StabilityCounters = { fetch: 0, stream: 0, transition: 0, suspense: 0, scopeDebounce: 0 };

export interface StabilityTrackerOptions {
  scopeDebounceMs?: number;
}

export function createStabilityTracker(options: StabilityTrackerOptions = {}): StabilityTracker {
  const scopeDebounceMs = options.scopeDebounceMs ?? 50;
  const counters: StabilityCounters = { ...ZERO_COUNTERS };
  const waiters = new Set<{ resolve: (snapshot: StabilitySnapshot) => void; timer?: ReturnType<typeof setTimeout> }>();
  const listeners = new Set<(snapshot: StabilitySnapshot) => void>();
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let lastDegraded = false;

  function computeSnapshot(): StabilitySnapshot {
    const busy = (Object.keys(counters) as Array<keyof StabilityCounters>).some((key) => counters[key] > 0);
    const stable = !busy;
    return { stable, degraded: lastDegraded || undefined, counters: { ...counters } };
  }

  function notifyWaiters(): void {
    if (!isStable()) return;
    const snapshot = computeSnapshot();
    for (const waiter of waiters) {
      if (waiter.timer) clearTimeout(waiter.timer);
      waiter.resolve(snapshot);
    }
    waiters.clear();
  }

  function notifyListeners(): void {
    const snapshot = computeSnapshot();
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function isStable(): boolean {
    return (Object.keys(counters) as Array<keyof StabilityCounters>).every((key) => counters[key] === 0);
  }

  return {
    isStable,
    getSnapshot: computeSnapshot,
    whenStable(timeoutMs?: number): Promise<StabilitySnapshot> {
      if (isStable()) {
        return Promise.resolve(computeSnapshot());
      }
      return new Promise<StabilitySnapshot>((resolve) => {
        const waiter: { resolve: (snapshot: StabilitySnapshot) => void; timer?: ReturnType<typeof setTimeout> } = {
          resolve: (snapshot) => resolve(snapshot),
        };
        if (timeoutMs != null) {
          waiter.timer = setTimeout(() => {
            if (!waiters.delete(waiter)) return;
            lastDegraded = true;
            resolve(computeSnapshot());
          }, timeoutMs);
        }
        waiters.add(waiter);
        notifyWaiters();
      });
    },
    onChange(cb: (snapshot: StabilitySnapshot) => void): () => void {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    acquire(counter: keyof StabilityCounters): () => void {
      counters[counter] = Math.max(0, counters[counter]) + 1;
      notifyListeners();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        counters[counter] = Math.max(0, counters[counter] - 1);
        if (counter === 'scopeDebounce' && counters.scopeDebounce === 0) {
          // debounce window: stay busy until quiet for scopeDebounceMs
          counters.scopeDebounce = 1;
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            counters.scopeDebounce = 0;
            notifyListeners();
            notifyWaiters();
          }, scopeDebounceMs);
          return;
        }
        notifyListeners();
        notifyWaiters();
      };
    },
    noteScopeWrite(): void {
      counters.scopeDebounce = Math.max(counters.scopeDebounce, 1);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        counters.scopeDebounce = 0;
        notifyListeners();
        notifyWaiters();
      }, scopeDebounceMs);
      notifyListeners();
    },
  };
}
