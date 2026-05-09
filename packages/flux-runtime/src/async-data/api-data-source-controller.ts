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
      if (!mutable.started || mutable.stopped) {
        activateController(false);

        if (input.interval && input.interval > 0) {
          schedulePoll();
        }
      }

      return runRequest();
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

      if (input.targetPath) {
        input.scope.update(input.targetPath, undefined);
      }

      const initialState = createInitialDataSourceState(undefined);
      updateControllerState(input, mutable, () => initialState);
    },
  };
}
