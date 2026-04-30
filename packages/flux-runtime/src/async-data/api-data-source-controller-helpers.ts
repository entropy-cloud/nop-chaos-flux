import type { DataSourceState } from '@nop-chaos/flux-core';
import { nextFailureCount, structuralShareData, toNextDataSourceState } from './data-source-state';

export function toSuccessDataSourceState(
  current: DataSourceState,
  mappedValue: unknown,
): DataSourceState {
  const sharedData = structuralShareData(current.data, mappedValue);
  return {
    ...current,
    status: 'success',
    inFlightCount: Math.max(0, current.inFlightCount - 1),
    fetchStatus: 'idle',
    stale: false,
    data: sharedData,
    error: undefined,
    dataUpdatedAt: Object.is(sharedData, current.data) ? current.dataUpdatedAt : Date.now(),
    errorUpdatedAt: current.errorUpdatedAt,
    failureCount: 0,
    failureReason: undefined,
  };
}

export function toErrorDataSourceState(current: DataSourceState, error: unknown): DataSourceState {
  return {
    ...current,
    inFlightCount: Math.max(0, current.inFlightCount - 1),
    status: typeof current.data === 'undefined' ? 'error' : current.status,
    fetchStatus: 'idle',
    stale: typeof current.data !== 'undefined',
    error,
    errorUpdatedAt: Date.now(),
    failureCount: nextFailureCount(current.failureCount),
    failureReason: error,
  };
}

export function toStopConditionErrorState(
  current: DataSourceState,
  error: unknown,
): DataSourceState {
  return {
    ...current,
    status: typeof current.data === 'undefined' ? 'error' : current.status,
    fetchStatus: 'idle',
    stale: typeof current.data !== 'undefined',
    error,
    errorUpdatedAt: Date.now(),
    failureCount: nextFailureCount(current.failureCount),
    failureReason: error,
  };
}

export function toIdleFetchState(current: DataSourceState): DataSourceState {
  return {
    ...current,
    fetchStatus: 'idle',
  };
}

export function toActiveRequestState(
  current: DataSourceState,
  activeRequestCount: number,
): DataSourceState {
  return toNextDataSourceState(current, {
    inFlightCount: activeRequestCount,
    fetchStatus: activeRequestCount > 0 ? 'fetching' : 'idle',
  });
}

export function abortActiveControllers(activeControllers: Set<AbortController>) {
  for (const controller of activeControllers) {
    controller.abort();
  }
  activeControllers.clear();
}
