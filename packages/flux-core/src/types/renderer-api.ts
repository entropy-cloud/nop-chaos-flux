import type { ExpressionExecutionEnv } from './expression-env-types.js';
import type { ActionMonitorPayload, ActionResult, ImportedLibraryLoader } from './actions.js';
import type { ScopeRef } from './scope.js';
import type { ExecutableApiRequest, SchemaPath } from './schema-base-types.js';
import type { SchemaInput } from './schema.js';

export interface ApiRequestContext {
  scope: ScopeRef;
  env: RendererEnv;
  signal?: AbortSignal;
  interactionId?: string;
  requestInstanceId?: string;
}

export interface ApiResponse<T = unknown> {
  /**
   * Computed property: `status === 0`, mirroring the backend
   * `ApiResponse.isOk()`. Optional on the type because the raw envelope
   * returned by fetchers does not contain `ok`; the runtime normalization
   * layer sets it before any consumer reads it.
   */
  ok?: boolean;
  status: number;
  data: T;
  /** Error code (mirrors backend `ApiResponse.code`). */
  code?: string;
  /** Human-readable error message (mirrors backend `ApiResponse.msg`, a top-level field). */
  msg?: string;
  /** Field-level validation errors (mirrors backend `ApiResponse.errors`). */
  errors?: Record<string, string>;
  headers?: Record<string, string>;
  raw?: unknown;
}

/**
 * A dictionary bean as returned by `DictProvider__getDict` in nop-entropy.
 * `options` is the canonical option list consumed by select-like controls.
 */
export interface DictBean {
  name: string;
  label?: string;
  locale?: string;
  valueType?: string;
  options: Array<{ label: string; value: string; code?: string; description?: string }>;
}

export type ApiFetcher = <T = unknown>(
  api: ExecutableApiRequest,
  ctx: ApiRequestContext,
) => Promise<ApiResponse<T>>;

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

export interface RendererEnv extends ExpressionExecutionEnv {
  fetcher: ApiFetcher;
  notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  navigate?: (to: string | number, options?: { replace?: boolean }) => void;
  confirm?: (message: string, title?: string) => Promise<boolean>;
  alert?: (message: string, title?: string) => void;
  functions?: Record<string, (...args: any[]) => any>;
  filters?: Record<string, (input: any, ...args: any[]) => any>;
  importLoader?: ImportedLibraryLoader;
  resolveImportUrl?: (schemaUrl: string, from: string, options?: Record<string, unknown>) => string;
  monitor?: RendererMonitor;

  /** Load a page schema by path. App provides caching, URL resolution, role filtering. */
  loadPage?: (path: string, signal?: AbortSignal) => Promise<SchemaInput>;
  /** Load a dict by name. App provides caching, URL resolution. Returns a DictBean. */
  loadDict?: (name: string, signal?: AbortSignal) => Promise<DictBean>;
  /** Permission check for `xui:roles` filtering. Returns true (allow-all) when absent. */
  hasRole?(role: string): boolean;
  /** Current locale, used as a cache key segment for page/dict caches. */
  locale?: string;
}
