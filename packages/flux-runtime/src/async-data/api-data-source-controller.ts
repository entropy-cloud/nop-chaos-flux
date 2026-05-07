import { reportRuntimeHostIssue, type DataSourceController } from '@nop-chaos/flux-core';
import { createInitialDataSourceState } from './data-source-state.js';
import { abortActiveControllers } from './api-data-source-controller-helpers.js';
import {
  createApiDataSourceControllerMutableState,
  publishControllerData,
  updateControllerState,
} from './api-data-source-controller-state.js';
import { createApiDataSourceRequestRunner } from './api-data-source-controller-runtime.js';
import type { CreateApiDataSourceControllerInput } from './api-data-source-controller-types.js';

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
    if (mutable.stopped || !input.interval || input.interval <= 0) {
      return;
    }

    mutable.pollTimer = setTimeout(() => {
      void runRequest()
        .catch(reportRunRequestError)
        .finally(() => {
          if (!mutable.stopped) {
            schedulePoll();
          }
        });
    }, input.interval);
  }

  function stop(): void {
    mutable.stopped = true;

    if (mutable.pollTimer) {
      clearTimeout(mutable.pollTimer);
      mutable.pollTimer = undefined;
    }

    abortActiveControllers(mutable.activeControllers);
    mutable.abortController = undefined;
    mutable.activeRequestCount = 0;
    updateControllerState(input, mutable, (current) => ({
      ...current,
      inFlightCount: 0,
      fetchStatus: 'idle',
    }));
  }

  const { runRequest } = createApiDataSourceRequestRunner(input, mutable, { stop });

  function start(): void {
    if (mutable.started) {
      return;
    }

    mutable.started = true;
    mutable.stopped = false;

    if (input.initialData !== undefined) {
      publishControllerData(input, mutable, input.initialData);
    }

    updateControllerState(input, mutable, (current) => ({
      ...current,
      started: mutable.started,
      status: typeof current.data === 'undefined' ? 'idle' : current.status,
    }));

    void runRequest().catch(reportRunRequestError);

    if (input.interval && input.interval > 0) {
      schedulePoll();
    }
  }

  return {
    getState() {
      return mutable.state;
    },
    start,
    stop,
    refresh() {
      return runRequest();
    },
    reset() {
      mutable.stopped = true;

      if (mutable.pollTimer) {
        clearTimeout(mutable.pollTimer);
        mutable.pollTimer = undefined;
      }

      abortActiveControllers(mutable.activeControllers);
      mutable.abortController = undefined;
      mutable.activeRequestCount = 0;

      if (input.targetPath) {
        input.scope.update(input.targetPath, undefined);
      }

      const initialState = createInitialDataSourceState(undefined);
      updateControllerState(input, mutable, () => initialState);
    },
  };
}
