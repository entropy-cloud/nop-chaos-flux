import { useEffect, useState } from 'react';
import type { SpreadsheetBridge, SpreadsheetHostSnapshot } from '../bridge.js';

export function useSnapshot(bridge: SpreadsheetBridge): SpreadsheetHostSnapshot {
  const [snapshot, setSnapshot] = useState(() => bridge.getSnapshot());
  useEffect(() => {
    const unsub = bridge.subscribe(() => {
      setSnapshot(bridge.getSnapshot());
    });
    return unsub;
  }, [bridge]);
  return snapshot;
}
