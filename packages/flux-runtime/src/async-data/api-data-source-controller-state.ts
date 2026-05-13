import {
  reportRuntimeHostIssue,
  type AsyncRunHandle,
  type DataSourceState,
  type SettleAsyncRunInput,
} from '@nop-chaos/flux-core';
import {
  createInitialDataSourceState,
  deriveDataSourceState,
  structuralShareData,
  writeStatusToScope,
} from './data-source-state.js';
import { writeDataToScope } from './data-source-runtime-utils.js';
import { toStopConditionErrorState } from './api-data-source-controller-helpers.js';
import type {
  ApiDataSourceControllerMutableState,
  CreateApiDataSourceControllerInput,
} from './api-data-source-controller-types.js';

export function createApiDataSourceControllerMutableState(
  input: CreateApiDataSourceControllerInput,
): ApiDataSourceControllerMutableState {
  return {
    started: false,
    stopped: false,
    pollTimer: undefined,
    abortController: undefined,
    activeControllers: new Set<AbortController>(),
    pendingRefresh: false,
    activeRequestCount: 0,
    nextRequestSequence: 0,
    latestSettledRequestSequence: 0,
    state: createInitialDataSourceState(input.initialData),
    refreshDedup: input.control?.dedup ?? 'cancel-previous',
    asyncOwnerId: input.ownerId,
  };
}

function updateAsyncState(
  input: CreateApiDataSourceControllerInput,
  nextState: DataSourceState,
): DataSourceState {
  if (!input.ownerId || !input.asyncGovernance) {
    return nextState;
  }

  return {
    ...nextState,
    async: input.asyncGovernance.getOwnerState(input.ownerId),
  };
}

function publishControllerState(
  input: CreateApiDataSourceControllerInput,
  mutable: ApiDataSourceControllerMutableState,
): void {
  writeStatusToScope(input.scope, input.statusPath, mutable.state);
}

export function updateControllerState(
  input: CreateApiDataSourceControllerInput,
  mutable: ApiDataSourceControllerMutableState,
  updater: (current: DataSourceState) => DataSourceState,
): DataSourceState {
  mutable.state = updateAsyncState(input, deriveDataSourceState(updater(mutable.state)));
  publishControllerState(input, mutable);
  return mutable.state;
}

export function publishControllerData(
  input: CreateApiDataSourceControllerInput,
  mutable: ApiDataSourceControllerMutableState,
  nextData: unknown,
): void {
  if (input.targetPath) {
    const currentValue = input.scope.get(input.targetPath);
    const safeForSharing = !input.mergeStrategy || input.mergeStrategy === 'replace';
    const effectiveData = safeForSharing ? structuralShareData(currentValue, nextData) : nextData;

    if (safeForSharing && Object.is(currentValue, effectiveData)) {
      return;
    }

    writeDataToScope({
      scope: input.scope,
      targetPath: input.targetPath,
      mergeToScope: input.mergeToScope,
      mergeStrategy: input.mergeStrategy,
      mergeKey: input.mergeKey,
      data: effectiveData,
    });
    return;
  }

  writeDataToScope({
    scope: input.scope,
    targetPath: input.targetPath,
    mergeToScope: input.mergeToScope,
    mergeStrategy: input.mergeStrategy,
    mergeKey: input.mergeKey,
    data: nextData,
  });
}

export function hasActiveControllerRequest(mutable: ApiDataSourceControllerMutableState): boolean {
  return mutable.activeRequestCount > 0;
}

export function settleControllerRunIfNeeded(
  input: CreateApiDataSourceControllerInput,
  mutable: ApiDataSourceControllerMutableState,
  run: AsyncRunHandle | undefined,
  requestSequence: number,
  settled: SettleAsyncRunInput,
) {
  if (!run || !input.asyncGovernance) {
    return undefined;
  }

  if (!input.asyncGovernance.isCurrentRun(run)) {
    return input.asyncGovernance.settleRun(run, settled);
  }

  return input.asyncGovernance.settleRun(run, settled);
}

export function evaluateControllerStopCondition(
  input: CreateApiDataSourceControllerInput,
  mutable: ApiDataSourceControllerMutableState,
): boolean {
  if (!input.stopWhen || !input.interval) {
    return false;
  }

  try {
    return input.runtime.evaluate<boolean>(input.stopWhen, input.scope) ?? false;
  } catch (error) {
    if (
      error instanceof Error &&
      error.cause instanceof Error &&
      error.cause.message === 'Cannot access member of null or undefined'
    ) {
      return false;
    }
    updateControllerState(input, mutable, (current) => toStopConditionErrorState(current, error));
    if (!input.silent) {
      reportRuntimeHostIssue({
        env: input.runtime.env,
        error,
        phase: 'api',
      });
    }
    return true;
  }
}
