import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  ActionSchema,
  CompiledActionNode,
  CompiledActionProgram,
} from '@nop-chaos/flux-core';
import { withRetry, withTimeout } from '../operation-control.js';
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
  isAbortError,
} from '../action-core.js';
import { cancelPendingDebounce, scheduleDebounce } from '@nop-chaos/flux-core';
import type { ActionDispatcherConfig, ActionDispatcherContext } from './types.js';
import {
  isRequestBackedAction,
  normalizeCompiledActionProgram,
  applyActionControl,
} from './program-utils.js';
import { finishAction } from './action-runners.js';
import { runBuiltInAction } from './built-in-actions.js';
import { runComponentAction, runNamespacedAction, runNamedAction } from './action-runners.js';

// [Plan 444 / 02-N2] Extraction evaluation: this file (~688 lines) implements the action
// dispatch pipeline as a clear call chain: dispatch → runActionWithDebounce →
// runSingleActionWithRetry → runSingleActionWithTimeout → runSingleAction → built-in/
// component/named/namespaced runners. Utility functions (mergeAbortSignals, reportActionError,
// reportUnhandledFailureClass, etc.) are small and well-scoped. The dispatch function handles
// then/onError/onSettled branching which is the core of action sequencing and shares the
// ActionDispatcherContext throughout. Splitting would break the natural pipeline readability.
// Decision: current cohesion is acceptable, no extraction needed.

const caughtFailureResults = new WeakSet<ActionResult>();

function createFailureError(message: string, cause?: unknown): Error {
  const error = new Error(message);

  if (cause !== undefined) {
    (error as Error & { cause?: unknown }).cause = cause;
  }

  return error;
}

function createParallelFailureError(result: ActionResult): Error {
  if (result.error instanceof Error) {
    return result.error;
  }

  const message =
    typeof result.error === 'string' && result.error.length > 0
      ? result.error
      : result.cancelled
        ? 'Parallel action was cancelled'
        : result.timedOut
          ? 'Parallel action timed out'
          : 'Parallel action failed';

  return createFailureError(message, result);
}

function hasOwnDefined<T extends object, K extends keyof T>(value: T, key: K): boolean {
  return Object.prototype.hasOwnProperty.call(value, key) && value[key] !== undefined;
}

function getFailureMetadata(
  actionPayload: ActionMonitorPayload,
  error: unknown,
): Partial<Pick<ActionResult, 'componentId' | 'componentName' | 'componentType' | 'namespace' | 'sourceScopeId' | 'providerKind'>> {
  const errorMetadata =
    error && typeof error === 'object' ? (error as Partial<ActionResult>) : undefined;

  return {
    componentId: errorMetadata?.componentId ?? actionPayload.componentId,
    componentName: errorMetadata?.componentName ?? actionPayload.componentName,
    componentType: errorMetadata?.componentType ?? actionPayload.componentType,
    namespace: errorMetadata?.namespace ?? actionPayload.namespace,
    sourceScopeId: errorMetadata?.sourceScopeId ?? actionPayload.sourceScopeId,
    providerKind: errorMetadata?.providerKind ?? actionPayload.providerKind,
  };
}

function mergeAbortSignals(rootSignal: AbortSignal, actionSignal?: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const noop = { signal: rootSignal, cleanup() {} };

  if (!actionSignal || actionSignal === rootSignal) {
    return noop;
  }

  if (rootSignal.aborted) {
    return noop;
  }

  if (actionSignal.aborted) {
    return { signal: actionSignal, cleanup() {} };
  }

  const controller = new AbortController();
  const abortFrom = (signal: AbortSignal) => {
    if (!controller.signal.aborted) {
      controller.abort(signal.reason);
    }
  };

  const onRootAbort = () => abortFrom(rootSignal);
  const onActionAbort = () => abortFrom(actionSignal);

  rootSignal.addEventListener('abort', onRootAbort);
  actionSignal.addEventListener('abort', onActionAbort);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    rootSignal.removeEventListener('abort', onRootAbort);
    actionSignal.removeEventListener('abort', onActionAbort);
  };

  controller.signal.addEventListener('abort', cleanup, { once: true });

  return { signal: controller.signal, cleanup };
}

function reportActionError(
  ctx: ActionDispatcherContext,
  error: unknown,
  actionCtx: ActionContext,
) {
  try {
    ctx.onActionError?.(error, actionCtx);
  } catch {
    // Diagnostic hooks must not replace the primary action failure.
  }

  for (const plugin of ctx.plugins ?? []) {
    try {
      plugin.onError?.(error, {
        phase: 'action',
        error,
        nodeId: actionCtx.nodeInstance?.templateNode.id,
        path: actionCtx.nodeInstance?.templateNode.templatePath,
      });
    } catch {
      // Plugin diagnostics are best-effort and must not mask the original failure.
    }
  }
}

function reportActionEnd(
  ctx: ActionDispatcherContext,
  actionPayload: ActionMonitorPayload,
  durationMs: number,
  result: ActionResult,
): void {
  try {
    ctx.getEnv().monitor?.onActionEnd?.({
      ...actionPayload,
      durationMs,
      result,
    });
  } catch {
    // Monitoring must not replace the primary action result.
  }
}

function reportUnhandledFailureClass(
  ctx: ActionDispatcherContext,
  actionCtx: ActionContext,
  result: ActionResult,
  handledByOnError: boolean,
): void {
  const eventType =
    typeof (actionCtx.event as { type?: unknown } | undefined)?.type === 'string'
      ? (actionCtx.event as { type: string }).type
      : undefined;
  const syntheticBranchEvent =
    eventType === 'actionError' ||
    eventType === 'actionSettled' ||
    eventType === 'actionSettledError';

  if (
    handledByOnError ||
    !isFailureClass(result) ||
    result.failureHandled ||
    syntheticBranchEvent ||
    caughtFailureResults.has(result)
  ) {
    return;
  }

  const message =
    result.error instanceof Error
      ? result.error.message
      : String(result.error ?? 'Action failed');

  ctx.getEnv().notify('error', message);
}

function preserveCaughtFailureMarker(source: ActionResult | undefined, target: ActionResult): ActionResult {
  if (source && caughtFailureResults.has(source)) {
    caughtFailureResults.add(target);
  }

  return target;
}

async function runParallelActions(
  ctx: ActionDispatcherContext,
  action: CompiledActionNode,
  actionCtx: ActionContext,
  startedAt: number,
  actionPayload: ActionMonitorPayload,
): Promise<ActionResult | undefined> {
  if (!action.parallel || action.parallel.length === 0) {
    return undefined;
  }

  const results = await Promise.all(
    action.parallel.map((entry) =>
      runActionWithDebounce(ctx, entry, {
        ...actionCtx,
        interactionId: actionCtx.interactionId ?? createInteractionId(),
        signal: actionCtx.signal,
        prevResult: actionCtx.prevResult,
      }),
    ),
  );

  const representativeFailure = results.find(
    (result) => isFailureClass(result),
  );
  const representativeError =
    representativeFailure ? createParallelFailureError(representativeFailure) : undefined;

  return finishAction(ctx, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, {
    ok: results.every((result) => !isFailureClass(result)),
    data: results,
    results,
    error: representativeError,
  });
}

async function runSingleAction(
  ctx: ActionDispatcherContext,
  action: CompiledActionNode,
  actionCtx: ActionContext,
  signal?: AbortSignal,
): Promise<ActionResult> {
  const effectiveSignal = signal ?? actionCtx.signal;
  const activeCtx =
    effectiveSignal && actionCtx.signal !== effectiveSignal
      ? { ...actionCtx, signal: effectiveSignal }
      : actionCtx;
  const startedAt = Date.now();
  const actionPayload = buildActionMonitorPayload(action, activeCtx);

  try {
    ctx.getEnv().monitor?.onActionStart?.(actionPayload);
    const processedAction =
      (ctx.plugins?.length ?? 0) > 0
        ? normalizeCompiledActionProgram(
            await (ctx.plugins ?? []).reduce<Promise<ActionSchema>>(
              async (currentPromise, plugin) => {
                const current = await currentPromise;
                return plugin.beforeAction ? plugin.beforeAction(current, activeCtx) : current;
              },
              Promise.resolve(action.source),
            ),
            ctx,
          ).nodes[0]!
        : action;

    if (!shouldRunActionWhen(processedAction, activeCtx, ctx.evaluator)) {
      return finishAction(ctx, actionPayload, startedAt, {
        ok: true,
        skipped: true,
      });
    }

    if (processedAction.parallel && processedAction.parallel.length > 0) {
      const parallelResult = await runParallelActions(
        ctx,
        processedAction,
        activeCtx,
        startedAt,
        actionPayload,
      );
      if (parallelResult) {
        return parallelResult;
      }
    }

    const builtInResult = await runBuiltInAction(
      processedAction,
      activeCtx,
      startedAt,
      actionPayload,
      effectiveSignal,
      ctx,
    );
    if (builtInResult) {
      return builtInResult;
    }

    const componentResult = await runComponentAction(
      processedAction,
      activeCtx,
      startedAt,
      actionPayload,
      ctx,
    );
    if (componentResult) {
      return componentResult;
    }

    const namedResult = await runNamedAction(
      processedAction,
      activeCtx,
      startedAt,
      actionPayload,
      ctx,
    );
    if (namedResult) {
      return namedResult;
    }

    const namespacedResult = await runNamespacedAction(
      processedAction,
      activeCtx,
      startedAt,
      actionPayload,
      ctx,
    );
    if (namespacedResult) {
      return namespacedResult;
    }

    return finishAction(ctx, actionPayload, startedAt, {
      ok: false,
      error: new Error(`Unsupported action: ${processedAction.action}`),
    });
  } catch (error) {
    if (isAbortError(error)) {
      const result = createCancelledResult(error);
      reportActionEnd(ctx, actionPayload, Date.now() - startedAt, result);
      return result;
    }

    reportActionError(ctx, error, activeCtx);

    const metadata = getFailureMetadata(actionPayload, error);

    const result = {
      ok: false,
      error,
      ...metadata,
    };
    caughtFailureResults.add(result);
    reportActionEnd(ctx, actionPayload, Date.now() - startedAt, result);
    return result;
  }
}

function runActionWithDebounce(
  ctx: ActionDispatcherContext,
  action: CompiledActionNode,
  actionCtx: ActionContext,
): Promise<ActionResult> {
  const debounceMs = getNumericControl(action.control?.debounce);

  if (!debounceMs || debounceMs <= 0) {
    return runSingleActionWithRetry(ctx, action, actionCtx);
  }

  const key = createActionKey(action, actionCtx);
  const cancelledResult = createCancelledResult();

  if (cancelPendingDebounce<string, ActionResult>(ctx.pendingDebounces, key, cancelledResult)) {
    reportActionEnd(ctx, buildActionMonitorPayload(action, actionCtx), 0, cancelledResult);
  }

  return scheduleDebounce<string, ActionResult>(ctx.pendingDebounces, key, debounceMs, () =>
    runSingleActionWithRetry(ctx, action, actionCtx),
  );
}

async function runSingleActionWithRetry(
  ctx: ActionDispatcherContext,
  action: CompiledActionNode,
  actionCtx: ActionContext,
): Promise<ActionResult> {
  if (isRequestBackedAction(action)) {
    const result = await runSingleActionWithTimeout(ctx, action, actionCtx);
    const resultWithRetry = result as { attempts?: unknown; failureCount?: unknown };
    const errorWithRetry = result.error as
      | { attempts?: unknown; failureCount?: unknown }
      | undefined;

    return preserveCaughtFailureMarker(result, {
      ...result,
      attempts:
        typeof resultWithRetry.attempts === 'number'
          ? resultWithRetry.attempts
          : typeof errorWithRetry?.attempts === 'number'
            ? errorWithRetry.attempts
            : result.attempts,
      failureCount:
        typeof resultWithRetry.failureCount === 'number'
          ? resultWithRetry.failureCount
          : typeof errorWithRetry?.failureCount === 'number'
          ? errorWithRetry.failureCount
          : result.failureCount,
    });
  }

  const retry = getRetryControl(action.control?.retry);
  try {
    const {
      result: lastResult,
      attempts,
      failureCount,
      lastFailureReason,
    } = await withRetry(
      () => runSingleActionWithTimeout(ctx, action, actionCtx),
      {
        times: retry?.times ?? 0,
        delay: retry?.delay ?? 0,
        strategy: retry?.strategy ?? 'fixed',
        maxDelay: retry?.maxDelay,
        signal: actionCtx.signal,
      },
      (result) => Boolean(result.ok || result.skipped || result.cancelled || result.timedOut),
    );
    const lastResultWithRetry = lastResult as { attempts?: unknown; failureCount?: unknown } | undefined;
    const preservedAttempts =
      attempts > 1 || failureCount > 0
        ? attempts
        : typeof lastResultWithRetry?.attempts === 'number'
          ? lastResultWithRetry.attempts
          : attempts;
    const preservedFailureCount =
      attempts > 1 || failureCount > 0
        ? failureCount
        : typeof lastResultWithRetry?.failureCount === 'number'
          ? lastResultWithRetry.failureCount
          : failureCount;

    return preserveCaughtFailureMarker(lastResult, {
      ...(lastResult ?? { ok: false, error: new Error('Action failed without result') }),
      attempts: preservedAttempts,
      failureCount: preservedFailureCount,
      error: lastResult?.error ?? lastFailureReason,
    });
  } catch (error) {
    if (isAbortError(error)) {
      const errorWithRetry = error as { attempts?: unknown; failureCount?: unknown };
      return {
        ...createCancelledResult(error),
        attempts: typeof errorWithRetry.attempts === 'number' ? errorWithRetry.attempts : undefined,
        failureCount:
          typeof errorWithRetry.failureCount === 'number'
            ? errorWithRetry.failureCount
            : undefined,
      };
    }

    throw error;
  }
}

function runSingleActionWithTimeout(
  ctx: ActionDispatcherContext,
  action: CompiledActionNode,
  actionCtx: ActionContext,
): Promise<ActionResult> {
  const timeoutMs = getNumericControl(action.control?.timeout);

  if (!timeoutMs || timeoutMs <= 0) {
    return runSingleAction(ctx, action, actionCtx);
  }

  return withTimeout(
    (signal) => runSingleAction(ctx, action, actionCtx, signal),
    timeoutMs,
    () => createTimedOutResult(new Error(`Action timed out after ${timeoutMs}ms`)),
    actionCtx.signal,
  );
}

async function dispatch(
  ctx: ActionDispatcherContext,
  action: ActionSchema | ActionSchema[] | CompiledActionProgram,
  actionCtx: ActionContext,
): Promise<ActionResult> {
  const { signal: mergedSignal, cleanup: mergedSignalCleanup } = mergeAbortSignals(
    ctx.rootAbortController.signal,
    actionCtx.signal,
  );
  const baseActionCtx =
    mergedSignal === actionCtx.signal ? actionCtx : { ...actionCtx, signal: mergedSignal };
  const actions = normalizeCompiledActionProgram(action, ctx).nodes;
  let previous: ActionResult = { ok: true };

  try {
    for (const current of actions) {
      if (baseActionCtx.signal?.aborted) {
        previous = createCancelledResult(baseActionCtx.signal.reason);
        break;
      }

      const currentActionCtx = {
        ...baseActionCtx,
        interactionId: baseActionCtx.interactionId ?? createInteractionId(),
        prevResult: previous,
        evaluationBindings: baseActionCtx.evaluationBindings,
      };
      const normalizedAction = applyActionControl(current, resolveActionControl(current));
      const result = await runActionWithDebounce(ctx, normalizedAction, currentActionCtx);
      const resultClass = classifyActionResult(result);

      previous = result;

      const branchBindings = mergeEvaluationBindings(
        actionCtx.evaluationBindings,
        createBranchEvaluationBindings(result, currentActionCtx.prevResult),
      );

      if (resultClass === 'success' && normalizedAction.then) {
        previous = await dispatch(
          ctx,
          {
            nodes: normalizedAction.then,
            isFullyStatic: false,
          },
          {
            ...baseActionCtx,
            interactionId: currentActionCtx.interactionId,
            prevResult: result,
            evaluationBindings: branchBindings,
          },
        );
      } else if (isFailureClass(result) && normalizedAction.onError) {
        const eventType =
          typeof (actionCtx.event as { type?: unknown } | undefined)?.type === 'string'
            ? (actionCtx.event as { type: string }).type
            : 'actionError';
        try {
          previous = await dispatch(
            ctx,
            {
              nodes: normalizedAction.onError,
              isFullyStatic: false,
            },
            {
              ...baseActionCtx,
              interactionId: currentActionCtx.interactionId,
              prevResult: result,
              event: {
                ...(baseActionCtx.event && typeof baseActionCtx.event === 'object'
                  ? (baseActionCtx.event as Record<string, unknown>)
                  : {}),
                type: eventType,
                result,
                error: result.error,
                prevResult: currentActionCtx.prevResult,
              },
              evaluationBindings: branchBindings,
            },
          );

          if (classifyActionResult(previous) === 'failure') {
            previous = {
              ...result,
              onErrorError: hasOwnDefined(previous, 'error') ? previous.error : previous,
            };
          }
        } catch (error) {
          reportActionError(ctx, error, currentActionCtx);

          previous = {
            ...result,
            onErrorError: error,
          };
        }
      }

      reportUnhandledFailureClass(ctx, currentActionCtx, result, Boolean(normalizedAction.onError));

      if ((resultClass === 'success' || isFailureClass(result)) && normalizedAction.onSettled) {
        const settledEventType = isFailureClass(result) ? 'actionSettledError' : 'actionSettled';

        try {
          const settledResult = await dispatch(
            ctx,
            {
              nodes: normalizedAction.onSettled,
              isFullyStatic: false,
            },
            {
              ...baseActionCtx,
              interactionId: currentActionCtx.interactionId,
              prevResult: result,
              event: {
                ...(baseActionCtx.event && typeof baseActionCtx.event === 'object'
                  ? (baseActionCtx.event as Record<string, unknown>)
                  : {}),
                type: settledEventType,
                result,
                error: isFailureClass(result) ? result.error : undefined,
                prevResult: currentActionCtx.prevResult,
                settled: true,
              },
              evaluationBindings: branchBindings,
            },
          );

          if (classifyActionResult(settledResult) === 'failure') {
            previous = {
              ...previous,
              settledError: settledResult.error,
            };
          }
        } catch (error) {
          reportActionError(ctx, error, currentActionCtx);

          const message = error instanceof Error ? error.message : String(error);
          ctx.getEnv().notify('error', message);

          previous = {
            ...previous,
            settledError: error,
          };
        }
      }

      if (isFailureClass(result) && !normalizedAction.control?.continueOnError) {
        return hasOwnDefined(previous, 'onErrorError') ? previous : result;
      }
    }

    return previous;
  } finally {
    mergedSignalCleanup();
  }
}

export function createActionDispatcher(config: ActionDispatcherConfig) {
  const ctx: ActionDispatcherContext = {
    getEnv: config.getEnv,
    plugins: config.plugins,
    onActionError: config.onActionError,
    evaluator: config.evaluator,
    adapter: config.adapter,
    expressionCompiler: config.expressionCompiler,
    actionProgramCompiler: config.actionProgramCompiler,
    compiledProgramCache: new WeakMap(),
    pendingDebounces: new Map(),
    rootAbortController: new AbortController(),
  };

  return {
    dispatch: (
      action: ActionSchema | ActionSchema[] | CompiledActionProgram,
      actionCtx: ActionContext,
    ) => dispatch(ctx, action, actionCtx),
    getAbortSignal() {
      return ctx.rootAbortController.signal;
    },
    dispose() {
      if (!ctx.rootAbortController.signal.aborted) {
        ctx.rootAbortController.abort();
      }
      const cancelledResult = createCancelledResult();
      for (const [, pending] of ctx.pendingDebounces) {
        if (pending.timer != null) clearTimeout(pending.timer);
        pending.resolve(cancelledResult);
      }
      ctx.pendingDebounces.clear();
    },
  };
}
