import type {
  ActionContext,
  BuiltInActionInvocation,
  ComponentActionInvocation,
  ActionResult,
  ActionRuntimeAdapter,
  ApiSchema,
  ExpressionCompiler,
  NamespacedActionInvocation,
  RendererEnv,
  RendererRuntime,
  ScopeRef
} from '@nop-chaos/flux-core';
import type { ApiRequestExecutor } from './async-data/request-runtime';
import { executeRuntimeAjaxAction } from './runtime-action-helpers';

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
    async invokeBuiltInAction(invocation: BuiltInActionInvocation, ctx) {
      switch (invocation.action) {
        case 'setValue': {
          const path = typeof invocation.args?.path === 'string' ? invocation.args.path : invocation.targeting.componentId ?? '';
          const value = invocation.args?.value;
          if (ctx.form && invocation.targeting.formId && ctx.form.id === invocation.targeting.formId) {
            ctx.form.setValue(path, value);
          } else {
            ctx.scope.update(path, value);
          }
          return { ok: true, data: value };
        }

        case 'setValues': {
          const values = (invocation.args?.values as Record<string, unknown> | undefined) ?? {};
          if (Object.keys(values).length === 0) {
            return { ok: true, data: values };
          }

          const basePath = typeof invocation.args?.path === 'string'
            ? invocation.args.path
            : invocation.targeting.targetId;

          if (ctx.form && invocation.targeting.formId && ctx.form.id === invocation.targeting.formId) {
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
        }

        case 'ajax': {
          const apiSchema = invocation.args as ApiSchema;
          return executeRuntimeAjaxAction(apiSchema, invocation.actionNode, ctx, invocation.signal, {
            getEnv,
            expressionCompiler,
            evaluate,
            executeApiRequest
          });
        }

        case 'submitForm': {
          if (!ctx.form) {
            return { ok: false, error: new Error('submitForm requires form runtime') };
          }

          return ctx.form.submit({
            interactionId: ctx.interactionId,
            signal: invocation.signal
          });
        }

        case 'openDialog': {
          if (!ctx.surfaceRuntime) {
            return { ok: false, error: new Error('openDialog requires surface runtime') };
          }

          const dialogScope = input.createDialogScope(ctx);
          const dialogId = ctx.surfaceRuntime.open({
            kind: 'dialog',
            surface: invocation.args ?? {},
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
        }

        case 'closeDialog':
        case 'closeDrawer':
        case 'closeSurface': {
          const surfaceId = typeof invocation.args?.surfaceId === 'string'
            ? invocation.args.surfaceId
            : typeof invocation.args?.dialogId === 'string'
              ? invocation.args.dialogId
              : typeof invocation.args?.drawerId === 'string'
                ? invocation.args.drawerId
                : undefined;
          if (ctx.surfaceRuntime) {
            if (surfaceId) {
              ctx.surfaceRuntime.close(surfaceId);
            } else {
              ctx.surfaceRuntime.close(ctx.dialogId);
            }
          }
          return { ok: true };
        }

        case 'openDrawer': {
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
            surface: invocation.args ?? {},
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
        }


        case 'showToast': {
          const level = typeof invocation.args?.level === 'string' && ['info', 'success', 'warning', 'error'].includes(invocation.args.level)
            ? invocation.args.level as 'info' | 'success' | 'warning' | 'error'
            : 'info';
          const message = typeof invocation.args?.message === 'string' ? invocation.args.message : 'Action completed';
          ctx.runtime.env.notify(level, message);
          return { ok: true, data: invocation.args };
        }

        case 'navigate': {
          const args = invocation.args ?? {};
          const env = getEnv();
          if (!env.navigate) {
            return { ok: false, error: new Error('navigate action requires env.navigate to be configured') };
          }

          if (args.back) {
            env.navigate(-1);
          } else if (typeof args.url === 'string') {
            env.navigate(args.url, args.replace ? { replace: true } : undefined);
          } else {
            return { ok: false, error: new Error('navigate action requires args.url or args.back') };
          }

          return { ok: true };
        }

        case 'refreshTable': {
          ctx.page?.refresh();
          return {
            ok: true,
            data: ctx.page?.store.getState().refreshTick
          };
        }

        case 'refreshSource': {
          const sourceId = typeof invocation.args?.sourceId === 'string' ? invocation.args.sourceId : undefined;
          if (!sourceId) {
            return { ok: false, error: new Error('refreshSource requires sourceId') };
          }

          const refreshed = await runtime.refreshDataSource({
            id: sourceId,
            scope: ctx.scope
          });

          return {
            ok: refreshed,
            data: refreshed,
            error: refreshed ? undefined : new Error(`Source not found: ${sourceId}`)
          };
        }

        default:
          return { ok: false, error: new Error(`Unsupported built-in action: ${invocation.action}`) };
      }
    },

    async invokeComponentAction(invocation: ComponentActionInvocation, ctx) {
      if (!ctx.componentRegistry) {
        return { ok: false, error: new Error('Component registry not available') };
      }

      let handle: import('@nop-chaos/flux-core').ComponentHandle | undefined;
      let resolveError: Error | undefined;

      try {
        handle = ctx.componentRegistry.resolve(invocation.target);
      } catch (e) {
        resolveError = e instanceof Error ? e : new Error('Component handle resolution failed');
      }

      if (resolveError || !handle) {
        return {
          ok: false,
          error: resolveError ?? new Error('Component handle not found'),
          componentId: invocation.target.componentId,
          componentName: invocation.target.componentName
        };
      }

      if (handle.capabilities.hasMethod && !handle.capabilities.hasMethod(invocation.method)) {
        const methods = handle.capabilities.listMethods?.();
        if (methods && !methods.includes(invocation.method)) {
          return {
            ok: false,
            error: new Error(`Unsupported component method: ${invocation.method}`),
            componentId: handle.id,
            componentName: handle.name,
            componentType: handle.type
          };
        }
      }

      const result = await handle.capabilities.invoke(invocation.method, invocation.payload, ctx);
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

    invokeNamespacedAction(invocation: NamespacedActionInvocation, ctx) {
      if (!ctx.actionScope) {
        return Promise.resolve({ ok: false, error: new Error('Action scope not available') });
      }

      const resolved = ctx.actionScope.resolve(invocation.actionName);

      if (!resolved) {
        return Promise.resolve({ ok: false, error: new Error(`Unsupported action: ${invocation.actionName}`) });
      }

      return resolved.provider.invoke(resolved.method, invocation.payload, ctx) as Promise<ActionResult>;
    }
  };
}
