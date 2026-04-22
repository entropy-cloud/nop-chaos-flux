import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  CompiledActionNode,
  CompiledRuntimeValue,
  OperationControlConfig,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn, parsePath } from '@nop-chaos/flux-core';

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

export function createActionKey(action: CompiledActionNode, ctx: ActionContext): string {
  const owner = ctx.nodeInstance?.templateNode.id ?? ctx.form?.id ?? ctx.scope.id;
  const args = action.source.args;
  const requestUrl = args && typeof args === 'object' && typeof (args as Record<string, unknown>).url === 'string'
    ? (args as Record<string, unknown>).url as string
    : '';
  const target = action.targeting.targetId
    ?? action.targeting.componentId
    ?? action.targeting.formId
    ?? action.targeting.dialogId
    ?? requestUrl
    ?? '';
  return `${owner}:${action.action}:${target}`;
}

export function buildActionMonitorPayload(action: CompiledActionNode, ctx: ActionContext): ActionMonitorPayload {
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

  let visibleView: Record<string, unknown> | undefined;
  let materialized: Record<string, unknown> | undefined;

  return {
    id: scope.id,
    path: scope.path,
    parent: scope.parent,
    store: scope.store,
    get value() {
      return this.readVisible();
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
    readVisible() {
      if (!visibleView) {
        visibleView = Object.assign(Object.create(scope.readVisible()) as Record<string, unknown>, bindings);
      }

      return visibleView as Record<string, any>;
    },
    materializeVisible() {
      if (!materialized) {
        materialized = { ...scope.materializeVisible(), ...bindings };
      }

      return materialized as Record<string, any>;
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

export function normalizeActionResult(result: ActionResult | unknown): ActionResult {
  if (result && typeof result === 'object' && 'ok' in (result as Record<string, unknown>)) {
    return result as ActionResult;
  }

  return {
    ok: true,
    data: result
  };
}

export function getNumericControl(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function getRetryControl(value: unknown): OperationControlConfig['retry'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as { times?: unknown; delay?: unknown; strategy?: unknown; maxDelay?: unknown };
  const times = getNumericControl(candidate.times);

  if (times === undefined) {
    return undefined;
  }

  const strategy = candidate.strategy === 'exponential' || candidate.strategy === 'fixed'
    ? candidate.strategy
    : undefined;

  return {
    times,
    delay: getNumericControl(candidate.delay),
    strategy,
    maxDelay: getNumericControl(candidate.maxDelay)
  };
}

export function resolveActionControl(action: CompiledActionNode): OperationControlConfig | undefined {
  const control = action.control?.control;

  if (!control || typeof control !== 'object' || Array.isArray(control)) {
    return undefined;
  }

  return control as OperationControlConfig;
}

export function resolveRequestControl(action: CompiledActionNode): OperationControlConfig | undefined {
  const base = resolveActionControl(action);
  const retry = getRetryControl(action.control?.retry);

  if (!base && !retry) {
    return undefined;
  }

  return {
    ...(base ?? {}),
    retry: retry ?? base?.retry
  };
}

export interface ActionEvaluator {
  evaluate: <T = unknown>(target: unknown, scope: ScopeRef) => T;
  compileValue: <T = unknown>(target: T) => CompiledRuntimeValue<T>;
  evaluateCompiled: <T = unknown>(compiled: CompiledRuntimeValue<T>, scope: ScopeRef) => T;
}

export function evaluateInActionContext<T = unknown>(
  target: unknown,
  ctx: ActionContext,
  evaluator: ActionEvaluator
): T {
  return evaluator.evaluate<T>(target, getEvaluationScope(ctx));
}

export function evaluateCompiledInActionContext<T = unknown>(
  compiled: CompiledRuntimeValue<T>,
  ctx: ActionContext,
  evaluator: ActionEvaluator
): T {
  return evaluator.evaluateCompiled<T>(compiled, getEvaluationScope(ctx));
}

export function evaluateActionArgs(action: CompiledActionNode, ctx: ActionContext, evaluator: ActionEvaluator) {
  if (!action.payload.args) {
    return undefined;
  }

  return evaluateCompiledInActionContext<Record<string, unknown>>(action.payload.args, ctx, evaluator);
}

export function resolveSetValuePayload(
  action: CompiledActionNode,
  ctx: ActionContext,
  evaluator: ActionEvaluator
): { path?: string; value: unknown } {
  const args = evaluateActionArgs(action, ctx, evaluator);
  if (!args || !Object.prototype.hasOwnProperty.call(args, 'value')) {
    throw new Error('setValue requires args.value');
  }

  return {
    path: typeof args.path === 'string' ? args.path : undefined,
    value: args.value
  };
}

export function resolveSetValuesPayload(
  action: CompiledActionNode,
  ctx: ActionContext,
  evaluator: ActionEvaluator
): { path?: string; values: Record<string, unknown> } {
  const args = evaluateActionArgs(action, ctx, evaluator);
  if (!args || !args.values || typeof args.values !== 'object' || Array.isArray(args.values)) {
    throw new Error('setValues requires args.values');
  }

  return {
    path: typeof args.path === 'string' ? args.path : undefined,
    values: args.values as Record<string, unknown>
  };
}

export function shouldRunActionWhen(action: CompiledActionNode, ctx: ActionContext, evaluator: ActionEvaluator): boolean {
  return action.when === undefined
    ? true
    : Boolean(evaluateCompiledInActionContext<boolean>(action.when, ctx, evaluator));
}

export function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === 'AbortError';
}
