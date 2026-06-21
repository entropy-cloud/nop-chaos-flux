import type {
  ActionContext,
  ActionResult,
  ActionSchema,
  AsyncGovernanceStore,
  CompiledActionProgram,
  CompiledRuntimeValue,
  DataSourceState,
  OperationControlConfig,
  RendererRuntime,
  ScopeDependencySet,
  ScopeRef,
} from '@nop-chaos/flux-core';
import type { ApiCacheStore } from './api-cache.js';

export interface CreateApiDataSourceControllerInput {
  runtime: RendererRuntime;
  apiCache: ApiCacheStore;
  action: ActionSchema | ActionSchema[] | CompiledActionProgram;
  dispatch: (
    action: ActionSchema | ActionSchema[] | CompiledActionProgram,
    ctx: ActionContext,
  ) => Promise<ActionResult>;
  scope: ScopeRef;
  ownerId?: string;
  asyncGovernance?: AsyncGovernanceStore;
  targetPath?: string;
  mergeToScope?: boolean;
  compiledResultMapping?: CompiledRuntimeValue<unknown>;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
  statusPath?: string;
  interval?: number;
  stopWhen?: CompiledRuntimeValue<boolean>;
  silent?: boolean;
  initialData?: unknown;
  control?: OperationControlConfig;
  onDependenciesChange?: (dependencies: ScopeDependencySet | undefined) => void;
  /** sendOn gate (compiled boolean expression); falsy or eval-error skips refresh */
  sendOn?: CompiledRuntimeValue<boolean>;
  /** initFetch gate; explicitly false skips the first automatic fetch on start */
  initFetch?: CompiledRuntimeValue<boolean>;
  /** onSuccess lifecycle action; dispatched with { data, dataUpdatedAt } after success */
  onSuccess?: CompiledActionProgram;
  /** onError lifecycle action; dispatched with { error, failureCount } after failure */
  onError?: CompiledActionProgram;
}

export interface ApiDataSourceControllerMutableState {
  started: boolean;
  stopped: boolean;
  pollTimer: ReturnType<typeof setTimeout> | undefined;
  abortController: AbortController | undefined;
  activeControllers: Set<AbortController>;
  pendingRefresh: boolean;
  activeRequestCount: number;
  nextRequestSequence: number;
  latestSettledRequestSequence: number;
  state: DataSourceState;
  refreshDedup: NonNullable<OperationControlConfig['dedup']>;
  asyncOwnerId: string | undefined;
}
