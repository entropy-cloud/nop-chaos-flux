import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  ActionSchema,
  CompiledRuntimeValue,
  ApiObject,
  ComponentHandle,
  RendererEnv,
  RendererPlugin,
  ScopeRef
} from '@nop-chaos/flux-core';
import { isNamespacedAction } from './action-scope';
import { cancelPendingDebounce, scheduleDebounce } from './utils/debounce';

interface ActionDispatcherInput {
  getEnv: () => RendererEnv;
  plugins?: RendererPlugin[];
  onActionError?: (error: unknown, ctx: ActionContext) => void;
  evaluate: <T = unknown>(target: unknown, scope: ScopeRef) => T;
  compileValue: <T = unknown>(target: T) => CompiledRuntimeValue<T>;
  evaluateCompiled: <T = unknown>(compiled: CompiledRuntimeValue<T>, scope: ScopeRef) => T;
  executeAjaxAction: (api: ApiObject, action: ActionSchema, ctx: ActionContext) => Promise<ActionResult>;
  submitFormAction: (api: ApiObject | undefined, action: ActionSchema, ctx: ActionContext) => Promise<ActionResult>;
  createDialogScope: (ctx: ActionContext) => ScopeRef;
  getDialogActionScope?: (ctx: ActionContext) => ActionContext['actionScope'];
  getDialogComponentRegistry?: (ctx: ActionContext) => ActionContext['componentRegistry'];
  runtime: { compile(schema: any): any };
}

let nextInteractionId = 1;

function createInteractionId() {
  return `interaction-${nextInteractionId++}`;
}

function createCancelledResult(error?: unknown): ActionResult {
  return {
    ok: false,
    cancelled: true,
    error
  };
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { name?: string; code?: string };
  return candidate.name === 'AbortError' || candidate.code === 'ABORT_ERR';
}

function createActionKey(action: ActionSchema, ctx: ActionContext): string {
  const owner = ctx.node?.id ?? ctx.form?.id ?? ctx.scope.id;
  const target = action.componentPath ?? action.componentId ?? action.formId ?? action.dialogId ?? action.api?.url ?? '';
  return `${owner}:${action.action}:${target}`;
}

function buildActionMonitorPayload(action: ActionSchema, ctx: ActionContext) {
  return {
    actionType: action.action,
    nodeId: ctx.node?.id,
    path: ctx.node?.path,
    interactionId: ctx.interactionId
  };
}

const ACTION_PAYLOAD_RESERVED_KEYS = new Set([
  'action',
  'componentId',
  'componentName',
  'componentPath',
  'formId',
  'dialogId',
  'api',
  'dialog',
  'dataPath',
  'value',
  'values',
  'debounce',
  'continueOnError',
  'then',
  'args'
]);

function extractTopLevelActionPayload(action: ActionSchema): Record<string, unknown> | undefined {
  const payloadEntries = Object.entries(action).filter(([key]) => !ACTION_PAYLOAD_RESERVED_KEYS.has(key));

  if (payloadEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(payloadEntries);
}

const topLevelPayloadCache = new WeakMap<ActionSchema, Record<string, unknown> | null>();

function getTopLevelActionPayload(action: ActionSchema): Record<string, unknown> | undefined {
  const cached = topLevelPayloadCache.get(action);

  if (cached !== undefined) {
    return cached ?? undefined;
  }

  const payload = extractTopLevelActionPayload(action);
  topLevelPayloadCache.set(action, payload ?? null);
  return payload;
}

const compiledValueCache = new WeakMap<object, CompiledRuntimeValue<unknown>>();

function getCompiledValue<T = unknown>(
  value: T,
  compileValue: <R = unknown>(target: R) => CompiledRuntimeValue<R>
): CompiledRuntimeValue<T> {
  if (!value || typeof value !== 'object') {
    return compileValue(value);
  }

  const cached = compiledValueCache.get(value as object);

  if (cached) {
    return cached as CompiledRuntimeValue<T>;
  }

  const compiled = compileValue(value);
  compiledValueCache.set(value as object, compiled as CompiledRuntimeValue<unknown>);
  return compiled;
}

function evaluateActionArgs(action: ActionSchema, ctx: ActionContext, input: ActionDispatcherInput) {
  const payload = action.args ?? getTopLevelActionPayload(action);

  if (!payload) {
    return undefined;
  }

  const compiled = getCompiledValue(payload, input.compileValue);
  return input.evaluateCompiled<Record<string, unknown>>(compiled, ctx.scope);
}

function normalizeActionResult(result: ActionResult | unknown): ActionResult {
  if (result && typeof result === 'object' && 'ok' in (result as Record<string, unknown>)) {
    return result as ActionResult;
  }

  return {
    ok: true,
    data: result
  };
}

function canInvokeHandleMethod(handle: ComponentHandle, method: string): boolean {
  if (handle.capabilities.hasMethod) {
    return handle.capabilities.hasMethod(method);
  }

  const methods = handle.capabilities.listMethods?.();
  return methods ? methods.includes(method) : true;
}

function finishAction(
  input: ActionDispatcherInput,
  actionPayload: ActionMonitorPayload,
  startedAt: number,
  result: ActionResult
): ActionResult {
  input.getEnv().monitor?.onActionEnd?.({
    ...actionPayload,
    durationMs: Date.now() - startedAt,
    result
  });
  return result;
}

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
    actionPayload: ActionMonitorPayload
  ): Promise<ActionResult | undefined> {
    switch (action.action) {
      case 'setValue': {
        const targetPath = action.componentPath ?? action.componentId ?? '';
        const evaluated = action.value === undefined ? undefined : input.evaluate(action.value, ctx.scope);

        if (ctx.form && action.formId && ctx.form.id === action.formId) {
          ctx.form.setValue(targetPath, evaluated);
        } else {
          ctx.scope.update(targetPath, evaluated);
        }

        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true, data: evaluated });
      }
      case 'setValues': {
        const evaluatedValues = action.values
          ? input.evaluate<Record<string, unknown>>(action.values, ctx.scope)
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
          ? input.evaluateCompiled<ApiObject>(getCompiledValue(action.api, input.compileValue), ctx.scope)
          : undefined;

        if (!api) {
          return finishAction(
            input,
            { ...actionPayload, dispatchMode: 'built-in' },
            startedAt,
            { ok: false, error: new Error('Missing api in ajax action') }
          );
        }

        const result = await input.executeAjaxAction(api, action, ctx);
        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, result);
      }
      case 'dialog': {
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
          componentRegistry: input.getDialogComponentRegistry?.(ctx) ?? ctx.componentRegistry
        });
        dialogScope.update('dialogId', dialogId);
        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true, data: { dialogId } });
      }
      case 'closeDialog': {
        if (ctx.page) {
          if (action.dialogId) {
            ctx.page.closeDialog(String(input.evaluate(action.dialogId, ctx.scope)));
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
          ? input.evaluateCompiled<ApiObject>(getCompiledValue(action.api, input.compileValue), ctx.scope)
          : undefined;

        if (api) {
          input.getEnv().monitor?.onApiRequest?.({
            api,
            nodeId: ctx.node?.id,
            path: ctx.node?.path
          });
        }

        const result = await input.submitFormAction(api, action, ctx);
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

    const target = {
      _targetCid: typeof action._targetCid === 'number' ? action._targetCid : undefined,
      _targetTemplateId: typeof action._targetTemplateId === 'string' ? action._targetTemplateId : undefined,
      componentInstanceKey: ctx.getInstanceKey?.(),
      componentId: action.componentId,
      componentName: action.componentName
    };

    if (!target.componentId && !target.componentName && target._targetCid === undefined && !target._targetTemplateId) {
      return finishAction(input, { ...actionPayload, dispatchMode: 'component', method }, startedAt, {
        ok: false,
        error: new Error('component:<method> requires _targetCid, _targetTemplateId, componentId or componentName')
      });
    }

    const handle = ctx.componentRegistry?.resolve(target);

    if (!handle) {
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
        { ok: false, error: new Error('Component handle not found') }
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

  async function runSingleAction(action: ActionSchema, ctx: ActionContext): Promise<ActionResult> {
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

      const builtInResult = await runBuiltInAction(processedAction, ctx, startedAt, actionPayload);

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
          nodeId: ctx.node?.id,
          path: ctx.node?.path
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
    if (!action.debounce || action.debounce <= 0) {
      return runSingleAction(action, ctx);
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
      action.debounce,
      () => runSingleAction(action, ctx)
    );
  }

  async function dispatch(action: ActionSchema | ActionSchema[], ctx: ActionContext): Promise<ActionResult> {
    const actions = Array.isArray(action) ? action : [action];
    let previous: ActionResult = { ok: true };

    for (const current of actions) {
      const actionContext = {
        ...ctx,
        interactionId: ctx.interactionId ?? createInteractionId(),
        prevResult: previous
      };
      const result = await runActionWithDebounce(current, actionContext);

      previous = result;

      if (!result.ok && !current.continueOnError) {
        return result;
      }

      if (current.then) {
        previous = await dispatch(current.then, {
          ...ctx,
          interactionId: actionContext.interactionId,
          prevResult: result
        });
      }
    }

    return previous;
  }

  return { dispatch };
}
