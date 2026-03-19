import type {
  ActionContext,
  ActionResult,
  ActionSchema,
  ApiObject,
  RendererEnv,
  RendererPlugin,
  ScopeRef
} from '@nop-chaos/amis-schema';

interface ActionDispatcherInput {
  env: RendererEnv;
  plugins?: RendererPlugin[];
  onActionError?: (error: unknown, ctx: ActionContext) => void;
  evaluate: <T = unknown>(target: unknown, scope: ScopeRef) => T;
  executeAjaxAction: (api: ApiObject, action: ActionSchema, ctx: ActionContext) => Promise<ActionResult>;
  submitFormAction: (api: ApiObject | undefined, action: ActionSchema, ctx: ActionContext) => Promise<ActionResult>;
  createDialogScope: (ctx: ActionContext) => ScopeRef;
  runtime: { compile(schema: any): any };
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
    path: ctx.node?.path
  };
}

export function createActionDispatcher(input: ActionDispatcherInput) {
  const pendingDebounces = new Map<string, { timer: ReturnType<typeof setTimeout>; resolve: (result: ActionResult) => void }>();

  async function runSingleAction(action: ActionSchema, ctx: ActionContext): Promise<ActionResult> {
    const startedAt = Date.now();
    const actionPayload = buildActionMonitorPayload(action, ctx);
    input.env.monitor?.onActionStart?.(actionPayload);

    try {
      const processedAction = await (input.plugins ?? []).reduce<Promise<ActionSchema>>(
        async (currentPromise, plugin) => {
          const current = await currentPromise;
          return plugin.beforeAction ? plugin.beforeAction(current, ctx) : current;
        },
        Promise.resolve(action)
      );

      switch (processedAction.action) {
        case 'setValue': {
          const targetPath = processedAction.componentPath ?? processedAction.componentId ?? '';
          const evaluated = processedAction.value === undefined ? undefined : input.evaluate(processedAction.value, ctx.scope);

          if (ctx.form && processedAction.formId && ctx.form.id === processedAction.formId) {
            ctx.form.setValue(targetPath, evaluated);
          } else {
            ctx.scope.update(targetPath, evaluated);
          }

          const result = { ok: true, data: evaluated };
          input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
          return result;
        }
        case 'ajax': {
          if (!processedAction.api) {
            const result = { ok: false, error: new Error('Missing api in ajax action') };
            input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
            return result;
          }

          const api = input.evaluate<ApiObject>(processedAction.api, ctx.scope);
          input.env.monitor?.onApiRequest?.({
            api,
            nodeId: ctx.node?.id,
            path: ctx.node?.path
          });

          const result = await input.executeAjaxAction(api, processedAction, ctx);
          input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
          return result;
        }
        case 'dialog': {
          if (!ctx.page || !processedAction.dialog) {
            const result = { ok: false, error: new Error('Dialog action requires page runtime and dialog config') };
            input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
            return result;
          }

          const dialogScope = input.createDialogScope(ctx);
          const dialogId = ctx.page.openDialog(processedAction.dialog, dialogScope, input.runtime as any);
          dialogScope.update('dialogId', dialogId);
          const result = { ok: true, data: { dialogId } };
          input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
          return result;
        }
        case 'closeDialog': {
          if (ctx.page) {
            if (processedAction.dialogId) {
              ctx.page.closeDialog(String(input.evaluate(processedAction.dialogId, ctx.scope)));
            } else {
              ctx.page.closeDialog(ctx.dialogId);
            }
          }

          const result = { ok: true };
          input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
          return result;
        }
        case 'refreshTable': {
          ctx.page?.refresh();
          const result = { ok: true, data: ctx.page?.store.getState().refreshTick };
          input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
          return result;
        }
        case 'submitForm': {
          if (!ctx.form) {
            const result = { ok: false, error: new Error('submitForm requires form runtime') };
            input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
            return result;
          }

          const api = processedAction.api ? input.evaluate<ApiObject>(processedAction.api, ctx.scope) : undefined;

          if (api) {
            input.env.monitor?.onApiRequest?.({
              api,
              nodeId: ctx.node?.id,
              path: ctx.node?.path
            });
          }

          const result = await input.submitFormAction(api, processedAction, ctx);
          input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
          return result;
        }
        default: {
          const result = { ok: false, error: new Error(`Unsupported action: ${processedAction.action}`) };
          input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
          return result;
        }
      }
    } catch (error) {
      if (isAbortError(error)) {
        const result = createCancelledResult(error);
        input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
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
      input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
      return result;
    }
  }

  function runActionWithDebounce(action: ActionSchema, ctx: ActionContext): Promise<ActionResult> {
    if (!action.debounce || action.debounce <= 0) {
      return runSingleAction(action, ctx);
    }

    const key = createActionKey(action, ctx);
    const previous = pendingDebounces.get(key);

    if (previous) {
      clearTimeout(previous.timer);
      const cancelledResult = createCancelledResult();
      input.env.monitor?.onActionEnd?.({
        ...buildActionMonitorPayload(action, ctx),
        durationMs: 0,
        result: cancelledResult
      });
      previous.resolve(cancelledResult);
      pendingDebounces.delete(key);
    }

    return new Promise<ActionResult>((resolve) => {
      const timer = setTimeout(async () => {
        pendingDebounces.delete(key);
        resolve(await runSingleAction(action, ctx));
      }, action.debounce);

      pendingDebounces.set(key, { timer, resolve });
    });
  }

  async function dispatch(action: ActionSchema | ActionSchema[], ctx: ActionContext): Promise<ActionResult> {
    const actions = Array.isArray(action) ? action : [action];
    let previous: ActionResult = { ok: true };

    for (const current of actions) {
      const actionContext = {
        ...ctx,
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
          prevResult: result
        });
      }
    }

    return previous;
  }

  return { dispatch };
}
