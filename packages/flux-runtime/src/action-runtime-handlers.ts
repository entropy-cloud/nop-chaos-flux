import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  ActionSchema,
  ApiSchema,
} from '@nop-chaos/flux-core';
import {
  evaluateCompiledInActionContext,
  evaluateInActionContext,
  evaluateActionArgs,
  finishAction,
  getCompiledValue,
  normalizeActionResult,
  canInvokeHandleMethod,
  getInternalComponentActionTarget,
  type ActionDispatcherInput
} from './action-runtime-core';

export async function runBuiltInAction(
  input: ActionDispatcherInput,
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

export function isComponentAction(actionName: string): boolean {
  return actionName.startsWith(COMPONENT_ACTION_PREFIX);
}

function extractComponentMethod(actionName: string): string {
  return actionName.slice(COMPONENT_ACTION_PREFIX.length);
}

export async function runComponentAction(
  input: ActionDispatcherInput,
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
