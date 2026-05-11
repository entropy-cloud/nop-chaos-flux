import {
  reportRuntimeHostIssue,
  type AsyncGovernanceStore,
  type CompiledRuntimeValue,
  type DataSourceController,
  type DataSourceState,
  type DynamicRuntimeValue,
  type RendererRuntime,
  type RuntimeValueState,
  type ScopeDependencySet,
  type ScopeRef,
  type StaticRuntimeValue,
} from '@nop-chaos/flux-core';
import {
  createInitialDataSourceState,
  deriveDataSourceState,
  toNextDataSourceState,
  writeStatusToScope,
} from './data-source-state.js';
import {
  applyResultMapping,
  collectRuntimeDependencies,
  writeDataToScope,
} from './data-source-runtime-utils.js';

export function createFormulaDataSourceController(input: {
  runtime: RendererRuntime;
  scope: ScopeRef;
  ownerId?: string;
  asyncGovernance?: AsyncGovernanceStore;
  targetPath?: string;
  mergeToScope?: boolean;
  compiledResultMapping?: CompiledRuntimeValue<unknown>;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
  statusPath?: string;
  formula: unknown;
  initialData?: unknown;
  onDependenciesChange?: (dependencies: ScopeDependencySet | undefined) => void;
}): DataSourceController {
  const compiled = input.runtime.expressionCompiler.compileValue(input.formula);
  const staticCompiled = compiled.isStatic ? (compiled as StaticRuntimeValue<unknown>) : undefined;
  const dynamicCompiled = compiled.isStatic
    ? undefined
    : (compiled as DynamicRuntimeValue<unknown>);
  const runtimeState: RuntimeValueState<unknown> | undefined = dynamicCompiled?.createState();

  let started = false;
  let stopped = false;
  let state = createInitialDataSourceState(input.initialData);
  const asyncOwnerId = input.ownerId;

  function reportPublishFailure(error: unknown) {
    reportRuntimeHostIssue({
      env: input.runtime.env,
      level: 'error',
      message: `Formula data source publish failed: ${asyncOwnerId ?? input.targetPath ?? 'unknown'}`,
      error,
      phase: 'api',
      details: {
        reason: 'formula-data-source-publish-failed',
        ownerId: asyncOwnerId,
        scopeId: input.scope.id,
        targetPath: input.targetPath,
        statusPath: input.statusPath,
      },
    });
  }

  function updateAsyncState() {
    if (!asyncOwnerId || !input.asyncGovernance) {
      return;
    }

    state = {
      ...state,
      async: input.asyncGovernance.getOwnerState(asyncOwnerId),
    };
  }

  function updateState(updater: (current: DataSourceState) => DataSourceState): DataSourceState {
    state = deriveDataSourceState(updater(state));
    updateAsyncState();
    writeStatusToScope(input.scope, input.statusPath, state);
    return state;
  }

  function publish(): void {
    if (stopped) {
      return;
    }

    const run =
      asyncOwnerId && input.asyncGovernance
        ? input.asyncGovernance.beginRun({
            ownerKind: 'data-source',
            ownerId: asyncOwnerId,
            scopeId: input.scope.id,
            cause: started ? 'refresh' : 'start',
          })
        : undefined;

    updateState((current) => ({
      ...toNextDataSourceState(current, {
        fetchStatus: 'fetching',
        status: typeof current.data === 'undefined' ? 'pending' : current.status,
        stale: typeof current.data !== 'undefined',
        error: undefined,
      }),
    }));

    const rawValue = dynamicCompiled
      ? input.runtime.expressionCompiler.evaluateWithState(
          dynamicCompiled,
          input.scope,
          input.runtime.env,
          runtimeState!,
        ).value
      : staticCompiled?.value;
    const nextValue = applyResultMapping({
      runtime: input.runtime,
      scope: input.scope,
      compiledResultMapping: input.compiledResultMapping,
      payload: rawValue,
    });

    input.onDependenciesChange?.(collectRuntimeDependencies(runtimeState));

    if (run && input.asyncGovernance && !input.asyncGovernance.isCurrentRun(run)) {
      input.asyncGovernance.settleRun(run, { outcome: 'succeeded' });
      updateState((current) => current);
      return;
    }

    writeDataToScope({
      scope: input.scope,
      targetPath: input.targetPath,
      mergeToScope: input.mergeToScope,
      mergeStrategy: input.mergeStrategy,
      mergeKey: input.mergeKey,
      data: nextValue,
    });

    updateState((current) => ({
      ...current,
      status: 'success',
      fetchStatus: 'idle',
      stale: false,
      data: nextValue,
      error: undefined,
      dataUpdatedAt: Date.now(),
      failureCount: 0,
      failureReason: undefined,
    }));

    if (run && input.asyncGovernance) {
      input.asyncGovernance.settleRun(run, { outcome: 'succeeded' });
      updateState((current) => current);
    }
  }

  return {
    getState() {
      return state;
    },
    start() {
      if (started) {
        return;
      }

      started = true;
      stopped = false;

      if (input.initialData !== undefined) {
        writeDataToScope({
          scope: input.scope,
          targetPath: input.targetPath,
          mergeToScope: input.mergeToScope,
          mergeStrategy: input.mergeStrategy,
          mergeKey: input.mergeKey,
          data: input.initialData,
        });
      }

      updateState((current) => ({
        ...current,
        started: true,
      }));

      void Promise.resolve()
        .then(() => {
          publish();
        })
        .catch((error: unknown) => {
          reportPublishFailure(error);
          updateState((current) => ({
            ...current,
            status: 'error',
            fetchStatus: 'idle',
            error,
            failureCount: current.failureCount + 1,
            failureReason: error instanceof Error ? error : new Error(String(error)),
          }));
        });
    },
    stop() {
      stopped = true;
      updateState((current) => ({
        ...current,
        fetchStatus: 'idle',
      }));
    },
    async refresh() {
      publish();
    },
    reset() {
      stopped = true;
      if (input.targetPath) {
        input.scope.update(input.targetPath, undefined);
      }
      const initialState = createInitialDataSourceState(undefined);
      updateState(() => initialState);
    },
  };
}
