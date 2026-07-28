import type { RendererEnv } from '../types/renderer-api.js';

export interface RuntimeHostIssueInput {
  env: RendererEnv;
  level?: 'info' | 'success' | 'warning' | 'error';
  message?: string;
  error?: unknown;
  notify?: boolean;
  /** 以下字段保留兼容性，当前不再转发到 monitor（monitor 已移除） */
  phase?: string;
  nodeId?: string;
  path?: string;
  details?: Record<string, unknown>;
  monitor?: boolean;
}

export function reportRuntimeHostIssue(input: RuntimeHostIssueInput): void {
  const level = input.level ?? 'error';
  const message =
    input.message ??
    (input.error instanceof Error
      ? input.error.message
      : String(input.error ?? 'Runtime host issue'));

  if (input.notify !== false) {
    input.env.notify(level, message);
  }
}
