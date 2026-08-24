import { reportRuntimeHostIssue, type DataSourceController, type DataSourceRefreshResult } from '@nop-chaos/flux-core';
import { createInitialDataSourceState } from './data-source-state.js';
import { abortActiveControllers } from './api-data-source-controller-helpers.js';
import {
  createApiDataSourceControllerMutableState,
  publishControllerData,
  updateControllerState,
} from './api-data-source-controller-state.js';
import {
  createApiDataSourceRequestRunner,
  evaluateSendOnGate,
} from './api-data-source-controller-runtime.js';
import type { CreateApiDataSourceControllerInput } from './api-data-source-controller-types.js';

function getIntervalMs(interval: NonNullable<CreateApiDataSourceControllerInput['interval']>): number {
  return typeof interval === 'number' ? interval : interval.base;
}

function resolveInterval(interval: NonNullable<CreateApiDataSourceControllerInput['interval']>): number {
  if (typeof interval === 'number') return interval;
  const { base, jitter = 0 } = interval;
  if (jitter <= 0) return base;
  const offset = Math.random() * jitter * (Math.random() > 0.5 ? 1 : -1);
  return Math.max(1, Math.round(base + offset));
}

function resolveInitFetch(input: CreateApiDataSourceControllerInput): boolean {
  if (!input.initFetch) {
    return true;
  }
  if (input.initFetch.isStatic) {
    return input.initFetch.value !== false;
  }
  try {
    return input.runtime.evaluateCompiled<boolean>(input.initFetch, input.scope) !== false;
  } catch (error) {
    reportRuntimeHostIssue({
      env: input.runtime.env,
      level: 'error',
      message: 'Data source initFetch evaluation failed; treating as true (conservative fetch)',
      error,
      phase: 'api',
    });
    return true;
  }
}

export function createDataSourceController(
  input: CreateApiDataSourceControllerInput,
): DataSourceController {
  const mutable = createApiDataSourceControllerMutableState(input);
  const reportRunRequestError = (error: unknown) => {
    if (!input.silent) {
      reportRuntimeHostIssue({
        env: input.runtime.env,
        error,
        phase: 'api',
      });
    }
  };

  function schedulePoll(): void {
    if (mutable.stopped || !input.interval || getIntervalMs(input.interval) <= 0) {
      return;
    }

    const delay = resolveInterval(input.interval);
    mutable.pollTimer = setTimeout(() => {
      const allowed = evaluateSendOnGate(input);
      // Errors routed through state machine — data source errors handled via runRequest internal catch
      void (allowed ? runRequest() : Promise.resolve())
        .catch(reportRunRequestError)
        .finally(() => {
          if (!mutable.stopped) {
            schedulePoll();
          }
        });
    }, delay);
  }

  function activateController(publishInitialData: boolean): void {
    mutable.started = true;
    mutable.stopped = false;

    if (publishInitialData && input.initialData !== undefined) {
      publishControllerData(input, mutable, input.initialData);
    }

    updateControllerState(input, mutable, (current) => ({
      ...current,
      started: true,
      status: typeof current.data === 'undefined' ? 'idle' : current.status,
    }));
  }

  function stop(): void {
    mutable.started = false;
    mutable.stopped = true;

    if (mutable.pollTimer) {
      clearTimeout(mutable.pollTimer);
      mutable.pollTimer = undefined;
    }

    abortActiveControllers(mutable.activeControllers);
    mutable.abortController = undefined;
    mutable.activeRequestCount = 0;
    // 1-10: controller dispose 一并回收仍未 settle 的 run/poll 周期 child scope
    //（source-registry entry.dispose → controller.stop() 路径）。
    for (const scopeId of mutable.childScopeIds) {
      input.runtime.disposeScope(scopeId);
    }
    mutable.childScopeIds.clear();
    updateControllerState(input, mutable, (current) => ({
      ...current,
      started: false,
      inFlightCount: 0,
      fetchStatus: 'idle',
    }));
  }

  const { runRequest } = createApiDataSourceRequestRunner(input, mutable, { stop });

  function start(): void {
    if (mutable.started) {
      return;
    }

    activateController(true);

    if (resolveInitFetch(input) && evaluateSendOnGate(input)) {
      // Errors routed through state machine — data source errors handled via runRequest internal catch
      void runRequest().catch(reportRunRequestError);
    }

    if (input.interval && getIntervalMs(input.interval) > 0) {
      schedulePoll();
    }
  }

  return {
    getState() {
      return mutable.state;
    },
    start,
    stop,
    refresh(): Promise<DataSourceRefreshResult> {
      if (!mutable.started || mutable.stopped) {
        activateController(false);

        if (input.interval && getIntervalMs(input.interval) > 0) {
          schedulePoll();
        }
      }

      if (!evaluateSendOnGate(input)) {
        return Promise.resolve({ skipped: true });
      }

      return runRequest().then((outcome) => {
        if (outcome.status === 'failed') {
          return { skipped: false, ok: false, error: outcome.error };
        }
        if (outcome.status === 'cancelled') {
          return {
            skipped: false,
            ok: false,
            error:
              outcome.error ??
              new Error(`Data source refresh was cancelled: ${input.scope.id}`),
          };
        }
        if (outcome.status === 'deferred') {
          return { skipped: true };
        }
        return { skipped: false, ok: true };
      });
    },
    reset() {
      mutable.started = false;
      mutable.stopped = true;

      if (mutable.pollTimer) {
        clearTimeout(mutable.pollTimer);
        mutable.pollTimer = undefined;
      }

      abortActiveControllers(mutable.activeControllers);
      mutable.abortController = undefined;
      mutable.activeRequestCount = 0;

      for (const scopeId of mutable.childScopeIds) {
        input.runtime.disposeScope(scopeId);
      }
      mutable.childScopeIds.clear();

      if (input.targetPath) {
        input.scope.update(input.targetPath, undefined);
      }

      const initialState = createInitialDataSourceState(undefined);
      updateControllerState(input, mutable, () => initialState);
    },
  };
}
