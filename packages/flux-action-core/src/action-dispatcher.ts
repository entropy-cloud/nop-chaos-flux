import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  ActionRuntimeAdapter,
  ActionSchema,
  BuiltInActionInvocation,
  CompiledActionNode,
  ComponentActionInvocation,
  CompiledActionProgram,
  NamespacedActionInvocation,
  OperationControlConfig,
  RendererEnv,
  RendererPlugin,
  RendererRuntime
} from '@nop-chaos/flux-core';
import { isSchema, isSchemaArray } from '@nop-chaos/flux-core';
import { compileActions } from '@nop-chaos/flux-compiler';
import { withRetry, withTimeout } from './operation-control';
import {
  buildActionMonitorPayload,
  classifyActionResult,
  createActionKey,
  createCancelledResult,
  createInteractionId,
  createTimedOutResult,
  createBranchEvaluationBindings,
  evaluateActionArgs,
  resolveSetValuePayload,
  resolveSetValuesPayload,
  getNumericControl,
  getRetryControl,
  isFailureClass,
  mergeEvaluationBindings,
  normalizeActionResult,
  resolveActionControl,
  shouldRunActionWhen,
  isAbortError,
  type ActionEvaluator
} from './action-core';
import { cancelPendingDebounce, scheduleDebounce } from './utils/debounce';

const COMPONENT_ACTION_PREFIX = 'component:';

function isComponentAction(actionName: string): boolean {
  return actionName.startsWith(COMPONENT_ACTION_PREFIX);
}

function extractComponentMethod(actionName: string): string {
  return actionName.slice(COMPONENT_ACTION_PREFIX.length);
}

function isNamespacedAction(actionName: string): boolean {
  const separatorIndex = actionName.indexOf(':');
  return separatorIndex > 0 && separatorIndex < actionName.length - 1 && !isComponentAction(actionName);
}

function parseNamespacedAction(actionName: string): { namespace: string; method: string } | undefined {
  const separatorIndex = actionName.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex >= actionName.length - 1) {
    return undefined;
  }
  return {
    namespace: actionName.slice(0, separatorIndex),
    method: actionName.slice(separatorIndex + 1)
  };
}

export interface ActionDispatcherConfig {
  getEnv: () => RendererEnv;
  plugins?: RendererPlugin[];
  onActionError?: (error: unknown, ctx: ActionContext) => void;
  evaluator: ActionEvaluator;
  adapter: ActionRuntimeAdapter;
  runtime: RendererRuntime;
}

export function createActionDispatcher(config: ActionDispatcherConfig) {
  const { getEnv, plugins, onActionError, evaluator, adapter, runtime } = config;
  const compiledProgramCache = new WeakMap<object, CompiledActionProgram>();
  const pendingDebounces = new Map<string, {
    timer: ReturnType<typeof setTimeout>;
    resolve: (result: ActionResult) => void;
    reject: (error: unknown) => void;
  }>();

  function isRequestBackedAction(action: CompiledActionNode): boolean {
    return action.action === 'ajax' || action.action === 'submitForm' || action.action === 'submit';
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

    const compiled = compileActions(action, runtime.expressionCompiler);
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

  function evaluateSurfaceArgs(
    action: CompiledActionNode,
    ctx: ActionContext
  ): Record<string, unknown> | undefined {
    const rawArgs = action.source.args;

    if (!rawArgs || typeof rawArgs !== 'object' || Array.isArray(rawArgs)) {
      return evaluateActionArgs(action, ctx, evaluator);
    }

    const evaluated = evaluateActionArgs(action, ctx, evaluator) ?? {};
    const result: Record<string, unknown> = { ...evaluated };

    for (const [key, value] of Object.entries(rawArgs)) {
      if (isSchema(value) || isSchemaArray(value as unknown[])) {
        result[key] = value;
      }
    }

    return result;
  }

  function finishAction(
    actionPayload: ActionMonitorPayload,
    startedAt: number,
    result: ActionResult
  ): ActionResult {
    const enrichedPayload: ActionMonitorPayload = {
      ...actionPayload,
      ...(result.componentId !== undefined && { componentId: result.componentId }),
      ...(result.componentName !== undefined && { componentName: result.componentName }),
      ...(result.componentType !== undefined && { componentType: result.componentType }),
      ...(result.namespace !== undefined && { namespace: result.namespace }),
      ...(result.sourceScopeId !== undefined && { sourceScopeId: result.sourceScopeId }),
      ...(result.providerKind !== undefined && { providerKind: result.providerKind })
    };
    getEnv().monitor?.onActionEnd?.({
      ...enrichedPayload,
      durationMs: Date.now() - startedAt,
      result
    });
    return result;
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

    return finishAction({ ...actionPayload, dispatchMode: 'built-in' }, startedAt, {
      ok: results.every((result) => classifyActionResult(result) !== 'failure'),
      data: results,
      results
    });
  }

  async function runBuiltInAction(
    action: CompiledActionNode,
    ctx: ActionContext,
    startedAt: number,
    actionPayload: ActionMonitorPayload,
    signal?: AbortSignal
  ): Promise<ActionResult | undefined> {
    let invocation: BuiltInActionInvocation | undefined;

    switch (action.action) {
      case 'setValue': {
        const payload = resolveSetValuePayload(action, ctx, evaluator);
        const targetPath = payload.path ?? action.targeting.componentId ?? '';
        invocation = {
          action: 'setValue',
          args: {
            path: targetPath,
            value: payload.value
          },
          targeting: action.targeting,
          actionNode: action,
          signal
        };
        break;
      }
      case 'setValues': {
        const payload = resolveSetValuesPayload(action, ctx, evaluator);
        invocation = {
          action: 'setValues',
          args: {
            path: action.targeting.targetId,
            values: payload.values
          },
          targeting: action.targeting,
          actionNode: action,
          signal
        };
        break;
      }
      case 'ajax': {
        const api = evaluateActionArgs(action, ctx, evaluator);
        if (!api) {
          return finishAction(
            { ...actionPayload, dispatchMode: 'built-in' },
            startedAt,
            { ok: false, error: new Error('ajax requires args payload') }
          );
        }
        invocation = {
          action: 'ajax',
          args: api,
          targeting: action.targeting,
          actionNode: action,
          signal
        };
        break;
      }
      case 'openDialog': {
        const dialog = evaluateSurfaceArgs(action, ctx);
        if (!dialog) {
          return finishAction(
            { ...actionPayload, dispatchMode: 'built-in' },
            startedAt,
            { ok: false, error: new Error('openDialog requires args payload') }
          );
        }
        invocation = {
          action: 'openDialog',
          args: dialog,
          targeting: action.targeting,
          actionNode: action,
          signal
        };
        break;
      }
      case 'openDrawer': {
        const drawer = evaluateSurfaceArgs(action, ctx);
        if (!drawer) {
          return finishAction(
            { ...actionPayload, dispatchMode: 'built-in' },
            startedAt,
            { ok: false, error: new Error('openDrawer requires args payload') }
          );
        }
        invocation = {
          action: 'openDrawer',
          args: drawer,
          targeting: action.targeting,
          actionNode: action,
          signal
        };
        break;
      }
      case 'closeDrawer': {
        invocation = {
          action: 'closeDrawer',
          args: action.targeting.dialogId ? { dialogId: String(action.targeting.dialogId) } : undefined,
          targeting: action.targeting,
          actionNode: action,
          signal
        };
        break;
      }
      case 'showToast': {
        const payload = evaluateActionArgs(action, ctx, evaluator);
        invocation = {
          action: 'showToast',
          args: payload,
          targeting: action.targeting,
          actionNode: action,
          signal
        };
        break;
      }
      case 'closeDialog': {
        invocation = {
          action: 'closeDialog',
          args: action.targeting.dialogId ? { dialogId: String(action.targeting.dialogId) } : undefined,
          targeting: action.targeting,
          actionNode: action,
          signal
        };
        break;
      }
      case 'refreshTable': {
        invocation = {
          action: 'refreshTable',
          targeting: action.targeting,
          actionNode: action,
          signal
        };
        break;
      }
      case 'refreshSource': {
        const sourceId = action.targeting.targetId;
        if (!sourceId) {
          return finishAction(
            { ...actionPayload, dispatchMode: 'built-in' },
            startedAt,
            { ok: false, error: new Error('refreshSource requires targetId') }
          );
        }
        invocation = {
          action: 'refreshSource',
          args: { sourceId: String(sourceId) },
          targeting: action.targeting,
          actionNode: action,
          signal
        };
        break;
      }
      case 'submit':
      case 'submitForm': {
        if (!ctx.form) {
          return finishAction(
            { ...actionPayload, dispatchMode: 'built-in' },
            startedAt,
            { ok: false, error: new Error('submit requires form runtime') }
          );
        }
        invocation = {
          action: 'submitForm',
          args: undefined,
          targeting: action.targeting,
          actionNode: action,
          signal
        };
        break;
      }
      case 'navigate': {
        const args = evaluateActionArgs(action, ctx, evaluator) ?? {};
        invocation = {
          action: 'navigate',
          args: {
            url: typeof args.url === 'string' ? args.url : undefined,
            back: Boolean(args.back),
            replace: Boolean(args.replace)
          },
          targeting: action.targeting,
          actionNode: action,
          signal
        };
        break;
      }
      default:
        return undefined;
    }

    const result = await adapter.invokeBuiltInAction(invocation!, ctx);
    return finishAction({ ...actionPayload, dispatchMode: 'built-in' }, startedAt, result);
  }

  async function runComponentAction(
    action: CompiledActionNode,
    ctx: ActionContext,
    startedAt: number,
    actionPayload: ActionMonitorPayload
  ): Promise<ActionResult | undefined> {
    if (!isComponentAction(action.action)) {
      return undefined;
    }

    const method = extractComponentMethod(action.action);
    if (!method) {
      return finishAction({ ...actionPayload, dispatchMode: 'component' }, startedAt, {
        ok: false,
        error: new Error('component:<method> requires a method name after the colon')
      });
    }

    const target = {
      _targetCid: typeof action.targeting._targetCid === 'number' ? action.targeting._targetCid : undefined,
      componentId: action.targeting.componentId,
      componentName: action.targeting.componentName
    };

    if (!target.componentId && !target.componentName && target._targetCid === undefined) {
      return finishAction({ ...actionPayload, dispatchMode: 'component', method }, startedAt, {
        ok: false,
        error: new Error('component:<method> requires _targetCid, componentId or componentName')
      });
    }

    const payload = evaluateActionArgs(action, ctx, evaluator);
    const invocation: ComponentActionInvocation = {
      method,
      target,
      payload
    };
    const result = await adapter.invokeComponentAction(invocation, ctx);
    return finishAction(
      { ...actionPayload, dispatchMode: 'component', method },
      startedAt,
      result
    );
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

    const parsed = parseNamespacedAction(action.action);
    if (!parsed) {
      return finishAction({ ...actionPayload, dispatchMode: 'namespace' }, startedAt, {
        ok: false,
        error: new Error(`Invalid namespaced action: ${action.action}`)
      });
    }

    const payload = evaluateActionArgs(action, ctx, evaluator);
    const resolved = ctx.actionScope?.resolve(action.action);
    const sourceScopeId = resolved?.sourceScopeId;
    const providerKind = resolved?.provider.kind ?? 'host';
    const invocation: NamespacedActionInvocation = {
      actionName: action.action,
      namespace: parsed.namespace,
      method: parsed.method,
      payload
    };
    const result = normalizeActionResult(await adapter.invokeNamespacedAction(invocation, ctx));
    return finishAction(
      { ...actionPayload, dispatchMode: 'namespace', namespace: parsed.namespace, method: parsed.method },
      startedAt,
      {
        ...result,
        sourceScopeId,
        providerKind
      }
    );
  }

  async function runSingleAction(action: CompiledActionNode, ctx: ActionContext, signal?: AbortSignal): Promise<ActionResult> {
    const effectiveSignal = signal ?? ctx.signal;
    const activeCtx = effectiveSignal && ctx.signal !== effectiveSignal ? { ...ctx, signal: effectiveSignal } : ctx;
    const startedAt = Date.now();
    const actionPayload = buildActionMonitorPayload(action, activeCtx);
    getEnv().monitor?.onActionStart?.(actionPayload);

    try {
      const processedAction = (plugins?.length ?? 0) > 0
        ? normalizeCompiledActionProgram(
            await (plugins ?? []).reduce<Promise<ActionSchema>>(
              async (currentPromise, plugin) => {
                const current = await currentPromise;
                return plugin.beforeAction ? plugin.beforeAction(current, activeCtx) : current;
              },
              Promise.resolve(action.source)
            )
          ).nodes[0]!
        : action;

      if (!shouldRunActionWhen(processedAction, activeCtx, evaluator)) {
        return finishAction(actionPayload, startedAt, {
          ok: true,
          skipped: true
        });
      }

      const parallelResult = await runParallelActions(processedAction, activeCtx, startedAt, actionPayload);
      if (parallelResult) {
        return parallelResult;
      }

      const builtInResult = await runBuiltInAction(processedAction, activeCtx, startedAt, actionPayload, effectiveSignal);
      if (builtInResult) {
        return builtInResult;
      }

      const componentResult = await runComponentAction(processedAction, activeCtx, startedAt, actionPayload);
      if (componentResult) {
        return componentResult;
      }

      const namespacedResult = await runNamespacedAction(processedAction, activeCtx, startedAt, actionPayload);
      if (namespacedResult) {
        return namespacedResult;
      }

      return finishAction(actionPayload, startedAt, {
        ok: false,
        error: new Error(`Unsupported action: ${processedAction.action}`)
      });
    } catch (error) {
      if (isAbortError(error)) {
        const result = createCancelledResult(error);
        getEnv().monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
        return result;
      }

      onActionError?.(error, activeCtx);

      for (const plugin of plugins ?? []) {
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
      getEnv().monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
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
      getEnv().monitor?.onActionEnd?.({
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
          onActionError?.(error, actionContext);

          for (const plugin of plugins ?? []) {
            plugin.onError?.(error, {
              phase: 'action',
              error,
              nodeId: ctx.nodeInstance?.templateNode.id,
              path: ctx.nodeInstance?.templateNode.templatePath
            });
          }

          const message = error instanceof Error ? error.message : String(error);
          getEnv().notify('error', message);
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
