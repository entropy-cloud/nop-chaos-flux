export interface StabilityCounters {
  fetch: number;
  stream: number;
  transition: number;
  suspense: number;
  scopeDebounce: number;
}

export interface StabilitySnapshot {
  stable: boolean;
  degraded?: boolean;
  counters: StabilityCounters;
}

export interface StoreWriteObserverEvent {
  scopeId?: string;
  revision: number;
  snapshot: Record<string, any>;
  change: { paths: readonly string[]; sourceScopeId?: string; kind?: string; revision?: number };
}

export interface StoreWriteObserver {
  onWrite(event: StoreWriteObserverEvent): void;
}

export interface StabilityTracker {
  isStable(): boolean;
  getSnapshot(): StabilitySnapshot;
  whenStable(timeoutMs?: number): Promise<StabilitySnapshot>;
  onChange(cb: (snapshot: StabilitySnapshot) => void): () => void;
  acquire(counter: keyof StabilityCounters, token?: string): () => void;
  noteScopeWrite(): void;
}
