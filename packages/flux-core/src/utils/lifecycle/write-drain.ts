export interface WriteDrain {
  enqueue(key: string, write: () => Promise<void> | void): Promise<void>;
  barrier(): Promise<void>;
  evict(key: string): void;
  pendingKeys(): string[];
}

// Serialises writes per key and lets destructive paths wait for every
// in-flight write before they re-read storage, so a save that was already
// scheduled cannot resurrect a record that is being deleted or cleared.
export function createWriteDrain(): WriteDrain {
  const chains = new Map<string, Promise<void>>();
  const inFlight = new Set<Promise<void>>();

  const settle = (promise: Promise<void>) => promise.then(() => undefined, () => undefined);

  return {
    enqueue(key, write) {
      const previous = chains.get(key) ?? Promise.resolve();
      const run = previous.then(() => write());
      const tail = settle(run);
      chains.set(key, tail);
      inFlight.add(tail);
      void tail.then(() => {
        inFlight.delete(tail);
        if (chains.get(key) === tail) chains.delete(key);
      });
      return run;
    },
    barrier() {
      return Promise.all([...inFlight]).then(() => undefined);
    },
    evict(key) {
      chains.delete(key);
    },
    pendingKeys() {
      return [...chains.keys()];
    },
  };
}
