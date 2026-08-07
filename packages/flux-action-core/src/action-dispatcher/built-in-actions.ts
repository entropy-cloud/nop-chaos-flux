import type {
  ActionContext,
  ActionResult,
  BuiltInActionInvocation,
  CompiledActionNode,
} from '@nop-chaos/flux-core';
import { getBuiltInActionDefinition, isSchema, isSchemaArray } from '@nop-chaos/flux-core';
import {
  evaluateActionArgs,
  normalizeActionResult,
  resolveSetValuePayload,
  resolveSetValuesPayload,
  type ActionEvaluator,
} from '../action-core.js';
import type { ActionDispatcherContext } from './types.js';

/**
 * Raw-preserved args keys per built-in action definition (action-class fields
 * such as onClose/onSubmitSuccess/onSubmitError, plus schema-carrying keys).
 */
function collectRawPreservedArgKeys(action: CompiledActionNode): Set<string> {
  const definition = getBuiltInActionDefinition(action.action);
  if (!definition) {
    return new Set();
  }

  const keys = new Set<string>();
  for (const [key, spec] of Object.entries(definition.fieldRules)) {
    const kind = typeof spec === 'string' ? spec : spec.kind;
    if (kind === 'action' || kind === 'event') {
      keys.add(key);
    }
  }
  return keys;
}

function evaluateSurfaceArgs(
  action: CompiledActionNode,
  ctx: ActionContext,
  evaluator: ActionEvaluator,
): Record<string, unknown> | undefined {
  const rawArgs = action.source.args;

  if (!rawArgs || typeof rawArgs !== 'object' || Array.isArray(rawArgs)) {
    return evaluateActionArgs(action, ctx, evaluator);
  }

  const evaluated = evaluateActionArgs(action, ctx, evaluator) ?? {};
  const result: Record<string, unknown> = { ...evaluated };
  const rawPreservedKeys = collectRawPreservedArgKeys(action);

  for (const [key, value] of Object.entries(rawArgs)) {
    if (isSchema(value) || isSchemaArray(value as unknown[]) || rawPreservedKeys.has(key)) {
      result[key] = value;
    }
  }

  return result;
}

export async function runBuiltInAction(
  action: CompiledActionNode,
  ctx: ActionContext,
  signal: AbortSignal | undefined,
  internals: ActionDispatcherContext,
): Promise<ActionResult | undefined> {
  let invocation: BuiltInActionInvocation | undefined;

  switch (action.action) {
    case 'setValue': {
      const payload = resolveSetValuePayload(action, ctx, internals.evaluator);
      invocation = {
        action: 'setValue',
        args: {
          path: payload.path ?? '',
          value: payload.value,
        },
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'setValues': {
      const payload = resolveSetValuesPayload(action, ctx, internals.evaluator);
      invocation = {
        action: 'setValues',
        args: {
          path: payload.path,
          values: payload.values,
        },
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'ajax': {
      const api = evaluateActionArgs(action, ctx, internals.evaluator);
      if (!api) {
        return {
          ok: false,
          error: new Error('ajax requires args payload'),
        };
      }
      invocation = {
        action: 'ajax',
        args: api,
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'openDialog': {
      const dialog = evaluateSurfaceArgs(action, ctx, internals.evaluator);
      if (!dialog) {
        return {
          ok: false,
          error: new Error('openDialog requires args payload'),
        };
      }
      invocation = {
        action: 'openDialog',
        args: dialog,
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'openDrawer': {
      const drawer = evaluateSurfaceArgs(action, ctx, internals.evaluator);
      if (!drawer) {
        return {
          ok: false,
          error: new Error('openDrawer requires args payload'),
        };
      }
      invocation = {
        action: 'openDrawer',
        args: drawer,
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'closeDrawer': {
      invocation = {
        action: 'closeSurface',
        args: action.targeting.surfaceId
          ? { surfaceId: String(action.targeting.surfaceId) }
          : action.targeting.dialogId
            ? { surfaceId: String(action.targeting.dialogId) }
            : undefined,
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'showToast': {
      const payload = evaluateActionArgs(action, ctx, internals.evaluator);
      invocation = {
        action: 'showToast',
        args: payload,
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'confirm': {
      const payload = evaluateActionArgs(action, ctx, internals.evaluator);
      const message =
        payload && typeof payload === 'object' && 'message' in payload
          ? (payload as { message?: unknown }).message
          : undefined;
      const title =
        payload && typeof payload === 'object' && 'title' in payload
          ? (payload as { title?: unknown }).title
          : undefined;
      invocation = {
        action: 'confirm',
        args: {
          message: typeof message === 'string' ? message : undefined,
          title: typeof title === 'string' ? title : undefined,
        },
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'alert': {
      const payload = evaluateActionArgs(action, ctx, internals.evaluator);
      const message =
        payload && typeof payload === 'object' && 'message' in payload
          ? (payload as { message?: unknown }).message
          : undefined;
      const title =
        payload && typeof payload === 'object' && 'title' in payload
          ? (payload as { title?: unknown }).title
          : undefined;
      invocation = {
        action: 'alert',
        args: {
          message: typeof message === 'string' ? message : undefined,
          title: typeof title === 'string' ? title : undefined,
        },
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'closeDialog': {
      invocation = {
        action: 'closeSurface',
        args: action.targeting.surfaceId
          ? { surfaceId: String(action.targeting.surfaceId) }
          : action.targeting.dialogId
            ? { surfaceId: String(action.targeting.dialogId) }
            : undefined,
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'closeSurface': {
      invocation = {
        action: 'closeSurface',
        args: action.targeting.surfaceId
          ? { surfaceId: String(action.targeting.surfaceId) }
          : action.targeting.dialogId
            ? { surfaceId: String(action.targeting.dialogId) }
            : undefined,
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'refreshTable': {
      invocation = {
        action: 'refreshTable',
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'refreshSource': {
      const targetId = action.targeting.targetId;
      if (!targetId) {
        return {
          ok: false,
          error: new Error('refreshSource requires targetId'),
        };
      }
      invocation = {
        action: 'refreshSource',
        args: { targetId: String(targetId) },
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'refreshNearest': {
      invocation = {
        action: 'refreshNearest',
        args: evaluateActionArgs(action, ctx, internals.evaluator),
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'submit':
    case 'submitForm': {
      // Always create the invocation. When ctx.form is null (e.g. dialog footer
      // button outside FormContext), the adapter resolves the form through:
      //   1. surface form with submitScope='surface'
      //   2. componentId targeting from the component registry
      invocation = {
        action: 'submitForm',
        args: undefined,
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'navigate': {
      const args = evaluateActionArgs(action, ctx, internals.evaluator) ?? {};
      invocation = {
        action: 'navigate',
        args: {
          url: typeof args.url === 'string' ? args.url : undefined,
          back: Boolean(args.back),
          replace: Boolean(args.replace),
        },
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    default:
      return undefined;
  }

  if (!invocation) {
    return undefined;
  }

  const result = normalizeActionResult(await internals.adapter.invokeBuiltInAction(invocation, ctx));
  return result;
}
