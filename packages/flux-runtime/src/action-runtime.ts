import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  ActionSchema,
} from '@nop-chaos/flux-core';
import { isNamespacedAction } from './action-scope';
import { withRetry, withTimeout } from './operation-control';
import { cancelPendingDebounce, scheduleDebounce } from './utils/debounce';
import {
  buildActionMonitorPayload,
  classifyActionResult,
  createActionKey,
  createCancelledResult,
  createInteractionId,
  createTimedOutResult,
  createBranchEvaluationBindings,
  evaluateActionArgs,
  finishAction,
  getNumericControl,
  getRetryControl,
  mergeEvaluationBindings,
  normalizeActionResult,
  resolveActionControl,
  shouldRunActionWhen,
  type ActionDispatcherInput
} from './action-runtime-core';
import { runBuiltInAction, runComponentAction } from './action-runtime-handlers';
import { isAbortError } from './error-utils';

export function createActionDispatcher(input: ActionDispatcherInput) {
  const pendingDebounces = new Map<string, {
    timer: ReturnType<typeof setTimeout>;
    resolve: (result: ActionResult) => void;
    reject: (error: unknown) => void;
  }>();

  async function runParallelActions(
    action: ActionSchema,
    ctx: ActionContext,
    startedAt: number,
    actionPayload: ActionMonitorPayload
  ): Promise<ActionResult | undefined> {
    if (!action.parallel || action.parallel.length === 0) {
      return undefined;
    }

    const results = await Promise.all(
      action.parallel.map((entry) => runActionWithDebounce(entry, {
        ...ctx,
        interactionId: ctx.interactionId ?? createInteractionId(),
        prevResult: ctx.prevResult
      }))
    );

    return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, {
      ok: results.every((result) => classifyActionResult(result) !== 'failure'),
      data: results,
      results
    });
  }

  async function runNamespacedAction(
    action: ActionSchema,
    ctx: ActionContext,
    startedAt: number,
    actionPayload: ActionMonitorPayload
  ): Promise<ActionResult | undefined> {
    if (!isNamespacedAction(action.action)) {
      return undefined;
    }

    const resolved = ctx.actionScope?.resolve(action.action);

    if (!resolved) {
      return finishAction(input, { ...actionPayload, dispatchMode: 'namespace' }, startedAt, {
        ok: false,
        error: new Error(`Unsupported action: ${action.action}`)
      });
    }

    const payload = evaluateActionArgs(action, ctx, input);
    const result = normalizeActionResult(await resolved.provider.invoke(resolved.method, payload, ctx));
    return finishAction(
      input,
      {
        ...actionPayload,
        dispatchMode: 'namespace',
        namespace: resolved.namespace,
        method: resolved.method,
        sourceScopeId: resolved.sourceScopeId,
        providerKind: resolved.provider.kind ?? 'host'
      },
      startedAt,
      result
    );
  }

  async function runSingleAction(action: ActionSchema, ctx: ActionContext, signal?: AbortSignal): Promise<ActionResult> {
    const startedAt = Date.now();
    const actionPayload = buildActionMonitorPayload(action, ctx);
    input.getEnv().monitor?.onActionStart?.(actionPayload);

    try {
      const processedAction = await (input.plugins ?? []).reduce<Promise<ActionSchema>>(
        async (currentPromise, plugin) => {
          const current = await currentPromise;
          return plugin.beforeAction ? plugin.beforeAction(current, ctx) : current;
        },
        Promise.resolve(action)
      );

      if (!shouldRunActionWhen(processedAction, ctx, input)) {
        return finishAction(input, actionPayload, startedAt, {
          ok: true,
          skipped: true
        });
      }

      const parallelResult = await runParallelActions(processedAction, ctx, startedAt, actionPayload);

      if (parallelResult) {
        return parallelResult;
      }

      const builtInResult = await runBuiltInAction(input, processedAction, ctx, startedAt, actionPayload, signal);

      if (builtInResult) {
        return builtInResult;
      }

      const componentResult = await runComponentAction(input, processedAction, ctx, startedAt, actionPayload);

      if (componentResult) {
        return componentResult;
      }

      const namespacedResult = await runNamespacedAction(processedAction, ctx, startedAt, actionPayload);

      if (namespacedResult) {
        return namespacedResult;
      }

      return finishAction(input, actionPayload, startedAt, {
        ok: false,
        error: new Error(`Unsupported action: ${processedAction.action}`)
      });
    } catch (error) {
      if (isAbortError(error)) {
        const result = createCancelledResult(error);
        input.getEnv().monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
        return result;
      }

      input.onActionError?.(error, ctx);

      for (const plugin of input.plugins ?? []) {
        plugin.onError?.(error, {
          phase: 'action',
          error,
          nodeId: ctx.nodeInstance?.templateNode.id,
          path: ctx.nodeInstance?.templateNode.templatePath
        });
      }

      const result = {
        ok: false,
        error
      };
      input.getEnv().monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
      return result;
    }
  }

  function runActionWithDebounce(action: ActionSchema, ctx: ActionContext): Promise<ActionResult> {
    const debounceMs = getNumericControl(action.debounce);

    if (!debounceMs || debounceMs <= 0) {
      return runSingleActionWithRetry(action, ctx);
    }

    const key = createActionKey(action, ctx);
    const cancelledResult = createCancelledResult();

    if (cancelPendingDebounce<string, ActionResult>(pendingDebounces, key, cancelledResult)) {
      input.getEnv().monitor?.onActionEnd?.({
        ...buildActionMonitorPayload(action, ctx),
        durationMs: 0,
        result: cancelledResult
      });
    }

    return scheduleDebounce<string, ActionResult>(
      pendingDebounces,
      key,
      debounceMs,
      () => runSingleActionWithRetry(action, ctx)
    );
  }

  async function runSingleActionWithRetry(action: ActionSchema, ctx: ActionContext): Promise<ActionResult> {
    const retry = getRetryControl(action.retry);
    const { result: lastResult, attempts } = await withRetry(
      () => runSingleActionWithTimeout(action, ctx),
      {
        times: retry?.times ?? 0,
        delay: retry?.delay ?? 0
      },
      (result) => Boolean(result.ok || result.skipped || result.cancelled || result.timedOut)
    );

    return {
      ...(lastResult ?? { ok: false, error: new Error('Action failed without result') }),
      attempts
    };
  }

  function runSingleActionWithTimeout(action: ActionSchema, ctx: ActionContext): Promise<ActionResult> {
    const timeoutMs = getNumericControl(action.timeout);

    if (!timeoutMs || timeoutMs <= 0) {
      return runSingleAction(action, ctx);
    }

    return withTimeout(
      (signal) => runSingleAction(action, ctx, signal),
      timeoutMs,
      () => createTimedOutResult(new Error(`Action timed out after ${timeoutMs}ms`))
    );
  }

  async function dispatch(action: ActionSchema | ActionSchema[], ctx: ActionContext): Promise<ActionResult> {
    const actions = Array.isArray(action) ? action : [action];
    let previous: ActionResult = { ok: true };

    for (const current of actions) {
      const actionContext = {
        ...ctx,
        interactionId: ctx.interactionId ?? createInteractionId(),
        prevResult: previous,
        evaluationBindings: ctx.evaluationBindings
      };
      const control = resolveActionControl(current);
      const normalizedAction = control
        ? {
            ...current,
            timeout: current.timeout ?? control.timeout,
            debounce: current.debounce ?? control.debounce,
            retry: current.retry ?? control.retry
          }
        : current;
      const result = await runActionWithDebounce(normalizedAction, actionContext);
      const resultClass = classifyActionResult(result);

      previous = result;

      if (resultClass === 'success' && normalizedAction.then) {
        previous = await dispatch(normalizedAction.then, {
          ...ctx,
          interactionId: actionContext.interactionId,
          prevResult: result,
          evaluationBindings: mergeEvaluationBindings(
            ctx.evaluationBindings,
            createBranchEvaluationBindings(result, actionContext.prevResult)
          )
        });
      } else if (resultClass === 'failure' && normalizedAction.onError) {
        const eventType = typeof (ctx.event as { type?: unknown } | undefined)?.type === 'string'
          ? (ctx.event as { type: string }).type
          : 'actionError';
        previous = await dispatch(normalizedAction.onError, {
          ...ctx,
          interactionId: actionContext.interactionId,
          prevResult: result,
          event: {
            ...(ctx.event && typeof ctx.event === 'object' ? ctx.event as Record<string, unknown> : {}),
            type: eventType,
            result,
            error: result.error,
            prevResult: actionContext.prevResult
          },
          evaluationBindings: mergeEvaluationBindings(
            ctx.evaluationBindings,
            createBranchEvaluationBindings(result, actionContext.prevResult)
          )
        });
      }

      if (resultClass === 'failure' && !normalizedAction.continueOnError) {
        return result;
      }
    }

    return previous;
  }

  return { dispatch };
}
