import type { ActionMonitorPayload, ActionResult, ImportedLibraryLoader } from './actions';
import type { ScopeRef } from './scope';
import type { ExecutableApiRequest, SchemaPath } from './schema';

export interface ApiRequestContext {
  scope: ScopeRef;
  env: RendererEnv;
  signal?: AbortSignal;
  interactionId?: string;
  requestInstanceId?: string;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  headers?: Record<string, string>;
  raw?: unknown;
}

export type ApiFetcher = <T = unknown>(api: ExecutableApiRequest, ctx: ApiRequestContext) => Promise<ApiResponse<T>>;

export interface RenderMonitorPayload {
  nodeId: string;
  path: SchemaPath;
  type: string;
}

export interface ErrorMonitorPayload {
  phase: 'compile' | 'render' | 'action' | 'expression' | 'api';
  error: unknown;
  nodeId?: string;
  path?: SchemaPath;
  details?: Record<string, unknown>;
}

export interface ApiMonitorPayload {
  api: ExecutableApiRequest;
  nodeId?: string;
  path?: SchemaPath;
  interactionId?: string;
  requestInstanceId?: string;
}

export interface RendererMonitor {
  onRenderStart?(payload: RenderMonitorPayload): void;
  onRenderEnd?(payload: RenderMonitorPayload & { durationMs: number }): void;
  onActionStart?(payload: ActionMonitorPayload): void;
  onActionEnd?(payload: ActionMonitorPayload & { durationMs: number; result?: ActionResult }): void;
  onError?(payload: ErrorMonitorPayload): void;
  onApiRequest?(payload: ApiMonitorPayload): void;
}

export interface RendererEnv {
  fetcher: ApiFetcher;
  notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  navigate?: (to: string | number, options?: { replace?: boolean }) => void;
  confirm?: (message: string, options?: unknown) => Promise<boolean>;
  functions?: Record<string, (...args: any[]) => any>;
  filters?: Record<string, (input: any, ...args: any[]) => any>;
  importLoader?: ImportedLibraryLoader;
  resolveImportUrl?: (schemaUrl: string, from: string, options?: Record<string, unknown>) => string;
  monitor?: RendererMonitor;
}
