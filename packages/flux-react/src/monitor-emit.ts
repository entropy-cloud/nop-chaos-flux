import type { RendererMonitor, RendererMonitorErrorEvent } from '@nop-chaos/flux-core';

// plan 841: shared fire-and-forget emit for the monitor channel — a throwing
// monitor is swallowed with a console.warn per the flux-monitor contract
// (principle 3).
export function emitMonitorError(
  monitor: RendererMonitor | undefined,
  event: RendererMonitorErrorEvent,
): void {
  if (!monitor) {
    return;
  }
  try {
    monitor(event);
  } catch (monitorError) {
    console.warn('[flux] monitor threw:', monitorError);
  }
}
