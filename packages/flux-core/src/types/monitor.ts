// Minimal implemented subset of the Monitor design in
// docs/architecture/flux-monitor.md — only the `error` variant is emitted
// today (render boundary + action diagnostics, plan 841); the remaining
// documented variants (action lifecycle, api, render lifecycle, expression
// diagnostics) stay a known gap there.
export interface RendererMonitorErrorEvent {
  type: 'error';
  phase: 'compile' | 'render' | 'action' | 'expression' | 'api';
  error: unknown;
  nodeId?: string;
  path?: string;
  details?: Record<string, unknown>;
}

export type RendererMonitorEvent = RendererMonitorErrorEvent;

export type RendererMonitor = (event: RendererMonitorEvent) => void;
