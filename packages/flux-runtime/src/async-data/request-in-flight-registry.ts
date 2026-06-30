import type { ApiCacheStore } from './api-cache.js';

export interface RequestInFlightRegistry {
  acquire<T>(key: string, run: (signal: AbortSignal) => Promise<T>): Promise<T>;
  dispose(): void;
}

function createDisposedInFlightAbortReason(): Error {
  return Object.assign(new Error('In-flight request registry was disposed', { cause: 'in-flight-disposed' }), {
    name: 'AbortError',
  });
}

export function createRequestInFlightRegistry(): RequestInFlightRegistry {
  const entries = new Map<string, { promise: Promise<unknown>; controller: AbortController }>();

  return {
    acquire<T>(key: string, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
      const existing = entries.get(key);
      if (existing) {
        return existing.promise as Promise<T>;
      }

      const controller = new AbortController();
      const promise = Promise.resolve()
        .then(() => run(controller.signal))
        .finally(() => {
          if (entries.get(key)?.promise === promise) {
            entries.delete(key);
          }
        });

      entries.set(key, { promise, controller });
      return promise;
    },
    dispose(): void {
      for (const { controller } of entries.values()) {
        controller.abort(createDisposedInFlightAbortReason());
      }
      entries.clear();
    },
  };
}

export interface SchemaFetchSharingContext {
  apiCache: ApiCacheStore;
  inFlight: RequestInFlightRegistry;
}
