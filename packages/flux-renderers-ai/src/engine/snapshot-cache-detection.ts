/**
 * Snapshot-cache adapter detection — plan 461 P2-3.
 *
 * `useEngineView` warns when an engine is bound to React without a
 * snapshot-caching adapter, because the native adapter rebuilds a fresh
 * snapshot object on every `getState()` call — that triggers
 * `useSyncExternalStore`'s render loop. To suppress false-positive warnings
 * when the engine is correctly backed by `ReactMessageAdapter` (whose cache
 * legitimately invalidates on every mutation), the engine itself exposes a
 * `hasStableSnapshotAdapter` flag derived here.
 */
import type { MessageStateAdapter } from './types.js';

/**
 * Plan 461 P2-3: detect whether the supplied adapter caches its snapshot
 * (currently only `ReactMessageAdapter`). Used to short-circuit the
 * `useEngineView` warning when the engine is correctly backed by a caching
 * adapter, since a mutation between two consecutive `getSnapshot` calls
 * legitimately invalidates the cache and produces 2 consecutive mismatches.
 *
 * Detection looks for the `cached` field on the adapter (an implementation
 * detail of `ReactMessageAdapter`); if you build a new caching adapter,
 * either give it the same field or extend this check.
 */
export function isAdapterCaching(adapter: MessageStateAdapter): boolean {
  return adapter != null && typeof (adapter as { cached?: unknown }).cached !== 'undefined';
}

/** Resolve the engine's `hasStableSnapshotAdapter` flag from an adapter. */
export function resolveAdapterCachesSnapshot(adapter: MessageStateAdapter): true | undefined {
  return isAdapterCaching(adapter) ? true : undefined;
}