import { useCallback, useSyncExternalStore } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

export function useSnapshot(bridge: SpreadsheetBridge): SpreadsheetHostSnapshot {
  const subscribe = useCallback(
    (onStoreChange: () => void) => bridge.subscribe(onStoreChange),
    [bridge],
  );
  const getSnapshot = useCallback(() => bridge.getSnapshot(), [bridge]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSnapshotSelector<T>(
  bridge: SpreadsheetBridge,
  selector: (snapshot: SpreadsheetHostSnapshot) => T,
  isEqual?: (left: T, right: T) => boolean,
): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) => bridge.subscribe(onStoreChange),
    [bridge],
  );
  const getSnapshot = useCallback(() => bridge.getSnapshot(), [bridge]);
  return useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getSnapshot,
    selector,
    isEqual,
  );
}
