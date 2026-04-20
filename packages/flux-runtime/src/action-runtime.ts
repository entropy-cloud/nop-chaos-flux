import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  ActionSchema,
  CompiledActionNode,
  CompiledActionProgram,
  OperationControlConfig,
} from '@nop-chaos/flux-core';
import { compileActions } from './action-compiler';
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
  isFailureClass,
  mergeEvaluationBindings,
  normalizeActionResult,
  resolveActionControl,
  shouldRunActionWhen,
  type ActionDispatcherInput
} from './action-runtime-core';
import { runBuiltInAction, runComponentAction } from './action-runtime-handlers';
import { isAbortError } from './error-utils';

export function createActionDispatcher(input: ActionDispatcherInput) {
  const compiledProgramCache = new WeakMap<object, CompiledActionProgram>();
  const pendingDebounces = new Map<string, {
    timer: ReturnType<typeof setTimeout>;
    resolve: (result: ActionResult) => void;
    reject: (error: unknown) => void;
  }>();

  function isRequestBackedAction(action: CompiledActionNode): boolean {
    return action.action === 'ajax' || action.action === 'submitForm';
  }

  function isCompiledActionProgram(action: unknown): action is CompiledActionProgram {
    return Boolean(
      action &&
      typeof action === 'object' &&
      'nodes' in action &&
      Array.isArray((action as CompiledActionProgram).nodes)
    );
  }

  function normalizeCompiledActionProgram(action: ActionSchema | ActionSchema[] | CompiledActionProgram): CompiledActionProgram {
    if (isCompiledActionProgram(action)) {
      return action;
    }

    const cached = compiledProgramCache.get(action as object);

    if (cached) {
      return cached;
    }

    const compiled = compileActions(action, input.runtime.expressionCompiler);
    compiledProgramCache.set(action as object, compiled);
    return compiled;
  }

  function applyActionControl(action: CompiledActionNode, control: OperationControlConfig | undefined): CompiledActionNode {
    if (!control) {
      if (action.control) {
        return action;
      }

      return {
        ...action,
        control: {}
      };
    }

    return {
      ...action,
      control: {
        ...(action.control ?? {}),
        timeout: action.control?.timeout ?? control.timeout,
        debounce: action.control?.debounce ?? control.debounce,
        retry: action.control?.retry ?? control.retry,
        control: action.control?.control ?? control
      }
    };
  }

  async function runParallelActions(
    action: CompiledActionNode,
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
        signal: ctx.signal,
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
    action: CompiledActionNode,
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

  async function runSingleAction(action: CompiledActionNode, ctx: ActionContext, signal?: AbortSignal): Promise<ActionResult> {
    const effectiveSignal = signal ?? ctx.signal;
    const activeCtx = effectiveSignal && ctx.signal !== effectiveSignal ? { ...ctx, signal: effectiveSignal } : ctx;
    const startedAt = Date.now();
    const actionPayload = buildActionMonitorPayload(action, activeCtx);
    input.getEnv().monitor?.onActionStart?.(actionPayload);

    try {
      const processedAction = (input.plugins?.length ?? 0) > 0
        ? normalizeCompiledActionProgram(
            await (input.plugins ?? []).reduce<Promise<ActionSchema>>(
              async (currentPromise, plugin) => {
                const current = await currentPromise;
                return plugin.beforeAction ? plugin.beforeAction(current, activeCtx) : current;
              },
              Promise.resolve(action.source)
            )
          ).nodes[0]!
        : action;

      if (!shouldRunActionWhen(processedAction, activeCtx, input)) {
        return finishAction(input, actionPayload, startedAt, {
          ok: true,
          skipped: true
        });
      }

      const parallelResult = await runParallelActions(processedAction, activeCtx, startedAt, actionPayload);

      if (parallelResult) {
        return parallelResult;
      }

      const builtInResult = await runBuiltInAction(input, processedAction, activeCtx, startedAt, actionPayload, effectiveSignal);

      if (builtInResult) {
        return builtInResult;
      }

      const componentResult = await runComponentAction(input, processedAction, activeCtx, startedAt, actionPayload);

      if (componentResult) {
        return componentResult;
      }

      const namespacedResult = await runNamespacedAction(processedAction, activeCtx, startedAt, actionPayload);

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

      input.onActionError?.(error, activeCtx);

      for (const plugin of input.plugins ?? []) {
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
      input.getEnv().monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
      return result;
    }
  }

  function runActionWithDebounce(action: CompiledActionNode, ctx: ActionContext): Promise<ActionResult> {
    const debounceMs = getNumericControl(action.control?.debounce);

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

  async function runSingleActionWithRetry(action: CompiledActionNode, ctx: ActionContext): Promise<ActionResult> {
    if (isRequestBackedAction(action)) {
      const result = await runSingleActionWithTimeout(action, ctx);
      const errorWithRetry = result.error as { attempts?: unknown; failureCount?: unknown } | undefined;

      return {
        ...result,
        attempts: typeof errorWithRetry?.attempts === 'number' ? errorWithRetry.attempts : result.attempts,
        failureCount: typeof errorWithRetry?.failureCount === 'number' ? errorWithRetry.failureCount : result.failureCount
      };
    }

    const retry = getRetryControl(action.control?.retry);
    const { result: lastResult, attempts, failureCount, lastFailureReason } = await withRetry(
      () => runSingleActionWithTimeout(action, ctx),
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

  function runSingleActionWithTimeout(action: CompiledActionNode, ctx: ActionContext): Promise<ActionResult> {
    const timeoutMs = getNumericControl(action.control?.timeout);

    if (!timeoutMs || timeoutMs <= 0) {
      return runSingleAction(action, ctx);
    }

    return withTimeout(
      (signal) => runSingleAction(action, ctx, signal),
      timeoutMs,
      () => createTimedOutResult(new Error(`Action timed out after ${timeoutMs}ms`))
    );
  }

  async function dispatch(action: ActionSchema | ActionSchema[] | CompiledActionProgram, ctx: ActionContext): Promise<ActionResult> {
    const actions = normalizeCompiledActionProgram(action).nodes;
    let previous: ActionResult = { ok: true };

    for (const current of actions) {
      const actionContext = {
        ...ctx,
        interactionId: ctx.interactionId ?? createInteractionId(),
        prevResult: previous,
        evaluationBindings: ctx.evaluationBindings
      };
      const normalizedAction = applyActionControl(current, resolveActionControl(current));
      const result = await runActionWithDebounce(normalizedAction, actionContext);
      const resultClass = classifyActionResult(result);

      previous = result;

      const branchBindings = mergeEvaluationBindings(
        ctx.evaluationBindings,
        createBranchEvaluationBindings(result, actionContext.prevResult)
      );

      if (resultClass === 'success' && normalizedAction.then) {
        previous = await dispatch({
          nodes: normalizedAction.then,
          isFullyStatic: false
        }, {
          ...ctx,
          interactionId: actionContext.interactionId,
          prevResult: result,
          evaluationBindings: branchBindings
        });
      } else if (resultClass === 'failure' && normalizedAction.onError) {
        const eventType = typeof (ctx.event as { type?: unknown } | undefined)?.type === 'string'
          ? (ctx.event as { type: string }).type
          : 'actionError';
        previous = await dispatch({
          nodes: normalizedAction.onError,
          isFullyStatic: false
        }, {
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
          evaluationBindings: branchBindings
        });
      }

      if ((resultClass === 'success' || resultClass === 'failure') && normalizedAction.onSettled) {
        const settledEventType = resultClass === 'failure' ? 'actionSettledError' : 'actionSettled';

        try {
          await dispatch({
            nodes: normalizedAction.onSettled,
            isFullyStatic: false
          }, {
            ...ctx,
            interactionId: actionContext.interactionId,
            prevResult: result,
            event: {
              ...(ctx.event && typeof ctx.event === 'object' ? ctx.event as Record<string, unknown> : {}),
              type: settledEventType,
              result,
              error: isFailureClass(result) ? result.error : undefined,
              prevResult: actionContext.prevResult,
              settled: true
            },
            evaluationBindings: branchBindings
          });
        } catch (error) {
          input.onActionError?.(error, actionContext);

          for (const plugin of input.plugins ?? []) {
            plugin.onError?.(error, {
              phase: 'action',
              error,
              nodeId: ctx.nodeInstance?.templateNode.id,
              path: ctx.nodeInstance?.templateNode.templatePath
            });
          }

          const message = error instanceof Error ? error.message : String(error);
          input.getEnv().notify('error', message);
        }
      }

      if (resultClass === 'failure' && !normalizedAction.control?.continueOnError) {
        return result;
      }
    }

    return previous;
  }

  return { dispatch };
}
