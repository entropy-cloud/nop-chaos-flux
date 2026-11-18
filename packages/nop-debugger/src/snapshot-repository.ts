import type { StoreWriteObserver, StoreWriteObserverEvent } from '@nop-chaos/flux-core';
import { getPathValue } from './path-walk.js';

export interface ForestSnapshot {
  epoch: number;
  capturedAt: number;
  revisions: Record<string, number>;
  scopes: Record<string, Record<string, any>>;
  changedScopeIds: string[];
}

export interface ForestSnapshotCollector {
  observe(event: StoreWriteObserverEvent): void;
  flush(): ForestSnapshot | null;
  getLatest(): ForestSnapshot | null;
  getSnapshotAt(epoch: number): ForestSnapshot | null;
  getEpochs(): number[];
  getRing(): readonly ForestSnapshot[];
  dispose(): void;
}

export function createForestSnapshotCollector(input: {
  maxSnapshots?: number;
  pruneScopeIds?: () => string[];
} = {}): ForestSnapshotCollector {
  const maxSnapshots = input.maxSnapshots ?? 200;
  const ring: ForestSnapshot[] = [];
  let nextEpoch = 0;
  let latest: ForestSnapshot | null = null;
  const pendingWrites: StoreWriteObserverEvent[] = [];
  let flushScheduled = false;
  let disposed = false;

  const observer: StoreWriteObserver = {
    onWrite: (event) => {
      if (disposed) return;
      pendingWrites.push(event);
      scheduleFlush();
    },
  };

  function scheduleFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    queueMicrotask(() => {
      flushScheduled = false;
      flush();
    });
  }

  function flush(): ForestSnapshot | null {
    if (disposed || pendingWrites.length === 0) return latest;
    const liveIds = input.pruneScopeIds?.();
    const base = latest;
    const revisions: Record<string, number> = base ? { ...base.revisions } : {};
    const scopes: Record<string, Record<string, any>> = base ? { ...base.scopes } : {};
    if (liveIds) {
      for (const key of Object.keys(scopes)) {
        if (!liveIds.includes(key)) {
          delete scopes[key];
          delete revisions[key];
        }
      }
    }
    const changedScopeIds: string[] = [];
    for (const event of pendingWrites.splice(0, pendingWrites.length)) {
      const scopeId = event.scopeId ?? '__anonymous__';
      revisions[scopeId] = event.revision;
      // structural sharing: only written scopes get new references
      scopes[scopeId] = event.snapshot;
      if (!changedScopeIds.includes(scopeId)) {
        changedScopeIds.push(scopeId);
      }
    }
    const snapshot: ForestSnapshot = {
      epoch: ++nextEpoch,
      capturedAt: Date.now(),
      revisions,
      scopes,
      changedScopeIds,
    };
    latest = snapshot;
    ring.push(snapshot);
    if (ring.length > maxSnapshots) {
      ring.shift();
    }
    return snapshot;
  }

  return {
    observe: observer.onWrite,
    flush,
    getLatest: () => latest,
    getSnapshotAt(epoch: number) {
      return ring.find((snapshot) => snapshot.epoch === epoch) ?? null;
    },
    getEpochs: () => ring.map((snapshot) => snapshot.epoch),
    getRing: () => ring,
    dispose: () => {
      disposed = true;
      ring.length = 0;
      latest = null;
    },
  };
}

export interface ForestSnapshotPathChange {
  scopeId: string;
  path: string;
  kind: 'added' | 'removed' | 'changed';
}

/** Shallow path-level diff between two adjacent forest snapshots. */
export function diffForestSnapshots(prev: ForestSnapshot | null, next: ForestSnapshot): ForestSnapshotPathChange[] {
  const changes: ForestSnapshotPathChange[] = [];
  const prevScopes = prev?.scopes ?? {};
  for (const scopeId of next.changedScopeIds.length > 0 ? next.changedScopeIds : Object.keys(next.scopes)) {
    const before = prevScopes[scopeId];
    const after = next.scopes[scopeId];
    if (!after) continue;
    if (!before) {
      for (const key of Object.keys(after)) {
        changes.push({ scopeId, path: key, kind: 'added' });
      }
      continue;
    }
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      const had = key in before;
      const has = key in after;
      if (!had && has) changes.push({ scopeId, path: key, kind: 'added' });
      else if (had && !has) changes.push({ scopeId, path: key, kind: 'removed' });
      else if (!Object.is(before[key], after[key])) changes.push({ scopeId, path: key, kind: 'changed' });
    }
  }
  return changes;
}

interface FirstWriteEpochResult {
  found: boolean;
  reason?: 'scope' | 'path';
  epoch?: number;
  value?: unknown;
}

/** Reverse lookup: the earliest epoch in the ring whose snapshot contains `path` in `scopeId`. */
export function findFirstWriteEpoch(ring: readonly ForestSnapshot[], scopeId: string, path: string): FirstWriteEpochResult {
  const scopeEverPresent = ring.some((snapshot) => snapshot.scopes[scopeId] !== undefined);
  if (!scopeEverPresent) return { found: false, reason: 'scope' };
  for (const snapshot of ring) {
    const scopes = snapshot.scopes[scopeId];
    if (scopes === undefined) continue;
    const current = getPathValue(scopes, path);
    if (current === undefined) continue;
    return { found: true, epoch: snapshot.epoch, value: current };
  }
  return { found: false, reason: 'path' };
}
