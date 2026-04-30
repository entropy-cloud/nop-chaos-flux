import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  ComponentActionInvocation,
  CompiledActionNode,
  NamespacedActionInvocation,
} from '@nop-chaos/flux-core';
import { evaluateActionArgs, normalizeActionResult } from '../action-core';
import type { ActionDispatcherContext } from './types';
import {
  isComponentAction,
  extractComponentMethod,
  isNamespacedAction,
  parseNamespacedAction,
} from './action-parsing';

const XUI_ACTIONS_NAMESPACE = '__xui_actions__';

export function finishAction(
  ctx: ActionDispatcherContext,
  actionPayload: ActionMonitorPayload,
  startedAt: number,
  result: ActionResult,
): ActionResult {
  const enrichedPayload: ActionMonitorPayload = {
    ...actionPayload,
    ...(result.componentId !== undefined && { componentId: result.componentId }),
    ...(result.componentName !== undefined && { componentName: result.componentName }),
    ...(result.componentType !== undefined && { componentType: result.componentType }),
    ...(result.namespace !== undefined && { namespace: result.namespace }),
    ...(result.sourceScopeId !== undefined && { sourceScopeId: result.sourceScopeId }),
    ...(result.providerKind !== undefined && { providerKind: result.providerKind }),
  };
  ctx.getEnv().monitor?.onActionEnd?.({
    ...enrichedPayload,
    durationMs: Date.now() - startedAt,
    result,
  });
  return result;
}

export async function runComponentAction(
  action: CompiledActionNode,
  ctx: ActionContext,
  startedAt: number,
  actionPayload: ActionMonitorPayload,
  internals: ActionDispatcherContext,
): Promise<ActionResult | undefined> {
  if (!isComponentAction(action.action)) {
    return undefined;
  }

  const method = extractComponentMethod(action.action);
  if (!method) {
    return finishAction(internals, { ...actionPayload, dispatchMode: 'component' }, startedAt, {
      ok: false,
      error: new Error('component:<method> requires a method name after the colon'),
    });
  }

  const target = {
    _targetCid:
      typeof action.targeting._targetCid === 'number' ? action.targeting._targetCid : undefined,
    componentId: action.targeting.componentId,
    componentName: action.targeting.componentName,
  };

  if (!target.componentId && !target.componentName && target._targetCid === undefined) {
    return finishAction(
      internals,
      { ...actionPayload, dispatchMode: 'component', method },
      startedAt,
      {
        ok: false,
        error: new Error('component:<method> requires _targetCid, componentId or componentName'),
      },
    );
  }

  const payload = evaluateActionArgs(action, ctx, internals.evaluator);
  const invocation: ComponentActionInvocation = {
    method,
    target,
    payload,
  };
  const result = await internals.adapter.invokeComponentAction(invocation, ctx);
  return finishAction(
    internals,
    { ...actionPayload, dispatchMode: 'component', method },
    startedAt,
    result,
  );
}

export async function runNamespacedAction(
  action: CompiledActionNode,
  ctx: ActionContext,
  startedAt: number,
  actionPayload: ActionMonitorPayload,
  internals: ActionDispatcherContext,
): Promise<ActionResult | undefined> {
  if (!isNamespacedAction(action.action)) {
    return undefined;
  }

  const parsed = parseNamespacedAction(action.action);
  if (!parsed) {
    return finishAction(internals, { ...actionPayload, dispatchMode: 'namespace' }, startedAt, {
      ok: false,
      error: new Error(`Invalid namespaced action: ${action.action}`),
    });
  }

  const payload = evaluateActionArgs(action, ctx, internals.evaluator);
  const resolved = ctx.actionScope?.resolve(action.action);
  const sourceScopeId = resolved?.sourceScopeId;
  const providerKind = resolved?.provider.kind ?? 'host';
  const invocation: NamespacedActionInvocation = {
    actionName: action.action,
    namespace: parsed.namespace,
    method: parsed.method,
    payload,
  };
  const result = normalizeActionResult(
    await internals.adapter.invokeNamespacedAction(invocation, ctx),
  );
  return finishAction(
    internals,
    {
      ...actionPayload,
      dispatchMode: 'namespace',
      namespace: parsed.namespace,
      method: parsed.method,
    },
    startedAt,
    {
      ...result,
      sourceScopeId,
      providerKind,
    },
  );
}

export async function runNamedAction(
  action: CompiledActionNode,
  ctx: ActionContext,
  startedAt: number,
  actionPayload: ActionMonitorPayload,
  internals: ActionDispatcherContext,
): Promise<ActionResult | undefined> {
  if (action.action.indexOf(':') >= 0) {
    return undefined;
  }

  const namespacedName = `${XUI_ACTIONS_NAMESPACE}:${action.action}`;
  const resolved = ctx.actionScope?.resolve(namespacedName);
  if (!resolved) {
    return undefined;
  }

  const payload = evaluateActionArgs(action, ctx, internals.evaluator);
  const sourceScopeId = resolved.sourceScopeId;
  const providerKind = resolved.provider.kind ?? 'import';
  const invocation: NamespacedActionInvocation = {
    actionName: namespacedName,
    namespace: XUI_ACTIONS_NAMESPACE,
    method: action.action,
    payload,
  };
  const result = normalizeActionResult(
    await internals.adapter.invokeNamespacedAction(invocation, ctx),
  );
  return finishAction(
    internals,
    {
      ...actionPayload,
      dispatchMode: 'namespace',
      namespace: XUI_ACTIONS_NAMESPACE,
      method: action.action,
    },
    startedAt,
    {
      ...result,
      sourceScopeId,
      providerKind,
    },
  );
}
