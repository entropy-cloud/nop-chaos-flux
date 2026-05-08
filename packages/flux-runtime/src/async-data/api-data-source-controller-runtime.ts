import { reportRuntimeHostIssue } from '@nop-chaos/flux-core';
import type {
  ActionResult,
  ApiSchema,
  CompiledActionNode,
  DynamicRuntimeValue,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { resolveCacheKey } from './api-cache.js';
import { applyResultMapping, collectRuntimeDependencies } from './data-source-runtime-utils.js';
import {
  toActiveRequestState,
  toErrorDataSourceState,
  toIdleFetchState,
  toSuccessDataSourceState,
} from './api-data-source-controller-helpers.js';
import {
  evaluateControllerStopCondition,
  hasActiveControllerRequest,
  publishControllerData,
  settleControllerRunIfNeeded,
  updateControllerState,
} from './api-data-source-controller-state.js';
import { isAbortError } from '../error-utils.js';
import { prepareApiRequestForExecution } from './request-runtime.js';
import type {
  ApiDataSourceControllerMutableState,
  CreateApiDataSourceControllerInput,
} from './api-data-source-controller-types.js';

function toDispatchError(result: ActionResult): unknown {
  if (result.error) {
    return result.error;
  }

  if (result.cancelled || result.timedOut) {
    return Object.assign(new Error('Data source action was cancelled'), { name: 'AbortError' });
  }

  return new Error('Data source action failed');
}

async function executeDataSourceAction(
  input: CreateApiDataSourceControllerInput,
  scope: ScopeRef,
  signal: AbortSignal,
): Promise<ActionResult> {
  const result = await input.dispatch(input.action, {
    runtime: input.runtime,
    scope,
    signal,
  });

  if (!result.ok || result.cancelled || result.timedOut) {
    throw toDispatchError(result);
  }

  return result;
}

function evaluateSingleAjaxAction(input: CreateApiDataSourceControllerInput, scope: ScopeRef) {
  const action = input.action;
  if (!action || Array.isArray(action) || !('nodes' in action) || !Array.isArray(action.nodes)) {
    return undefined;
  }

  const nodes = action.nodes as CompiledActionNode[];
  const node = nodes[0];
  if (nodes.length !== 1 || !node || node.action !== 'ajax') {
    return undefined;
  }

  const args = node.payload.args;
  if (!args) {
    return undefined;
  }

  if (args.isStatic) {
    return {
      api: args.value as ApiSchema,
      dependencies: undefined,
    };
  }

  const state = (args as DynamicRuntimeValue<Record<string, unknown>>).createState();
  const result = input.runtime.expressionCompiler.evaluateWithState(
    args as DynamicRuntimeValue<Record<string, unknown>>,
    scope,
    input.runtime.env,
    state,
  );

  return {
    api: result.value as ApiSchema,
    dependencies: collectRuntimeDependencies(state),
  };
}

export function createApiDataSourceRequestRunner(
  input: CreateApiDataSourceControllerInput,
  mutable: ApiDataSourceControllerMutableState,
  options: { stop: () => void },
) {
  function relaunchPendingRefresh() {
    void runRequest().catch((error: unknown) => {
      if (!input.silent) {
        reportRuntimeHostIssue({
          env: input.runtime.env,
          error,
          phase: 'api',
        });
      }
    });
  }

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
    let run:
      | ReturnType<NonNullable<CreateApiDataSourceControllerInput['asyncGovernance']>['beginRun']>
      | undefined;
    let controller: AbortController | undefined;
    let requestSequence = 0;

    try {
      run =
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
      controller = new AbortController();
      mutable.abortController = controller;
      requestSequence = ++mutable.nextRequestSequence;
      mutable.activeControllers.add(controller);
      mutable.activeRequestCount += 1;
      const activeController = controller;

      const requestScope = input.runtime.createChildScope(
        input.scope,
        {},
        {
          source: 'custom',
          pathSuffix: 'data-source-request',
        },
      );
      const ajaxAction = evaluateSingleAjaxAction(input, requestScope);
      input.onDependenciesChange?.(ajaxAction?.dependencies);
      const preparedRequest = ajaxAction
        ? prepareApiRequestForExecution(
            ajaxAction.api,
            requestScope,
            input.runtime.env,
            input.runtime.expressionCompiler,
          )
        : undefined;
      const cacheKey = preparedRequest
        ? resolveCacheKey(preparedRequest.request, input.control)
        : null;

      if (cacheKey) {
        const cached = input.apiCache.get<unknown>(cacheKey);

        if (cached) {
          await Promise.resolve();

          if (mutable.stopped || activeController.signal.aborted) {
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

      const response = await executeDataSourceAction(input, requestScope, activeController.signal);

      if (mutable.stopped || activeController.signal.aborted) {
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
      updateControllerState(input, mutable, (current) =>
        toSuccessDataSourceState(current, mappedValue),
      );

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

      updateControllerState(input, mutable, (current) =>
        toErrorDataSourceState(current, caughtError),
      );

      if (!input.silent) {
        reportRuntimeHostIssue({
          env: input.runtime.env,
          error: caughtError,
          phase: 'api',
        });
      }

      updateControllerState(input, mutable, (current) => current);
    } finally {
      if (controller) {
        mutable.activeControllers.delete(controller);
        mutable.activeRequestCount = Math.max(0, mutable.activeRequestCount - 1);
      }

      if (
        run &&
        input.asyncGovernance &&
        !input.asyncGovernance.isCurrentRun(run) &&
        requestSequence < mutable.latestSettledRequestSequence
      ) {
        input.asyncGovernance.settleRun(run, { outcome: 'succeeded' });
        updateControllerState(input, mutable, (current) => current);
      }

      if (controller && mutable.abortController === controller) {
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
        relaunchPendingRefresh();
      }
    }
  }

  return {
    runRequest,
  };
}
