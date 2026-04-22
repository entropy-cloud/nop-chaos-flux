import type {
  ActionContext,
  ActionResult,
  ActionRuntimeAdapter,
  ApiSchema,
  ExpressionCompiler,
  RendererEnv,
  RendererRuntime,
  ScopeRef
} from '@nop-chaos/flux-core';
import { resolveRequestControl } from '@nop-chaos/flux-action-core';
import { isAbortError } from './error-utils';
import { applyResponseDataPath, executeApiSchema } from './async-data/request-runtime';
import type { ApiRequestExecutor } from './async-data/request-runtime';

export interface ActionAdapterInput {
  getEnv: () => RendererEnv;
  expressionCompiler: ExpressionCompiler;
  evaluate: <T = unknown>(target: unknown, scope: ScopeRef) => T;
  executeApiRequest: ApiRequestExecutor;
  runtime: RendererRuntime;
  createDialogScope: (ctx: ActionContext) => ScopeRef;
  getDialogActionScope?: (ctx: ActionContext) => ActionContext['actionScope'];
  getDialogComponentRegistry?: (ctx: ActionContext) => ActionContext['componentRegistry'];
}

export function createActionRuntimeAdapter(input: ActionAdapterInput): ActionRuntimeAdapter {
  const { getEnv, expressionCompiler, evaluate, executeApiRequest, runtime } = input;

  return {
    async setValue(path, value, ctx, targeting) {
      if (ctx.form && targeting.formId && ctx.form.id === targeting.formId) {
        ctx.form.setValue(path, value);
      } else {
        ctx.scope.update(path, value);
      }
      return { ok: true, data: value };
    },

    async setValues(values, ctx, targeting) {
      if (Object.keys(values).length === 0) {
        return { ok: true, data: values };
      }

      const basePath = targeting.targetId;

      if (ctx.form && targeting.formId && ctx.form.id === targeting.formId) {
        if (basePath) {
          const nextValues = Object.fromEntries(
            Object.entries(values).map(([key, val]) => [`${basePath}.${key}`, val])
          );
          ctx.form.setValues(nextValues);
          return { ok: true, data: nextValues };
        }

        ctx.form.setValues(values);
      } else {
        for (const [targetPath, val] of Object.entries(values)) {
          ctx.scope.update(basePath ? `${basePath}.${targetPath}` : targetPath, val);
        }
      }

      if (basePath) {
        return {
          ok: true,
          data: Object.fromEntries(
            Object.entries(values).map(([key, val]) => [`${basePath}.${key}`, val])
          )
        };
      }

      return { ok: true, data: values };
    },

    async executeAjax(api, action, ctx, signal) {
      const apiSchema = api as ApiSchema;
      let monitoredApi: import('@nop-chaos/flux-core').ExecutableApiRequest | undefined;
      const requestControl = resolveRequestControl(action);

      try {
        const response = await executeApiSchema(apiSchema, ctx.scope, getEnv(), expressionCompiler, {
          signal,
          evaluate,
          onPreparedRequest: (preparedApi) => {
            monitoredApi = preparedApi;
          },
          executor: (adaptedApi) => executeApiRequest('ajax', adaptedApi, ctx.scope, ctx.form, {
            signal,
            interactionId: ctx.interactionId,
            control: requestControl
          }),
          control: requestControl
        });

        if (monitoredApi) {
          getEnv().monitor?.onApiRequest?.({
            api: monitoredApi,
            nodeId: ctx.nodeInstance?.templateNode.id,
            path: ctx.nodeInstance?.templateNode.templatePath,
            interactionId: ctx.interactionId
          });
        }

        const dataPath = action.targeting?.dataPath;
        if (dataPath && ctx.page) {
          const nextData = applyResponseDataPath(ctx.page.store.getState().data, dataPath, response.data);
          ctx.page.store.setData(nextData);
        }

        return {
          ok: true,
          data: response.data,
          attempts: response.attempts,
          failureCount: response.failureCount,
          error: undefined
        };
      } catch (error) {
        if (isAbortError(error)) {
          return { ok: false, cancelled: true, error };
        }
        throw error;
      }
    },

    async submitForm(api, action, ctx, signal) {
      if (!ctx.form) {
        return { ok: false, error: new Error('submitForm requires form runtime') };
      }

      const apiSchema = api as ApiSchema | undefined;
      if (apiSchema) {
        getEnv().monitor?.onApiRequest?.({
          api: {
            url: apiSchema.url,
            method: apiSchema.method,
            data: apiSchema.data,
            headers: apiSchema.headers
          },
          nodeId: ctx.nodeInstance?.templateNode.id,
          path: ctx.nodeInstance?.templateNode.templatePath
        });
      }

      return ctx.form.submit(apiSchema, {
        interactionId: ctx.interactionId,
        signal,
        control: resolveRequestControl(action)
      });
    },

    async openDialog(dialog, ctx) {
      if (!ctx.surfaceRuntime) {
        return { ok: false, error: new Error('openDialog requires surface runtime') };
      }

      const dialogScope = input.createDialogScope(ctx);
      const dialogId = ctx.surfaceRuntime.open({
        kind: 'dialog',
        surface: dialog,
        scope: dialogScope,
        runtime,
        options: {
          actionScope: input.getDialogActionScope?.(ctx) ?? ctx.actionScope,
          componentRegistry: input.getDialogComponentRegistry?.(ctx) ?? ctx.componentRegistry,
          ownerNodeInstance: ctx.nodeInstance
        }
      });
      dialogScope.update('dialogId', dialogId);
      return { ok: true, data: { dialogId } };
    },

    async closeDialog(dialogId, ctx) {
      if (ctx.surfaceRuntime) {
        if (dialogId) {
          ctx.surfaceRuntime.close(dialogId);
        } else {
          ctx.surfaceRuntime.close(ctx.dialogId);
        }
      }
      return { ok: true };
    },

    async openDrawer(drawer, ctx) {
      if (!ctx.surfaceRuntime) {
        return { ok: false, error: new Error('openDrawer requires surface runtime') };
      }

      const drawerScope = runtime.createChildScope(ctx.scope, {
        dialogId: `${ctx.nodeInstance?.templateNode.id ?? ctx.scope.id}-pending`,
        drawerId: `${ctx.nodeInstance?.templateNode.id ?? ctx.scope.id}-pending`
      }, {
        scopeKey: `${ctx.nodeInstance?.templateNode.id ?? ctx.scope.id}:drawer-scope`,
        pathSuffix: 'drawer'
      });

      const drawerId = ctx.surfaceRuntime.open({
        kind: 'drawer',
        surface: drawer,
        scope: drawerScope,
        runtime,
        options: {
          actionScope: ctx.actionScope,
          componentRegistry: ctx.componentRegistry,
          ownerNodeInstance: ctx.nodeInstance
        }
      });

      drawerScope.update('dialogId', drawerId);
      drawerScope.update('drawerId', drawerId);
      return { ok: true, data: { drawerId } };
    },

    async closeDrawer(drawerId, ctx) {
      if (ctx.surfaceRuntime) {
        if (drawerId) {
          ctx.surfaceRuntime.close(drawerId);
        } else {
          ctx.surfaceRuntime.close(ctx.dialogId);
        }
      }
      return { ok: true };
    },

    async showToast(args, ctx) {
      const level = typeof args?.level === 'string' && ['info', 'success', 'warning', 'error'].includes(args.level)
        ? args.level as 'info' | 'success' | 'warning' | 'error'
        : 'info';
      const message = typeof args?.message === 'string' ? args.message : 'Action completed';
      ctx.runtime.env.notify(level, message);
      return { ok: true, data: args };
    },

    async navigate(args, _ctx) {
      const env = getEnv();
      if (!env.navigate) {
        return { ok: false, error: new Error('navigate action requires env.navigate to be configured') };
      }

      if (args.back) {
        env.navigate(-1);
      } else if (args.url != null) {
        env.navigate(args.url, args.replace ? { replace: true } : undefined);
      } else {
        return { ok: false, error: new Error('navigate action requires args.url or args.back') };
      }

      return { ok: true };
    },

    async refreshTable(ctx) {
      ctx.page?.refresh();
      return {
        ok: true,
        data: ctx.page?.store.getState().refreshTick
      };
    },

    async refreshSource(sourceId, ctx) {
      const refreshed = await runtime.refreshDataSource({
        id: sourceId,
        scope: ctx.scope
      });

      return {
        ok: refreshed,
        data: refreshed,
        error: refreshed ? undefined : new Error(`Source not found: ${sourceId}`)
      };
    },

    async invokeComponentMethod(method, target, payload, ctx) {
      if (!ctx.componentRegistry) {
        return { ok: false, error: new Error('Component registry not available') };
      }

      let handle: import('@nop-chaos/flux-core').ComponentHandle | undefined;
      let resolveError: Error | undefined;

      try {
        handle = ctx.componentRegistry.resolve(target);
      } catch (e) {
        resolveError = e instanceof Error ? e : new Error('Component handle resolution failed');
      }

      if (resolveError || !handle) {
        return {
          ok: false,
          error: resolveError ?? new Error('Component handle not found'),
          componentId: target.componentId,
          componentName: target.componentName
        };
      }

      if (handle.capabilities.hasMethod && !handle.capabilities.hasMethod(method)) {
        const methods = handle.capabilities.listMethods?.();
        if (methods && !methods.includes(method)) {
          return {
            ok: false,
            error: new Error(`Unsupported component method: ${method}`),
            componentId: handle.id,
            componentName: handle.name,
            componentType: handle.type
          };
        }
      }

      const result = await handle.capabilities.invoke(method, payload, ctx);
      const baseResult = result && typeof result === 'object' && 'ok' in (result as object)
        ? result as ActionResult
        : { ok: true, data: result };
      return {
        ...baseResult,
        componentId: handle.id,
        componentName: handle.name,
        componentType: handle.type
      };
    },

    invokeNamespacedAction(namespace, method, payload, ctx) {
      if (!ctx.actionScope) {
        return Promise.resolve({ ok: false, error: new Error('Action scope not available') });
      }

      const actionName = `${namespace}:${method}`;
      const resolved = ctx.actionScope.resolve(actionName);

      if (!resolved) {
        return Promise.resolve({ ok: false, error: new Error(`Unsupported action: ${actionName}`) });
      }

      return resolved.provider.invoke(resolved.method, payload, ctx) as Promise<ActionResult>;
    }
  };
}
