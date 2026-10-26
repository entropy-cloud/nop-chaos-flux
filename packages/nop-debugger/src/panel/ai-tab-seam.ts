import { useSyncExternalStore } from 'react';
import type { NopDebuggerController, NopDebuggerPanelTabDescriptor } from '../types.js';

/**
 * Subscribe the panel to the host tab registry (AI-agnostic seam). The
 * descriptor list is chrome state, deliberately outside the event snapshot
 * store, so this has its own subscription channel.
 */
export function usePanelTabs(controller: NopDebuggerController): NopDebuggerPanelTabDescriptor[] {
  return useSyncExternalStore(
    (listener) => controller.subscribePanelTabs(listener),
    () => controller.getPanelTabs(),
    () => controller.getPanelTabs(),
  );
}
