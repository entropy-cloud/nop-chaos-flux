import type { ErrorMonitorPayload, RendererEnv } from '../types/renderer-api';

export interface RuntimeHostIssueInput {
  env: RendererEnv;
  level?: 'info' | 'success' | 'warning' | 'error';
  message?: string;
  error?: unknown;
  phase?: ErrorMonitorPayload['phase'];
  nodeId?: string;
  path?: string;
  details?: Record<string, unknown>;
  notify?: boolean;
  monitor?: boolean;
}

export function reportRuntimeHostIssue(input: RuntimeHostIssueInput): void {
  const level = input.level ?? 'error';
  const message = input.message ?? (input.error instanceof Error ? input.error.message : String(input.error ?? 'Runtime host issue'));

  if (input.notify !== false) {
    input.env.notify(level, message);
  }

  if (input.monitor !== false && input.error !== undefined) {
    input.env.monitor?.onError?.({
      phase: input.phase ?? 'render',
      error: input.error,
      nodeId: input.nodeId,
      path: input.path,
      details: input.details
    });
  }
}
