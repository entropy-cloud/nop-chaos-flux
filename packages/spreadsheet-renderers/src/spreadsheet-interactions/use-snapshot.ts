import { useCallback, useSyncExternalStore } from 'react';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

export function useSnapshot(bridge: SpreadsheetBridge): SpreadsheetHostSnapshot {
  const subscribe = useCallback(
    (onStoreChange: () => void) => bridge.subscribe(onStoreChange),
    [bridge],
  );
  const getSnapshot = useCallback(() => bridge.getSnapshot(), [bridge]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
