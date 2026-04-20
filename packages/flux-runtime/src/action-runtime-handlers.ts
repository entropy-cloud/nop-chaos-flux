import type {
  ActionContext,
  ActionMonitorPayload,
  ActionResult,
  CompiledActionNode,
} from '@nop-chaos/flux-core';
import {
  evaluateActionArgs,
  evaluateActionApi,
  evaluateActionDialog,
  evaluateActionDrawer,
  evaluateActionValue,
  evaluateActionValues,
  finishAction,
  normalizeActionResult,
  canInvokeHandleMethod,
  getInternalComponentActionTarget,
  type ActionDispatcherInput
} from './action-runtime-core';

export async function runBuiltInAction(
  input: ActionDispatcherInput,
  action: CompiledActionNode,
  ctx: ActionContext,
  startedAt: number,
  actionPayload: ActionMonitorPayload,
  signal?: AbortSignal
): Promise<ActionResult | undefined> {
  switch (action.action) {
    case 'setValue': {
      const targetPath = action.targeting.componentPath ?? action.targeting.componentId ?? '';
      const evaluated = evaluateActionValue(action, ctx, input);

      if (ctx.form && action.targeting.formId && ctx.form.id === action.targeting.formId) {
        ctx.form.setValue(targetPath, evaluated);
      } else {
        ctx.scope.update(targetPath, evaluated);
      }

      return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true, data: evaluated });
    }
    case 'setValues': {
      const evaluatedValues = evaluateActionValues(action, ctx, input);

      if (Object.keys(evaluatedValues).length === 0) {
        return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true, data: evaluatedValues });
      }

      if (ctx.form && action.targeting.formId && ctx.form.id === action.targeting.formId) {
        ctx.form.setValues(evaluatedValues);
      } else {
        for (const [targetPath, evaluated] of Object.entries(evaluatedValues)) {
          ctx.scope.update(targetPath, evaluated);
        }
      }

      return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true, data: evaluatedValues });
    }
    case 'ajax': {
      const api = evaluateActionApi(action, ctx, input);

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
      const dialog = evaluateActionDialog(action, ctx, input);

      if (!ctx.surfaceRuntime || !dialog) {
        return finishAction(
          input,
          { ...actionPayload, dispatchMode: 'built-in' },
          startedAt,
          { ok: false, error: new Error('Dialog action requires surface runtime and dialog config') }
        );
      }

      const dialogScope = input.createDialogScope(ctx);
      const dialogId = ctx.surfaceRuntime.open({
        kind: 'dialog',
        surface: dialog,
        scope: dialogScope,
          runtime: input.runtime,
        options: {
          actionScope: input.getDialogActionScope?.(ctx) ?? ctx.actionScope,
          componentRegistry: input.getDialogComponentRegistry?.(ctx) ?? ctx.componentRegistry,
          ownerNodeInstance: ctx.nodeInstance
        }
      });
      dialogScope.update('dialogId', dialogId);
      return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true, data: { dialogId } });
    }
    case 'drawer':
    case 'openDrawer': {
      const drawer = evaluateActionDrawer(action, ctx, input);

      if (!drawer) {
        return finishAction(
          input,
          { ...actionPayload, dispatchMode: 'built-in' },
          startedAt,
          { ok: false, error: new Error('openDrawer requires drawer config') }
        );
      }

      const result = await input.openDrawer?.(drawer, ctx);
      return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, result ?? { ok: true, data: drawer });
    }
    case 'closeDrawer': {
      if (ctx.surfaceRuntime) {
        if (action.targeting.dialogId) {
          ctx.surfaceRuntime.close(String(action.targeting.dialogId));
        } else {
          ctx.surfaceRuntime.close(ctx.dialogId);
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
      if (ctx.surfaceRuntime) {
        if (action.targeting.dialogId) {
          ctx.surfaceRuntime.close(String(action.targeting.dialogId));
        } else {
          ctx.surfaceRuntime.close(ctx.dialogId);
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
      const sourceId = action.targeting.targetId ?? action.targeting.componentId ?? action.targeting.componentPath;

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

      const api = evaluateActionApi(action, ctx, input);

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
    case 'navigate': {
      const env = input.getEnv();
      if (!env.navigate) {
        return finishAction(
          input,
          { ...actionPayload, dispatchMode: 'built-in' },
          startedAt,
          { ok: false, error: new Error('navigate action requires env.navigate to be configured') }
        );
      }

      const args = evaluateActionArgs(action, ctx, input) ?? {};
      if (args.back) {
        env.navigate(-1);
      } else if (args.url != null) {
        env.navigate(String(args.url), args.replace ? { replace: true } : undefined);
      } else {
        return finishAction(
          input,
          { ...actionPayload, dispatchMode: 'built-in' },
          startedAt,
          { ok: false, error: new Error('navigate action requires args.url or args.back') }
        );
      }

      return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true });
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
  action: CompiledActionNode,
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
    _targetCid: typeof action.targeting._targetCid === 'number' ? action.targeting._targetCid : undefined,
    componentId: action.targeting.componentId,
    componentName: action.targeting.componentName
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
