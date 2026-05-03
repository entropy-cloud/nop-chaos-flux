import { reportRuntimeHostIssue } from '@nop-chaos/flux-core';
import { resolveCacheKey } from './api-cache';
import { applyResultMapping, evaluateCompiledApiConfig } from './data-source-runtime-utils';
import {
  toActiveRequestState,
  toErrorDataSourceState,
  toIdleFetchState,
  toSuccessDataSourceState,
} from './api-data-source-controller-helpers';
import {
  evaluateControllerStopCondition,
  hasActiveControllerRequest,
  publishControllerData,
  settleControllerRunIfNeeded,
  updateControllerState,
} from './api-data-source-controller-state';
import { isAbortError } from '../error-utils';
import { executeApiSchema, prepareApiRequestForExecution } from './request-runtime';
import type {
  ApiDataSourceControllerMutableState,
  CreateApiDataSourceControllerInput,
} from './api-data-source-controller-types';

export function createApiDataSourceRequestRunner(
  input: CreateApiDataSourceControllerInput,
  mutable: ApiDataSourceControllerMutableState,
  options: { stop: () => void },
) {
  async function runRequest(): Promise<void> {
    if (mutable.stopped) {
      return;
    }

    if (hasActiveControllerRequest(mutable)) {
      if (mutable.refreshDedup === 'ignore-new') {
        return;
      }

      if (mutable.refreshDedup === 'parallel') {
        mutable.pendingRefresh = false;
      } else {
        mutable.pendingRefresh = true;
        mutable.abortController?.abort();
        return;
      }
    }

    mutable.pendingRefresh = false;

    const run =
      mutable.asyncOwnerId && input.asyncGovernance
        ? input.asyncGovernance.beginRun({
            ownerKind: 'data-source',
            ownerId: mutable.asyncOwnerId,
            scopeId: input.scope.id,
            cause: mutable.started ? 'refresh' : 'start',
          })
        : undefined;

    updateControllerState(input, mutable, (current) => ({
      ...current,
      inFlightCount: current.inFlightCount + 1,
      fetchStatus: 'fetching',
      status: typeof current.data === 'undefined' ? 'pending' : current.status,
      stale: typeof current.data !== 'undefined',
      error: undefined,
    }));

    if (mutable.refreshDedup === 'cancel-previous') {
      mutable.abortController?.abort();
    }
    mutable.abortController = new AbortController();
    const controller = mutable.abortController;
    const requestSequence = ++mutable.nextRequestSequence;
    mutable.activeControllers.add(controller);
    mutable.activeRequestCount += 1;

    try {
      const requestScope = input.runtime.createChildScope(
        input.scope,
        {},
        { source: 'custom', pathSuffix: 'data-source-request' },
      );
      const trackedApi = evaluateCompiledApiConfig({
        compiledApi: input.compiledApi,
        scope: input.scope,
        runtime: input.runtime,
        state: mutable.apiConfigState,
      });
      input.onDependenciesChange?.(trackedApi.dependencies);
      const preparedRequest = prepareApiRequestForExecution(
        trackedApi.resolvedApi,
        requestScope,
        input.runtime.env,
        input.runtime.expressionCompiler,
      );
      const cacheKey = resolveCacheKey(preparedRequest.request, input.control);

      if (cacheKey) {
        const cached = input.apiCache.get<unknown>(cacheKey);

        if (cached) {
          await Promise.resolve();

          if (mutable.stopped || controller.signal.aborted) {
            if (run && input.asyncGovernance) {
              input.asyncGovernance.settleRun(run, {
                outcome: 'cancelled',
                cancelled: true,
              });
            }
            if (!mutable.stopped && mutable.pendingRefresh) {
              updateControllerState(input, mutable, (current) => toIdleFetchState(current));
            }
            updateControllerState(input, mutable, (current) => current);
            return;
          }

          const settledRun = settleControllerRunIfNeeded(input, mutable, run, requestSequence, {
            outcome: 'succeeded',
          });

          if (settledRun?.outcome === 'stale-dropped') {
            updateControllerState(input, mutable, (current) => current);
            return;
          }

          const mappedValue = applyResultMapping({
            runtime: input.runtime,
            scope: input.scope,
            compiledResultMapping: input.compiledResultMapping,
            payload: cached.data,
          });

          publishControllerData(input, mutable, mappedValue);
          mutable.latestSettledRequestSequence = Math.max(
            mutable.latestSettledRequestSequence,
            requestSequence,
          );
          updateControllerState(input, mutable, (current) =>
            toSuccessDataSourceState(current, mappedValue),
          );

          if (evaluateControllerStopCondition(input, mutable)) {
            options.stop();
          }

          updateControllerState(input, mutable, (current) => current);
          return;
        }
      }

      const response = await executeApiSchema(
        trackedApi.resolvedApi,
        requestScope,
        input.runtime.env,
        input.runtime.expressionCompiler,
        {
          signal: controller.signal,
          evaluate: input.runtime.evaluate,
          preparedRequest,
          executor: (adaptedApi) =>
            input.executeApiRequest('data-source', adaptedApi, requestScope, {
              signal: controller.signal,
              control: input.control,
            }),
          control: input.control,
        },
      );

      if (mutable.stopped || controller.signal.aborted) {
        if (run && input.asyncGovernance) {
          input.asyncGovernance.settleRun(run, {
            outcome: 'cancelled',
            cancelled: true,
          });
        }
        if (!mutable.stopped && mutable.pendingRefresh) {
          updateControllerState(input, mutable, (current) => toIdleFetchState(current));
        }
        updateControllerState(input, mutable, (current) => current);
        return;
      }

      const settledRun = settleControllerRunIfNeeded(input, mutable, run, requestSequence, {
        outcome: 'succeeded',
      });

      if (settledRun?.outcome === 'stale-dropped') {
        updateControllerState(input, mutable, (current) => current);
        return;
      }

      mutable.latestSettledRequestSequence = Math.max(
        mutable.latestSettledRequestSequence,
        requestSequence,
      );

      if (cacheKey && input.control?.cacheTTL && input.control.cacheTTL > 0) {
        input.apiCache.set(cacheKey, response.data, input.control.cacheTTL);
      }

      const mappedValue = applyResultMapping({
        runtime: input.runtime,
        scope: input.scope,
        compiledResultMapping: input.compiledResultMapping,
        payload: response.data,
      });

      publishControllerData(input, mutable, mappedValue);
      updateControllerState(input, mutable, (current) => toSuccessDataSourceState(current, mappedValue));

      if (evaluateControllerStopCondition(input, mutable)) {
        options.stop();
      }

      updateControllerState(input, mutable, (current) => current);
    } catch (caughtError) {
      if (mutable.stopped || isAbortError(caughtError)) {
        if (run && input.asyncGovernance) {
          input.asyncGovernance.settleRun(run, {
            outcome: 'cancelled',
            cancelled: true,
            error: caughtError,
          });
        }
        if (!mutable.stopped && mutable.pendingRefresh) {
          updateControllerState(input, mutable, (current) => toIdleFetchState(current));
        }
        updateControllerState(input, mutable, (current) => current);
        return;
      }

      const settledRun = settleControllerRunIfNeeded(input, mutable, run, requestSequence, {
        outcome: 'failed',
        error: caughtError,
      });

      if (settledRun?.outcome === 'stale-dropped') {
        updateControllerState(input, mutable, (current) => current);
        return;
      }

      if (
        run &&
        input.asyncGovernance &&
        !input.asyncGovernance.isCurrentRun(run) &&
        !settledRun &&
        requestSequence < mutable.latestSettledRequestSequence
      ) {
        updateControllerState(input, mutable, (current) => current);
        return;
      }

      updateControllerState(input, mutable, (current) => toErrorDataSourceState(current, caughtError));

      if (!input.silent) {
        reportRuntimeHostIssue({
          env: input.runtime.env,
          error: caughtError,
          phase: 'api',
        });
      }

      updateControllerState(input, mutable, (current) => current);
    } finally {
      mutable.activeControllers.delete(controller);
      mutable.activeRequestCount = Math.max(0, mutable.activeRequestCount - 1);

      if (
        run &&
        input.asyncGovernance &&
        !input.asyncGovernance.isCurrentRun(run) &&
        requestSequence < mutable.latestSettledRequestSequence
      ) {
        input.asyncGovernance.settleRun(run, { outcome: 'succeeded' });
        updateControllerState(input, mutable, (current) => current);
      }

      if (mutable.abortController === controller) {
        mutable.abortController = undefined;
      }

      if (
        !mutable.stopped &&
        (mutable.state.inFlightCount !== mutable.activeRequestCount ||
          mutable.state.fetchStatus !== (mutable.activeRequestCount > 0 ? 'fetching' : 'idle'))
      ) {
        updateControllerState(input, mutable, (current) =>
          toActiveRequestState(current, mutable.activeRequestCount),
        );
      }

      if (!mutable.stopped && mutable.pendingRefresh) {
        void runRequest();
      }
    }
  }

  return {
    runRequest,
  };
}
