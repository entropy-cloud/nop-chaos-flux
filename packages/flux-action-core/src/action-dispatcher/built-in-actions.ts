import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  BuiltInActionInvocation,
  CompiledActionNode,
} from '@nop-chaos/flux-core';
import { isSchema, isSchemaArray } from '@nop-chaos/flux-core';
import {
  evaluateActionArgs,
  resolveSetValuePayload,
  resolveSetValuesPayload,
  type ActionEvaluator,
} from '../action-core.js';
import type { ActionDispatcherContext } from './types.js';
import { finishAction } from './action-runners.js';

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

  for (const [key, value] of Object.entries(rawArgs)) {
    if (isSchema(value) || isSchemaArray(value as unknown[])) {
      result[key] = value;
    }
  }

  return result;
}

export async function runBuiltInAction(
  action: CompiledActionNode,
  ctx: ActionContext,
  startedAt: number,
  actionPayload: ActionMonitorPayload,
  signal: AbortSignal | undefined,
  internals: ActionDispatcherContext,
): Promise<ActionResult | undefined> {
  let invocation: BuiltInActionInvocation | undefined;

  switch (action.action) {
    case 'setValue': {
      const payload = resolveSetValuePayload(action, ctx, internals.evaluator);
      const targetPath = payload.path ?? action.targeting.componentId ?? '';
      invocation = {
        action: 'setValue',
        args: {
          path: targetPath,
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
        return finishAction(internals, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, {
          ok: false,
          error: new Error('ajax requires args payload'),
        });
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
        return finishAction(internals, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, {
          ok: false,
          error: new Error('openDialog requires args payload'),
        });
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
        return finishAction(internals, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, {
          ok: false,
          error: new Error('openDrawer requires args payload'),
        });
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
      const sourceId = action.targeting.targetId;
      if (!sourceId) {
        return finishAction(internals, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, {
          ok: false,
          error: new Error('refreshSource requires targetId'),
        });
      }
      invocation = {
        action: 'refreshSource',
        args: { sourceId: String(sourceId) },
        targeting: action.targeting,
        actionNode: action,
        signal,
      };
      break;
    }
    case 'submit':
    case 'submitForm': {
      if (!action.targeting.formId && !ctx.form) {
        return finishAction(internals, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, {
          ok: false,
          error: new Error('submit requires form runtime'),
        });
      }
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

  const result = await internals.adapter.invokeBuiltInAction(invocation!, ctx);
  return finishAction(internals, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, result);
}
