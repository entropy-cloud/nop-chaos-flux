import type {
  AsyncGovernanceStore,
  CompiledApiConfig,
  CompiledRuntimeValue,
  DataSourceState,
  ExecutableApiRequest,
  OperationControlConfig,
  RendererRuntime,
  ScopeDependencySet,
  ScopeRef,
} from '@nop-chaos/flux-core';
import type { ApiCacheStore } from './api-cache.js';
import type { ApiConfigRuntimeState } from './data-source-runtime-utils.js';

export interface CreateApiDataSourceControllerInput {
  runtime: RendererRuntime;
  apiCache: ApiCacheStore;
  executeApiRequest: <T>(
    actionType: string,
    api: ExecutableApiRequest,
    scope: ScopeRef,
    options?: {
      signal?: AbortSignal;
      control?: OperationControlConfig;
    },
  ) => Promise<{ ok: boolean; status: number; data: T }>;
  compiledApi: CompiledApiConfig;
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
  stopWhen?: string;
  silent?: boolean;
  initialData?: unknown;
  control?: OperationControlConfig;
  onDependenciesChange?: (dependencies: ScopeDependencySet | undefined) => void;
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
  apiConfigState: ApiConfigRuntimeState;
  refreshDedup: NonNullable<OperationControlConfig['dedup']>;
  asyncOwnerId: string | undefined;
}
