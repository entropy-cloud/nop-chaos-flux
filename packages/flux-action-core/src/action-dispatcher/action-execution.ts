import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  ActionSchema,
  CompiledActionNode,
  CompiledActionProgram
} from '@nop-chaos/flux-core';
import { withRetry, withTimeout } from '../operation-control';
import {
  buildActionMonitorPayload,
  classifyActionResult,
  createActionKey,
  createCancelledResult,
  createInteractionId,
  createTimedOutResult,
  createBranchEvaluationBindings,
  getNumericControl,
  getRetryControl,
  isFailureClass,
  mergeEvaluationBindings,
  resolveActionControl,
  shouldRunActionWhen,
  isAbortError
} from '../action-core';
import { cancelPendingDebounce, scheduleDebounce } from '@nop-chaos/flux-core';
import type { ActionDispatcherConfig, ActionDispatcherContext } from './types';
import { isRequestBackedAction, normalizeCompiledActionProgram, applyActionControl } from './program-utils';
import { finishAction } from './action-runners';
import { runBuiltInAction } from './built-in-actions';
import { runComponentAction, runNamespacedAction, runNamedAction } from './action-runners';

async function runParallelActions(
  ctx: ActionDispatcherContext,
  action: CompiledActionNode,
  actionCtx: ActionContext,
  startedAt: number,
  actionPayload: ActionMonitorPayload
): Promise<ActionResult | undefined> {
  if (!action.parallel || action.parallel.length === 0) {
    return undefined;
  }

  const results = await Promise.all(
    action.parallel.map((entry) => runActionWithDebounce(ctx, entry, {
      ...actionCtx,
      interactionId: actionCtx.interactionId ?? createInteractionId(),
      signal: actionCtx.signal,
      prevResult: actionCtx.prevResult
    }))
  );

  return finishAction(ctx, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, {
    ok: results.every((result) => classifyActionResult(result) !== 'failure'),
    data: results,
    results
  });
}

async function runSingleAction(
  ctx: ActionDispatcherContext,
  action: CompiledActionNode,
  actionCtx: ActionContext,
  signal?: AbortSignal
): Promise<ActionResult> {
  const effectiveSignal = signal ?? actionCtx.signal;
  const activeCtx = effectiveSignal && actionCtx.signal !== effectiveSignal ? { ...actionCtx, signal: effectiveSignal } : actionCtx;
  const startedAt = Date.now();
  const actionPayload = buildActionMonitorPayload(action, activeCtx);
  ctx.getEnv().monitor?.onActionStart?.(actionPayload);

  try {
    const processedAction = (ctx.plugins?.length ?? 0) > 0
      ? normalizeCompiledActionProgram(
          await (ctx.plugins ?? []).reduce<Promise<ActionSchema>>(
            async (currentPromise, plugin) => {
              const current = await currentPromise;
              return plugin.beforeAction ? plugin.beforeAction(current, activeCtx) : current;
            },
            Promise.resolve(action.source)
          ),
          ctx
        ).nodes[0]!
      : action;

    if (!shouldRunActionWhen(processedAction, activeCtx, ctx.evaluator)) {
      return finishAction(ctx, actionPayload, startedAt, {
        ok: true,
        skipped: true
      });
    }

    const parallelResult = await runParallelActions(ctx, processedAction, activeCtx, startedAt, actionPayload);
    if (parallelResult) {
      return parallelResult;
    }

    const builtInResult = await runBuiltInAction(processedAction, activeCtx, startedAt, actionPayload, effectiveSignal, ctx);
    if (builtInResult) {
      return builtInResult;
    }

    const componentResult = await runComponentAction(processedAction, activeCtx, startedAt, actionPayload, ctx);
    if (componentResult) {
      return componentResult;
    }

    const namedResult = await runNamedAction(processedAction, activeCtx, startedAt, actionPayload, ctx);
    if (namedResult) {
      return namedResult;
    }

    const namespacedResult = await runNamespacedAction(processedAction, activeCtx, startedAt, actionPayload, ctx);
    if (namespacedResult) {
      return namespacedResult;
    }

    return finishAction(ctx, actionPayload, startedAt, {
      ok: false,
      error: new Error(`Unsupported action: ${processedAction.action}`)
    });
  } catch (error) {
    if (isAbortError(error)) {
      const result = createCancelledResult(error);
      ctx.getEnv().monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
      return result;
    }

    ctx.onActionError?.(error, activeCtx);

    for (const plugin of ctx.plugins ?? []) {
      plugin.onError?.(error, {
        phase: 'action',
        error,
        nodeId: activeCtx.nodeInstance?.templateNode.id,
        path: activeCtx.nodeInstance?.templateNode.templatePath
      });
    }

    const result = {
      ok: false,
      error
    };
    ctx.getEnv().monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
    return result;
  }
}

function runActionWithDebounce(ctx: ActionDispatcherContext, action: CompiledActionNode, actionCtx: ActionContext): Promise<ActionResult> {
  const debounceMs = getNumericControl(action.control?.debounce);

  if (!debounceMs || debounceMs <= 0) {
    return runSingleActionWithRetry(ctx, action, actionCtx);
  }

  const key = createActionKey(action, actionCtx);
  const cancelledResult = createCancelledResult();

  if (cancelPendingDebounce<string, ActionResult>(ctx.pendingDebounces, key, cancelledResult)) {
    ctx.getEnv().monitor?.onActionEnd?.({
      ...buildActionMonitorPayload(action, actionCtx),
      durationMs: 0,
      result: cancelledResult
    });
  }

  return scheduleDebounce<string, ActionResult>(
    ctx.pendingDebounces,
    key,
    debounceMs,
    () => runSingleActionWithRetry(ctx, action, actionCtx)
  );
}

async function runSingleActionWithRetry(ctx: ActionDispatcherContext, action: CompiledActionNode, actionCtx: ActionContext): Promise<ActionResult> {
  if (isRequestBackedAction(action)) {
    const result = await runSingleActionWithTimeout(ctx, action, actionCtx);
    const errorWithRetry = result.error as { attempts?: unknown; failureCount?: unknown } | undefined;

    return {
      ...result,
      attempts: typeof errorWithRetry?.attempts === 'number' ? errorWithRetry.attempts : result.attempts,
      failureCount: typeof errorWithRetry?.failureCount === 'number' ? errorWithRetry.failureCount : result.failureCount
    };
  }

  const retry = getRetryControl(action.control?.retry);
  const { result: lastResult, attempts, failureCount, lastFailureReason } = await withRetry(
    () => runSingleActionWithTimeout(ctx, action, actionCtx),
    {
      times: retry?.times ?? 0,
      delay: retry?.delay ?? 0,
      strategy: retry?.strategy ?? 'fixed',
      maxDelay: retry?.maxDelay
    },
    (result) => Boolean(result.ok || result.skipped || result.cancelled || result.timedOut)
  );

  return {
    ...(lastResult ?? { ok: false, error: new Error('Action failed without result') }),
    attempts,
    failureCount,
    error: lastResult?.error ?? lastFailureReason
  };
}

function runSingleActionWithTimeout(ctx: ActionDispatcherContext, action: CompiledActionNode, actionCtx: ActionContext): Promise<ActionResult> {
  const timeoutMs = getNumericControl(action.control?.timeout);

  if (!timeoutMs || timeoutMs <= 0) {
    return runSingleAction(ctx, action, actionCtx);
  }

  return withTimeout(
    (signal) => runSingleAction(ctx, action, actionCtx, signal),
    timeoutMs,
    () => createTimedOutResult(new Error(`Action timed out after ${timeoutMs}ms`))
  );
}

async function dispatch(
  ctx: ActionDispatcherContext,
  action: ActionSchema | ActionSchema[] | CompiledActionProgram,
  actionCtx: ActionContext
): Promise<ActionResult> {
  const actions = normalizeCompiledActionProgram(action, ctx).nodes;
  let previous: ActionResult = { ok: true };

  for (const current of actions) {
    const currentActionCtx = {
      ...actionCtx,
      interactionId: actionCtx.interactionId ?? createInteractionId(),
      prevResult: previous,
      evaluationBindings: actionCtx.evaluationBindings
    };
    const normalizedAction = applyActionControl(current, resolveActionControl(current));
    const result = await runActionWithDebounce(ctx, normalizedAction, currentActionCtx);
    const resultClass = classifyActionResult(result);

    previous = result;

    const branchBindings = mergeEvaluationBindings(
      actionCtx.evaluationBindings,
      createBranchEvaluationBindings(result, currentActionCtx.prevResult)
    );

    if (resultClass === 'success' && normalizedAction.then) {
      previous = await dispatch(ctx, {
        nodes: normalizedAction.then,
        isFullyStatic: false
      }, {
        ...actionCtx,
        interactionId: currentActionCtx.interactionId,
        prevResult: result,
        evaluationBindings: branchBindings
      });
    } else if (resultClass === 'failure' && normalizedAction.onError) {
      const eventType = typeof (actionCtx.event as { type?: unknown } | undefined)?.type === 'string'
        ? (actionCtx.event as { type: string }).type
        : 'actionError';
      previous = await dispatch(ctx, {
        nodes: normalizedAction.onError,
        isFullyStatic: false
      }, {
        ...actionCtx,
        interactionId: currentActionCtx.interactionId,
        prevResult: result,
        event: {
          ...(actionCtx.event && typeof actionCtx.event === 'object' ? actionCtx.event as Record<string, unknown> : {}),
          type: eventType,
          result,
          error: result.error,
          prevResult: currentActionCtx.prevResult
        },
        evaluationBindings: branchBindings
      });
    }

    if ((resultClass === 'success' || resultClass === 'failure') && normalizedAction.onSettled) {
      const settledEventType = resultClass === 'failure' ? 'actionSettledError' : 'actionSettled';

      try {
        await dispatch(ctx, {
          nodes: normalizedAction.onSettled,
          isFullyStatic: false
        }, {
          ...actionCtx,
          interactionId: currentActionCtx.interactionId,
          prevResult: result,
          event: {
            ...(actionCtx.event && typeof actionCtx.event === 'object' ? actionCtx.event as Record<string, unknown> : {}),
            type: settledEventType,
            result,
            error: isFailureClass(result) ? result.error : undefined,
            prevResult: currentActionCtx.prevResult,
            settled: true
          },
          evaluationBindings: branchBindings
        });
      } catch (error) {
        ctx.onActionError?.(error, currentActionCtx);

        for (const plugin of ctx.plugins ?? []) {
          plugin.onError?.(error, {
            phase: 'action',
            error,
            nodeId: actionCtx.nodeInstance?.templateNode.id,
            path: actionCtx.nodeInstance?.templateNode.templatePath
          });
        }

        const message = error instanceof Error ? error.message : String(error);
        ctx.getEnv().notify('error', message);
      }
    }

    if (resultClass === 'failure' && !normalizedAction.control?.continueOnError) {
      return result;
    }
  }

  return previous;
}

export function createActionDispatcher(config: ActionDispatcherConfig) {
  const ctx: ActionDispatcherContext = {
    getEnv: config.getEnv,
    plugins: config.plugins,
    onActionError: config.onActionError,
    evaluator: config.evaluator,
    adapter: config.adapter,
    runtime: config.runtime,
    compiledProgramCache: new WeakMap(),
    pendingDebounces: new Map()
  };

  return {
    dispatch: (action: ActionSchema | ActionSchema[] | CompiledActionProgram, actionCtx: ActionContext) =>
      dispatch(ctx, action, actionCtx)
  };
}
