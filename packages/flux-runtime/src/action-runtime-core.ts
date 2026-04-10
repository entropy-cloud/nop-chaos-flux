import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  ActionSchema,
  ApiSchema,
  CompiledRuntimeValue,
  ComponentHandle,
  ComponentTarget,
  OperationControlConfig,
  RendererEnv,
  RendererPlugin,
  RendererRuntime,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn, parsePath } from '@nop-chaos/flux-core';

export interface ActionDispatcherInput {
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

export type InternalComponentActionTarget = ComponentTarget & {
  readonly __kind?: 'internal-component-target';
};

export function getInternalComponentActionTarget(action: ActionSchema): InternalComponentActionTarget | undefined {
  const candidate = (action as ActionSchema & { __componentTarget?: InternalComponentActionTarget }).__componentTarget;

  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }

  return candidate;
}

export function getActionRuntimeId(ctx: ActionContext): string {
  return ctx.runtime.runtimeId;
}

let nextInteractionId = 1;

export function createInteractionId() {
  return `interaction-${nextInteractionId++}`;
}

export function createCancelledResult(error?: unknown): ActionResult {
  return {
    ok: false,
    cancelled: true,
    error
  };
}

export function createTimedOutResult(error?: unknown): ActionResult {
  return {
    ok: false,
    cancelled: true,
    timedOut: true,
    error
  };
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { name?: string; code?: string };
  return candidate.name === 'AbortError' || candidate.code === 'ABORT_ERR';
}

export function createActionKey(action: ActionSchema, ctx: ActionContext): string {
  const owner = ctx.nodeInstance?.templateNode.id ?? ctx.form?.id ?? ctx.scope.id;
  const target = action.targetId ?? action.componentPath ?? action.componentId ?? action.formId ?? action.dialogId ?? action.api?.url ?? '';
  return `${owner}:${action.action}:${target}`;
}

export function buildActionMonitorPayload(action: ActionSchema, ctx: ActionContext): ActionMonitorPayload {
  return {
    actionType: action.action,
    instancePath: ctx.instancePath,
    nodeId: ctx.nodeInstance?.templateNode.id,
    path: ctx.nodeInstance?.templateNode.templatePath,
    interactionId: ctx.interactionId
  };
}

export type ActionResultClass = 'success' | 'failure' | 'neutral';

export function classifyActionResult(result: ActionResult): ActionResultClass {
  if (result.skipped) {
    return 'neutral';
  }

  if (!result.ok || result.cancelled || result.timedOut) {
    return 'failure';
  }

  return 'success';
}

export function isFailureClass(result: ActionResult): boolean {
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

export function withEvaluationBindings(scope: ScopeRef, bindings: Record<string, unknown> | undefined): ScopeRef {
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

export function getEvaluationScope(ctx: ActionContext): ScopeRef {
  return withEvaluationBindings(ctx.scope, ctx.evaluationBindings);
}

export function evaluateInActionContext<T = unknown>(
  target: unknown,
  ctx: ActionContext,
  input: ActionDispatcherInput
): T {
  return input.evaluate<T>(target, getEvaluationScope(ctx));
}

export function evaluateCompiledInActionContext<T = unknown>(
  compiled: CompiledRuntimeValue<T>,
  ctx: ActionContext,
  input: ActionDispatcherInput
): T {
  return input.evaluateCompiled<T>(compiled, getEvaluationScope(ctx));
}

export function createBranchEvaluationBindings(result: ActionResult, previousResult: ActionResult | undefined): Record<string, unknown> {
  return {
    result,
    error: isFailureClass(result) ? result.error : undefined,
    prevResult: previousResult
  };
}

export function mergeEvaluationBindings(
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

export function getCompiledValue<T = unknown>(
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

export function evaluateActionArgs(action: ActionSchema, ctx: ActionContext, input: ActionDispatcherInput) {
  const payload = action.args ?? getTopLevelActionPayload(action);

  if (!payload) {
    return undefined;
  }

  const compiled = getCompiledValue(payload, input.compileValue);
  return evaluateCompiledInActionContext<Record<string, unknown>>(compiled, ctx, input);
}

export function normalizeActionResult(result: ActionResult | unknown): ActionResult {
  if (result && typeof result === 'object' && 'ok' in (result as Record<string, unknown>)) {
    return result as ActionResult;
  }

  return {
    ok: true,
    data: result
  };
}

export function canInvokeHandleMethod(handle: ComponentHandle, method: string): boolean {
  if (handle.capabilities.hasMethod) {
    return handle.capabilities.hasMethod(method);
  }

  const methods = handle.capabilities.listMethods?.();
  return methods ? methods.includes(method) : true;
}

export function finishAction(
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

export function shouldRunActionWhen(action: ActionSchema, ctx: ActionContext, input: ActionDispatcherInput): boolean {
  if (!action.when) {
    return true;
  }

  return Boolean(evaluateInActionContext<boolean>(action.when, ctx, input));
}

export function resolveActionControl(action: ActionSchema): OperationControlConfig | undefined {
  const control = action.control;

  if (!control || typeof control !== 'object' || Array.isArray(control)) {
    return undefined;
  }

  return control as OperationControlConfig;
}

export function getNumericControl(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function getRetryControl(value: unknown): OperationControlConfig['retry'] | undefined {
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
