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
  ScopeRef,
} from '@nop-chaos/flux-core';
import {
  isSchema,
  isSchemaArray,
  matchesFluxValueShape,
  reportRuntimeHostIssue,
  validateHostMethodPayload,
} from '@nop-chaos/flux-core';
import type { ApiRequestExecutor } from './async-data/request-runtime.js';
import type { SchemaFetchSharingContext } from './async-data/request-in-flight-registry.js';
import { executeRuntimeAjaxAction } from './runtime-action-helpers.js';

export interface ActionAdapterInput {
  getEnv: () => RendererEnv;
  expressionCompiler: ExpressionCompiler;
  evaluate: <T = unknown>(target: unknown, scope: ScopeRef) => T;
  executeApiRequest: ApiRequestExecutor;
  sharing?: SchemaFetchSharingContext;
  runtime: RendererRuntime;
  createSurfaceScope: (
    kind: 'dialog' | 'drawer',
    ctx: ActionContext,
    patch?: Record<string, unknown>,
  ) => ScopeRef;
  getDialogActionScope?: (ctx: ActionContext) => ActionContext['actionScope'];
  getDialogComponentRegistry?: (ctx: ActionContext) => ActionContext['componentRegistry'];
}

export function createActionRuntimeAdapter(input: ActionAdapterInput): ActionRuntimeAdapter {
  const { getEnv, expressionCompiler, evaluate, executeApiRequest, runtime } = input;

  function createComponentContractFailureResult(
    handle: import('@nop-chaos/flux-core').ComponentHandle,
    error: Error,
  ): ActionResult {
    return {
      ok: false,
      error,
      componentId: handle.id,
      componentName: handle.name,
      componentType: handle.type,
    };
  }

  function resolveComponentCapabilityContract(
    handle: import('@nop-chaos/flux-core').ComponentHandle,
    method: string,
  ) {
    const definition = runtime.registry.get(handle.type);
    return definition?.componentCapabilityContracts?.find((contract) => contract.handle === method);
  }

  function resolveSurfaceValidationPlan(surface: Record<string, unknown>) {
    const body = surface.body;

    if (!isSchema(body) && !isSchemaArray(body)) {
      return { plan: undefined };
    }

    try {
      const compiled = runtime.compile({
        type: 'page',
        body,
      });
      const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
      return { plan: root?.validationPlan };
    } catch (error) {
      return {
        plan: undefined,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to compile surface validation plan'),
      };
    }
  }

  function createSurfaceValidationFailureResult(
    kind: 'dialog' | 'drawer',
    error: Error,
    surface: Record<string, unknown>,
  ): ActionResult {
    reportRuntimeHostIssue({
      env: runtime.env,
      level: 'error',
      message: `Failed to open ${kind}: validation plan compilation failed`,
      error,
      phase: 'action',
      details: {
        reason: 'surface-validation-plan-compile-failed',
        surfaceKind: kind,
        title: typeof surface.title === 'string' ? surface.title : undefined,
      },
    });
    return { ok: false, error };
  }

  return {
    async invokeBuiltInAction(invocation: BuiltInActionInvocation, ctx) {
      switch (invocation.action) {
        case 'setValue': {
          const path = typeof invocation.args?.path === 'string' ? invocation.args.path : '';
          const value = invocation.args?.value;

          ctx.scope.update(path, value);
          return { ok: true, data: value };
        }

        case 'setValues': {
          const values = (invocation.args?.values as Record<string, unknown> | undefined) ?? {};
          if (Object.keys(values).length === 0) {
            return { ok: true, data: values };
          }

          const basePath = typeof invocation.args?.path === 'string' ? invocation.args.path : undefined;

          const resolvedValues = basePath
            ? Object.fromEntries(
                Object.entries(values).map(([targetPath, val]) => [`${basePath}.${targetPath}`, val]),
              )
            : values;

          if (ctx.form) {
            ctx.form.setValues(basePath ? resolvedValues : values);

            return { ok: true, data: resolvedValues };
          }

          for (const [targetPath, val] of Object.entries(values)) {
            ctx.scope.update(basePath ? `${basePath}.${targetPath}` : targetPath, val);
          }

          if (basePath) {
            return {
              ok: true,
              data: resolvedValues,
            };
          }

          return { ok: true, data: values };
        }

        case 'ajax': {
          const apiSchema = invocation.args as ApiSchema;
          return executeRuntimeAjaxAction(
            apiSchema,
            invocation.actionNode,
            ctx,
            invocation.signal,
            {
              getEnv,
              expressionCompiler,
              evaluate,
              executeApiRequest,
              sharing: input.sharing,
            },
          );
        }

        case 'submitForm': {
          if (!ctx.form) {
            return { ok: false, error: new Error('submitForm requires form runtime') };
          }

          return ctx.form.submit({
            interactionId: ctx.interactionId,
            signal: invocation.signal,
          });
        }

        case 'openDialog': {
          if (!ctx.surfaceRuntime) {
            return { ok: false, error: new Error('openDialog requires surface runtime') };
          }

          const validation = resolveSurfaceValidationPlan(invocation.args ?? {});
          if (validation.error) {
            return createSurfaceValidationFailureResult(
              'dialog',
              validation.error,
              (invocation.args ?? {}) as Record<string, unknown>,
            );
          }

          const dialogData =
            invocation.args?.data && typeof invocation.args.data === 'object'
              ? (invocation.args.data as Record<string, unknown>)
              : undefined;
          const dialogScope = input.createSurfaceScope('dialog', ctx, dialogData);
          const dialogId = ctx.surfaceRuntime.open({
            kind: 'dialog',
            surface: invocation.args ?? {},
            scope: dialogScope,
            options: {
              ownerScope: ctx.scope,
              actionScope: input.getDialogActionScope?.(ctx) ?? ctx.actionScope,
              componentRegistry: input.getDialogComponentRegistry?.(ctx) ?? ctx.componentRegistry,
              validationPlan: validation.plan,
              ownerNodeInstance: ctx.nodeInstance,
            },
          });
          dialogScope.update('dialogId', dialogId);
          return { ok: true, data: { dialogId } };
        }

        case 'closeDialog':
        case 'closeDrawer':
        case 'closeSurface': {
          const surfaceId =
            typeof invocation.args?.surfaceId === 'string'
              ? invocation.args.surfaceId
              : typeof invocation.args?.dialogId === 'string'
                ? invocation.args.dialogId
                : typeof invocation.args?.drawerId === 'string'
                  ? invocation.args.drawerId
                  : undefined;
          if (ctx.surfaceRuntime) {
            if (surfaceId) {
              ctx.surfaceRuntime.close(surfaceId);
            } else if (ctx.dialogId) {
              ctx.surfaceRuntime.close(ctx.dialogId);
            } else {
              ctx.surfaceRuntime.closeTop();
            }
          }
          return { ok: true };
        }

        case 'openDrawer': {
          if (!ctx.surfaceRuntime) {
            return { ok: false, error: new Error('openDrawer requires surface runtime') };
          }

          const validation = resolveSurfaceValidationPlan(invocation.args ?? {});
          if (validation.error) {
            return createSurfaceValidationFailureResult(
              'drawer',
              validation.error,
              (invocation.args ?? {}) as Record<string, unknown>,
            );
          }

          const drawerData =
            invocation.args?.data && typeof invocation.args.data === 'object'
              ? (invocation.args.data as Record<string, unknown>)
              : undefined;
          const drawerScope = input.createSurfaceScope('drawer', ctx, drawerData);

          const drawerId = ctx.surfaceRuntime.open({
            kind: 'drawer',
            surface: invocation.args ?? {},
            scope: drawerScope,
            options: {
              ownerScope: ctx.scope,
              actionScope: input.getDialogActionScope?.(ctx) ?? ctx.actionScope,
              componentRegistry: input.getDialogComponentRegistry?.(ctx) ?? ctx.componentRegistry,
              validationPlan: validation.plan,
              ownerNodeInstance: ctx.nodeInstance,
            },
          });

          drawerScope.update('dialogId', drawerId);
          drawerScope.update('drawerId', drawerId);
          return { ok: true, data: { drawerId } };
        }

        case 'showToast': {
          const level =
            typeof invocation.args?.level === 'string' &&
            ['info', 'success', 'warning', 'error'].includes(invocation.args.level)
              ? (invocation.args.level as 'info' | 'success' | 'warning' | 'error')
              : 'info';
          const message =
            typeof invocation.args?.message === 'string'
              ? invocation.args.message
              : 'Action completed';
          ctx.runtime.env.notify(level, message);
          return { ok: true, data: invocation.args };
        }

        case 'confirm': {
          const env = getEnv();
          const message =
            typeof invocation.args?.message === 'string'
              ? invocation.args.message
              : 'Are you sure?';
          const title =
            typeof invocation.args?.title === 'string'
              ? invocation.args.title
              : undefined;
          if (!env.confirm) {
            return {
              ok: false,
              error: new Error('confirm action requires env.confirm to be configured'),
            };
          }
          const confirmed = await env.confirm(message, title);
          return { ok: true, data: { confirmed } };
        }

        case 'alert': {
          const env = getEnv();
          const message =
            typeof invocation.args?.message === 'string'
              ? invocation.args.message
              : '';
          const title =
            typeof invocation.args?.title === 'string'
              ? invocation.args.title
              : undefined;
          if (env.alert) {
            env.alert(message, title);
          } else {
            ctx.runtime.env.notify('info', message);
          }
          return { ok: true };
        }

        case 'navigate': {
          const args = invocation.args ?? {};
          const env = getEnv();
          if (!env.navigate) {
            return {
              ok: false,
              error: new Error('navigate action requires env.navigate to be configured'),
            };
          }

          if (args.back) {
            env.navigate(-1);
          } else if (typeof args.url === 'string') {
            env.navigate(args.url, args.replace ? { replace: true } : undefined);
          } else {
            return {
              ok: false,
              error: new Error('navigate action requires args.url or args.back'),
            };
          }

          return { ok: true };
        }

        case 'refreshTable': {
          ctx.page?.refresh();
          return {
            ok: true,
            data: ctx.page?.store.getState().refreshTick,
          };
        }

        case 'refreshSource': {
          const targetId =
            typeof invocation.args?.targetId === 'string' ? invocation.args.targetId : invocation.targeting.targetId;
          if (!targetId) {
            return { ok: false, error: new Error('refreshSource requires targetId') };
          }

          const refreshed = await runtime.refreshDataSource({
            name: targetId,
            scope: ctx.scope,
          });

          return {
            ok: refreshed,
            data: refreshed,
            error: refreshed ? undefined : new Error(`Source not found: ${targetId}`),
          };
        }

        default:
          return {
            ok: false,
            error: new Error(`Unsupported built-in action: ${invocation.action}`),
          };
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
          componentName: invocation.target.componentName,
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
            componentType: handle.type,
          };
        }
      }

      const capabilityContract = resolveComponentCapabilityContract(handle, invocation.method);
      if (capabilityContract) {
        const payloadValidation = validateHostMethodPayload(
          `component<${handle.type}>`,
          invocation.method,
          invocation.payload,
          capabilityContract,
        );
        if (!payloadValidation.ok) {
          return createComponentContractFailureResult(handle, payloadValidation.error);
        }
      }

      const payloadWithSignal =
        ctx.signal && invocation.payload && typeof invocation.payload === 'object'
          ? { ...invocation.payload, signal: ctx.signal }
          : ctx.signal
            ? { signal: ctx.signal }
            : invocation.payload;

      const result = await handle.capabilities.invoke(invocation.method, payloadWithSignal, ctx);
      const baseResult =
        result && typeof result === 'object' && 'ok' in (result as object)
          ? (result as ActionResult)
          : { ok: true, data: result };
      if (
        capabilityContract?.result &&
        baseResult.ok &&
        !matchesFluxValueShape(baseResult.data, capabilityContract.result)
      ) {
        return createComponentContractFailureResult(
          handle,
          new Error(
            `component<${handle.type}>:${invocation.method} result does not match the published component result contract.`,
          ),
        );
      }
      return {
        ...baseResult,
        componentId: handle.id,
        componentName: handle.name,
        componentType: handle.type,
      };
    },

    invokeNamespacedAction(invocation: NamespacedActionInvocation, ctx) {
      if (!ctx.actionScope) {
        return Promise.resolve({ ok: false, error: new Error('Action scope not available') });
      }

      const resolved = ctx.actionScope.resolve(invocation.actionName);

      if (!resolved) {
        return Promise.resolve({
          ok: false,
          error: new Error(`Unsupported action: ${invocation.actionName}`),
        });
      }

      return resolved.provider.invoke(
        resolved.method,
        invocation.payload ?? ctx.evaluationBindings,
        ctx,
      ) as Promise<ActionResult>;
    },
  };
}
