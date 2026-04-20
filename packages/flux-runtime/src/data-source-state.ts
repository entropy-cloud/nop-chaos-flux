import type { DataSourceState, ScopeRef } from '@nop-chaos/flux-core';
import { shallowEqual } from '@nop-chaos/flux-core';
import { publishOwnerStatus } from './status-owner';

export function writeStatusToScope(scope: ScopeRef, statusPath: string | undefined, state: DataSourceState): void {
  const loading = state.fetchStatus === 'fetching';
  publishOwnerStatus(scope, statusPath, {
    started: state.started,
    loading,
    ready: state.started && !loading && !state.error,
    stale: state.stale,
    hasData: state.hasData,
    hasError: state.hasError,
    isInitialLoading: state.isInitialLoading,
    isRefreshing: state.isRefreshing,
    inFlightCount: state.inFlightCount,
    dataUpdatedAt: state.dataUpdatedAt,
    errorUpdatedAt: state.errorUpdatedAt,
    failureCount: state.failureCount,
    failureReason: state.failureReason,
    async: state.async,
    error: state.error
      ? { message: state.error instanceof Error ? state.error.message : String(state.error) }
      : undefined
  });
}

export function createInitialDataSourceState(initialData: unknown): DataSourceState {
  const hasInitialData = typeof initialData !== 'undefined';

  return {
    started: false,
    status: hasInitialData ? 'success' : 'idle',
    fetchStatus: 'idle',
    stale: false,
    hasData: hasInitialData,
    hasError: false,
    isInitialLoading: false,
    isRefreshing: false,
    inFlightCount: 0,
    data: initialData,
    error: undefined,
    dataUpdatedAt: hasInitialData ? Date.now() : 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: undefined,
    async: undefined
  };
}

export function structuralShareData(previousData: unknown, nextData: unknown): unknown {
  return shallowEqual(previousData, nextData) ? previousData : nextData;
}

export function nextFailureCount(previousFailureCount: number): number {
  return previousFailureCount + 1;
}

export function deriveDataSourceState(current: DataSourceState): DataSourceState {
  const hasData = typeof current.data !== 'undefined';
  const hasError = typeof current.error !== 'undefined';
  const inFlightCount = Math.max(0, current.inFlightCount);
  const loading = inFlightCount > 0 || current.fetchStatus === 'fetching';

  return {
    ...current,
    fetchStatus: loading ? 'fetching' : 'idle',
    hasData,
    hasError,
    isInitialLoading: loading && !hasData,
    isRefreshing: loading && hasData,
    inFlightCount
  };
}

export function toNextDataSourceState(current: DataSourceState, patch: Partial<DataSourceState>): DataSourceState {
  return { ...current, ...patch };
}
