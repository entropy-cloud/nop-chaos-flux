import type {
  ActionContext,
  ActionResult,
  ComponentActionInvocation,
  CompiledActionNode,
  NamespacedActionInvocation,
} from '@nop-chaos/flux-core';
import { evaluateActionArgs, normalizeActionResult } from '../action-core.js';
import type { ActionDispatcherContext } from './types.js';
import {
  isComponentAction,
  extractComponentMethod,
  isNamespacedAction,
  parseNamespacedAction,
} from './action-parsing.js';
import { XUI_ACTIONS_NAMESPACE } from '@nop-chaos/flux-core';

function attachResultMetadata(
  result: ActionResult,
  metadata: Partial<Pick<ActionResult, 'namespace' | 'sourceScopeId' | 'providerKind' | 'componentId' | 'componentName' | 'componentType'>>,
): ActionResult {
  return {
    ...result,
    ...metadata,
  };
}

function attachThrownMetadata(
  error: unknown,
  metadata: Partial<Pick<ActionResult, 'namespace' | 'sourceScopeId' | 'providerKind' | 'componentId' | 'componentName' | 'componentType'>>,
): unknown {
  if (error instanceof Error) {
    const wrapped = new Error(error.message, { cause: error });
    return Object.assign(wrapped, metadata);
  }
  if (error && typeof error === 'object') {
    return { ...(error as object), ...metadata };
  }
  return {
    error,
    ...metadata,
  };
}

export async function runComponentAction(
  action: CompiledActionNode,
  ctx: ActionContext,
  internals: ActionDispatcherContext,
): Promise<ActionResult | undefined> {
  if (!isComponentAction(action.action)) {
    return undefined;
  }

  const method = extractComponentMethod(action.action);
  if (!method) {
    return {
      ok: false,
      error: new Error('component:<method> requires a method name after the colon'),
    };
  }

  const target = {
    _targetCid:
      typeof action.targeting._targetCid === 'number' ? action.targeting._targetCid : undefined,
    componentId: action.targeting.componentId,
  };

  if (!target.componentId && target._targetCid === undefined) {
    return {
      ok: false,
      error: new Error('component:<method> requires _targetCid or componentId'),
    };
  }

  const payload = evaluateActionArgs(action, ctx, internals.evaluator);
  const invocation: ComponentActionInvocation = {
    method,
    target,
    payload,
  };
  let result: ActionResult;

  try {
    result = attachResultMetadata(
      normalizeActionResult(await internals.adapter.invokeComponentAction(invocation, ctx)),
      {
        componentId: target.componentId,
      },
    );
  } catch (error) {
    throw attachThrownMetadata(error, {
      componentId: target.componentId,
    });
  }

  return result;
}

export async function runNamespacedAction(
  action: CompiledActionNode,
  ctx: ActionContext,
  internals: ActionDispatcherContext,
): Promise<ActionResult | undefined> {
  if (!isNamespacedAction(action.action)) {
    return undefined;
  }

  const parsed = parseNamespacedAction(action.action);
  if (!parsed) {
    return {
      ok: false,
      error: new Error(`Invalid namespaced action: ${action.action}`),
    };
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
  let result: ActionResult;

  try {
    result = attachResultMetadata(
      normalizeActionResult(await internals.adapter.invokeNamespacedAction(invocation, ctx)),
      {
        namespace: parsed.namespace,
        sourceScopeId,
        providerKind,
      },
    );
  } catch (error) {
    throw attachThrownMetadata(error, {
      namespace: parsed.namespace,
      sourceScopeId,
      providerKind,
    });
  }

  return result;
}

export async function runNamedAction(
  action: CompiledActionNode,
  ctx: ActionContext,
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
  let result: ActionResult;

  try {
    result = attachResultMetadata(
      normalizeActionResult(await internals.adapter.invokeNamespacedAction(invocation, ctx)),
      {
        namespace: XUI_ACTIONS_NAMESPACE,
        sourceScopeId,
        providerKind,
      },
    );
  } catch (error) {
    throw attachThrownMetadata(error, {
      namespace: XUI_ACTIONS_NAMESPACE,
      sourceScopeId,
      providerKind,
    });
  }

  return result;
}
