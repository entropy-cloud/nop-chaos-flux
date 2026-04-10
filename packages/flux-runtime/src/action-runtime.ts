import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  ActionSchema,
  ApiSchema,
} from '@nop-chaos/flux-core';
import { isNamespacedAction } from './action-scope';
import { withRetry, withTimeout } from './operation-control';
import { cancelPendingDebounce, scheduleDebounce } from './utils/debounce';
import {
  buildActionMonitorPayload,
  canInvokeHandleMethod,
  classifyActionResult,
  createActionKey,
  createBranchEvaluationBindings,
  createCancelledResult,
  createInteractionId,
  createTimedOutResult,
  evaluateActionArgs,
  evaluateCompiledInActionContext,
  evaluateInActionContext,
  finishAction,
  getCompiledValue,
  getInternalComponentActionTarget,
  getNumericControl,
  getRetryControl,
  isAbortError,
  mergeEvaluationBindings,
  normalizeActionResult,
  resolveActionControl,
  shouldRunActionWhen,
  type ActionDispatcherInput
} from './action-runtime-core';

export function createActionDispatcher(input: ActionDispatcherInput) {
  const pendingDebounces = new Map<string, {
    timer: ReturnType<typeof setTimeout>;
    resolve: (result: ActionResult) => void;
    reject: (error: unknown) => void;
  }>();

  async function runBuiltInAction(
    action: ActionSchema,
    ctx: ActionContext,
    startedAt: number,
    actionPayload: ActionMonitorPayload,
    signal?: AbortSignal
  ): Promise<ActionResult | undefined> {
    switch (action.action) {
      case 'setValue': {
        const targetPath = action.componentPath ?? action.componentId ?? '';
        const evaluated = action.value === undefined ? undefined : evaluateInActionContext(action.value, ctx, input);

        if (ctx.form && action.formId && ctx.form.id === action.formId) {
          ctx.form.setValue(targetPath, evaluated);
        } else {
          ctx.scope.update(targetPath, evaluated);
        }

        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true, data: evaluated });
      }
      case 'setValues': {
        const evaluatedValues = action.values
          ? evaluateInActionContext<Record<string, unknown>>(action.values, ctx, input)
          : {};

        if (Object.keys(evaluatedValues).length === 0) {
          return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true, data: evaluatedValues });
        }

        if (ctx.form && action.formId && ctx.form.id === action.formId) {
          ctx.form.setValues(evaluatedValues);
        } else {
          for (const [targetPath, evaluated] of Object.entries(evaluatedValues)) {
            ctx.scope.update(targetPath, evaluated);
          }
        }

        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true, data: evaluatedValues });
      }
      case 'ajax': {
        if (!action.api) {
          return finishAction(
            input,
            { ...actionPayload, dispatchMode: 'built-in' },
            startedAt,
            { ok: false, error: new Error('Missing api in ajax action') }
          );
        }

        const api = action.api
          ? evaluateCompiledInActionContext<ApiSchema>(getCompiledValue(action.api, input.compileValue), ctx, input)
          : undefined;

        if (!api) {
          return finishAction(
            input,
            { ...actionPayload, dispatchMode: 'built-in' },
            startedAt,
            { ok: false, error: new Error('Missing api in ajax action') }
          );
        }

        const result = await input.executeAjaxAction(api, action, ctx, signal);
        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, result);
      }
      case 'dialog':
      case 'openDialog': {
        if (!ctx.page || !action.dialog) {
          return finishAction(
            input,
            { ...actionPayload, dispatchMode: 'built-in' },
            startedAt,
            { ok: false, error: new Error('Dialog action requires page runtime and dialog config') }
          );
        }

        const dialogScope = input.createDialogScope(ctx);
        const dialogId = ctx.page.openDialog(action.dialog, dialogScope, input.runtime as any, {
          actionScope: input.getDialogActionScope?.(ctx) ?? ctx.actionScope,
          componentRegistry: input.getDialogComponentRegistry?.(ctx) ?? ctx.componentRegistry,
          ownerNodeInstance: ctx.nodeInstance
        });
        dialogScope.update('dialogId', dialogId);
        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true, data: { dialogId } });
      }
      case 'drawer':
      case 'openDrawer': {
        if (!action.drawer) {
          return finishAction(
            input,
            { ...actionPayload, dispatchMode: 'built-in' },
            startedAt,
            { ok: false, error: new Error('openDrawer requires drawer config') }
          );
        }

        const result = await input.openDrawer?.(action.drawer, ctx);
        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, result ?? { ok: true, data: action.drawer });
      }
      case 'closeDrawer': {
        if (ctx.page) {
          if (action.dialogId) {
            ctx.page.closeSurface(String(evaluateInActionContext(action.dialogId, ctx, input)));
          } else {
            ctx.page.closeSurface(ctx.dialogId);
          }
        }

        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true });
      }
      case 'showToast': {
        const payload = evaluateActionArgs(action, ctx, input);
        const result = await input.showToast?.(payload, ctx);
        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, result ?? { ok: true, data: payload });
      }
      case 'closeDialog': {
        if (ctx.page) {
          if (action.dialogId) {
            ctx.page.closeDialog(String(evaluateInActionContext(action.dialogId, ctx, input)));
          } else {
            ctx.page.closeDialog(ctx.dialogId);
          }
        }

        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true });
      }
      case 'refreshTable': {
        ctx.page?.refresh();
        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, {
          ok: true,
          data: ctx.page?.store.getState().refreshTick
        });
      }
      case 'refreshSource': {
        const sourceId = action.targetId ?? action.componentId ?? action.componentPath;

        if (!sourceId) {
          return finishAction(
            input,
            { ...actionPayload, dispatchMode: 'built-in' },
            startedAt,
            { ok: false, error: new Error('refreshSource requires targetId') }
          );
        }

        const refreshed = await input.refreshDataSource({
          id: String(sourceId),
          scope: ctx.scope
        });

        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, {
          ok: refreshed,
          data: refreshed,
          error: refreshed ? undefined : new Error(`Source not found: ${sourceId}`)
        });
      }
      case 'submitForm': {
        if (!ctx.form) {
          return finishAction(
            input,
            { ...actionPayload, dispatchMode: 'built-in' },
            startedAt,
            { ok: false, error: new Error('submitForm requires form runtime') }
          );
        }

        const api = action.api
          ? evaluateCompiledInActionContext<ApiSchema>(getCompiledValue(action.api, input.compileValue), ctx, input)
          : undefined;

        if (api) {
          input.getEnv().monitor?.onApiRequest?.({
            api: {
              url: api.url,
              method: api.method,
              data: api.data,
              headers: api.headers
            },
            nodeId: ctx.nodeInstance?.templateNode.id,
            path: ctx.nodeInstance?.templateNode.templatePath
          });
        }

        const result = await input.submitFormAction(api, action, ctx, signal);
        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, result);
      }
      default:
        return undefined;
    }
  }

  const COMPONENT_ACTION_PREFIX = 'component:';

  function isComponentAction(actionName: string): boolean {
    return actionName.startsWith(COMPONENT_ACTION_PREFIX);
  }

  function extractComponentMethod(actionName: string): string {
    return actionName.slice(COMPONENT_ACTION_PREFIX.length);
  }

  async function runComponentAction(
    action: ActionSchema,
    ctx: ActionContext,
    startedAt: number,
    actionPayload: ActionMonitorPayload
  ): Promise<ActionResult | undefined> {
    if (!isComponentAction(action.action)) {
      return undefined;
    }

    const method = extractComponentMethod(action.action);

    if (!method) {
      return finishAction(input, { ...actionPayload, dispatchMode: 'component' }, startedAt, {
        ok: false,
        error: new Error('component:<method> requires a method name after the colon')
      });
    }

    const target = getInternalComponentActionTarget(action) ?? {
      _targetCid: typeof action._targetCid === 'number' ? action._targetCid : undefined,
      componentId: action.componentId,
      componentName: action.componentName
    };

    if (
      !target.componentId &&
      !target.componentName &&
      target._targetCid === undefined
    ) {
      return finishAction(input, { ...actionPayload, dispatchMode: 'component', method }, startedAt, {
        ok: false,
        error: new Error('component:<method> requires _targetCid, componentId or componentName')
      });
    }

    let handle: import('@nop-chaos/flux-core').ComponentHandle | undefined;
    let resolveError: Error | undefined;
    try {
      handle = ctx.componentRegistry?.resolve(target);
    } catch (e) {
      resolveError = e instanceof Error ? e : new Error('Component handle resolution failed');
    }

    if (resolveError || !handle) {
      return finishAction(
        input,
        {
          ...actionPayload,
          dispatchMode: 'component',
          method,
          componentId: target.componentId,
          componentName: target.componentName
        },
        startedAt,
        { ok: false, error: resolveError ?? new Error('Component handle not found') }
      );
    }

    if (!canInvokeHandleMethod(handle, method)) {
      return finishAction(
        input,
        {
          ...actionPayload,
          dispatchMode: 'component',
          method,
          componentId: handle.id,
          componentName: handle.name,
          componentType: handle.type
        },
        startedAt,
        { ok: false, error: new Error(`Unsupported component method: ${method}`) }
      );
    }

    const payload = evaluateActionArgs(action, ctx, input);
    const result = normalizeActionResult(await handle.capabilities.invoke(method, payload, ctx));
    return finishAction(
      input,
      {
        ...actionPayload,
        dispatchMode: 'component',
        method,
        componentId: handle.id,
        componentName: handle.name,
        componentType: handle.type
      },
      startedAt,
      result
    );
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

      const builtInResult = await runBuiltInAction(processedAction, ctx, startedAt, actionPayload, signal);

      if (builtInResult) {
        return builtInResult;
      }

      const componentResult = await runComponentAction(processedAction, ctx, startedAt, actionPayload);

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
