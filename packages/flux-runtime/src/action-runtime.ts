import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  ActionSchema,
  ComponentTarget,
  OperationControlConfig,
  CompiledRuntimeValue,
  ApiSchema,
  ComponentHandle,
  RendererEnv,
  RendererPlugin,
  RendererRuntime,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn, parsePath } from '@nop-chaos/flux-core';
import { isNamespacedAction } from './action-scope';
import { withRetry, withTimeout } from './operation-control';
import { cancelPendingDebounce, scheduleDebounce } from './utils/debounce';

interface ActionDispatcherInput {
  getEnv: () => RendererEnv;
  plugins?: RendererPlugin[];
  onActionError?: (error: unknown, ctx: ActionContext) => void;
  evaluate: <T = unknown>(target: unknown, scope: ScopeRef) => T;
  compileValue: <T = unknown>(target: T) => CompiledRuntimeValue<T>;
  evaluateCompiled: <T = unknown>(compiled: CompiledRuntimeValue<T>, scope: ScopeRef) => T;
  refreshDataSource: (input: { id: string; scope?: ScopeRef }) => Promise<boolean>;
  executeAjaxAction: (api: ApiSchema, action: ActionSchema, ctx: ActionContext, signal?: AbortSignal) => Promise<ActionResult>;
  submitFormAction: (api: ApiSchema | undefined, action: ActionSchema, ctx: ActionContext, signal?: AbortSignal) => Promise<ActionResult>;
  createDialogScope: (ctx: ActionContext) => ScopeRef;
  getDialogActionScope?: (ctx: ActionContext) => ActionContext['actionScope'];
  getDialogComponentRegistry?: (ctx: ActionContext) => ActionContext['componentRegistry'];
  openDrawer?: (drawer: Record<string, any>, ctx: ActionContext) => ActionResult | Promise<ActionResult>;
  showToast?: (args: Record<string, unknown> | undefined, ctx: ActionContext) => ActionResult | Promise<ActionResult>;
  runtime: RendererRuntime;
}

type InternalComponentActionTarget = ComponentTarget & {
  readonly __kind?: 'internal-component-target';
};

function getInternalComponentActionTarget(action: ActionSchema): InternalComponentActionTarget | undefined {
  const candidate = (action as ActionSchema & { __componentTarget?: InternalComponentActionTarget }).__componentTarget;

  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }

  return candidate;
}

function getActionRuntimeId(ctx: ActionContext): string {
  return ctx.locator?.runtimeId ?? ctx.runtime.runtimeId;
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

function createTimedOutResult(error?: unknown): ActionResult {
  return {
    ok: false,
    cancelled: true,
    timedOut: true,
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
  const target = action.targetId ?? action.componentPath ?? action.componentId ?? action.formId ?? action.dialogId ?? action.api?.url ?? '';
  return `${owner}:${action.action}:${target}`;
}

function buildActionMonitorPayload(action: ActionSchema, ctx: ActionContext) {
  return {
    actionType: action.action,
    locator: ctx.locator,
    nodeId: ctx.node?.id,
    path: ctx.node?.path,
    interactionId: ctx.interactionId
  };
}

type ActionResultClass = 'success' | 'failure' | 'neutral';

function classifyActionResult(result: ActionResult): ActionResultClass {
  if (result.skipped) {
    return 'neutral';
  }

  if (!result.ok || result.cancelled || result.timedOut) {
    return 'failure';
  }

  return 'success';
}

function isFailureClass(result: ActionResult): boolean {
  return classifyActionResult(result) === 'failure';
}

function getBindingValue(bindings: Record<string, unknown>, path: string): unknown {
  const segments = parsePath(path);

  if (segments.length === 0) {
    return undefined;
  }

  const [head, ...rest] = segments;

  if (!Object.prototype.hasOwnProperty.call(bindings, head)) {
    return undefined;
  }

  const rootValue = bindings[head];
  return rest.length === 0 ? rootValue : getIn(rootValue, rest.join('.'));
}

function hasBindingRoot(bindings: Record<string, unknown>, path: string): boolean {
  const segments = parsePath(path);

  return segments.length > 0 && Object.prototype.hasOwnProperty.call(bindings, segments[0]);
}

function hasBindingValue(bindings: Record<string, unknown>, path: string): boolean {
  const segments = parsePath(path);

  if (segments.length === 0) {
    return false;
  }

  const [head, ...rest] = segments;

  if (!Object.prototype.hasOwnProperty.call(bindings, head)) {
    return false;
  }

  if (rest.length === 0) {
    return true;
  }

  let current: unknown = bindings[head];

  for (const segment of rest) {
    if (current == null || typeof current !== 'object' || !(segment in current)) {
      return false;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return true;
}

function withEvaluationBindings(scope: ScopeRef, bindings: Record<string, unknown> | undefined): ScopeRef {
  if (!bindings || Object.keys(bindings).length === 0) {
    return scope;
  }

  let materialized: Record<string, unknown> | undefined;

  return {
    id: scope.id,
    path: scope.path,
    parent: scope.parent,
    store: scope.store,
    get value() {
      return this.read();
    },
    get(path) {
      if (hasBindingRoot(bindings, path)) {
        return getBindingValue(bindings, path);
      }

      return scope.get(path);
    },
    has(path) {
      return hasBindingRoot(bindings, path)
        ? hasBindingValue(bindings, path)
        : scope.has(path);
    },
    readOwn() {
      return scope.readOwn();
    },
    read() {
      if (!materialized) {
        materialized = {
          ...scope.read(),
          ...bindings
        };
      }

      return materialized;
    },
    update(path, value) {
      scope.update(path, value);
    },
    merge(data) {
      scope.merge(data);
    }
  };
}

function getEvaluationScope(ctx: ActionContext): ScopeRef {
  return withEvaluationBindings(ctx.scope, ctx.evaluationBindings);
}

function evaluateInActionContext<T = unknown>(
  target: unknown,
  ctx: ActionContext,
  input: ActionDispatcherInput
): T {
  return input.evaluate<T>(target, getEvaluationScope(ctx));
}

function evaluateCompiledInActionContext<T = unknown>(
  compiled: CompiledRuntimeValue<T>,
  ctx: ActionContext,
  input: ActionDispatcherInput
): T {
  return input.evaluateCompiled<T>(compiled, getEvaluationScope(ctx));
}

function createBranchEvaluationBindings(result: ActionResult, previousResult: ActionResult | undefined): Record<string, unknown> {
  return {
    result,
    error: isFailureClass(result) ? result.error : undefined,
    prevResult: previousResult
  };
}

function mergeEvaluationBindings(
  base: Record<string, unknown> | undefined,
  next: Record<string, unknown>
): Record<string, unknown> {
  return base ? { ...base, ...next } : next;
}

const ACTION_PAYLOAD_RESERVED_KEYS = new Set([
  'action',
  'targetId',
  'componentId',
  'componentName',
  'componentPath',
  'formId',
  'dialogId',
  'api',
  'dialog',
  'drawer',
  'dataPath',
  'value',
  'values',
  'when',
  'parallel',
  'control',
  'timeout',
  'retry',
  'debounce',
  'continueOnError',
  'then',
  'onError',
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
  return evaluateCompiledInActionContext<Record<string, unknown>>(compiled, ctx, input);
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

function shouldRunActionWhen(action: ActionSchema, ctx: ActionContext, input: ActionDispatcherInput): boolean {
  if (!action.when) {
    return true;
  }

  return Boolean(evaluateInActionContext<boolean>(action.when, ctx, input));
}

function resolveActionControl(action: ActionSchema): OperationControlConfig | undefined {
  const control = action.control;

  if (!control || typeof control !== 'object' || Array.isArray(control)) {
    return undefined;
  }

  return control as OperationControlConfig;
}

function getNumericControl(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getRetryControl(value: unknown): OperationControlConfig['retry'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as { times?: unknown; delay?: unknown };
  const times = getNumericControl(candidate.times);

  if (times === undefined) {
    return undefined;
  }

  return {
    times,
    delay: getNumericControl(candidate.delay)
  };
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
          ownerNode: ctx.node,
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
            nodeId: ctx.node?.id,
            path: ctx.node?.path
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
      _targetTemplateId: typeof action._targetTemplateId === 'string' ? action._targetTemplateId : undefined,
      componentInstanceKey: ctx.getInstanceKey?.(),
      componentId: action.componentId,
      componentName: action.componentName
    };

    if (
      !target.locator &&
      !target.staticPlan &&
      !target.repeatedPlan &&
      !target.repeatedSelector &&
      !target.componentId &&
      !target.componentName &&
      target._targetCid === undefined &&
      !target._targetTemplateId
    ) {
      return finishAction(input, { ...actionPayload, dispatchMode: 'component', method }, startedAt, {
        ok: false,
        error: new Error('component:<method> requires an internal target, _targetCid, _targetTemplateId, componentId or componentName')
      });
    }

    const resolution = input.runtime.resolveTarget(target, {
      runtimeId: getActionRuntimeId(ctx),
      instancePath: ctx.locator?.instancePath,
      componentRegistry: ctx.componentRegistry
    });

    if (resolution.kind === 'ambiguous') {
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
        { ok: false, error: new Error(`Ambiguous component target${target.componentName ? `: ${target.componentName}` : ''}`) }
      );
    }

    if (resolution.kind !== 'resolved' || !resolution.handle) {
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

    const handle = resolution.handle;

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
