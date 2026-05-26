import type {
  ActionContext,
  ComponentCapabilityActionContext,
  FluxActionEvent,
} from '@nop-chaos/flux-core';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFluxActionEvent(value: unknown): value is FluxActionEvent {
  return isRecord(value) && typeof value.type === 'string';
}

export function toPartialActionContext(
  ctx: ComponentCapabilityActionContext | undefined,
): Partial<ActionContext> {
  if (!ctx) {
    return {};
  }

  return {
    scope: ctx.scope as ActionContext['scope'] | undefined,
    actionScope: ctx.actionScope as ActionContext['actionScope'],
    componentRegistry: ctx.componentRegistry as ActionContext['componentRegistry'],
    form: ctx.form as ActionContext['form'],
    page: ctx.page as ActionContext['page'],
    nodeInstance: ctx.nodeInstance as ActionContext['nodeInstance'],
    runtime: ctx.runtime as ActionContext['runtime'] | undefined,
    surfaceRuntime: ctx.surfaceRuntime as ActionContext['surfaceRuntime'],
    interactionId: ctx.interactionId,
    signal: ctx.signal,
    dialogId: ctx.dialogId,
    prevResult: ctx.prevResult as ActionContext['prevResult'],
    evaluationBindings: ctx.evaluationBindings,
    event: isFluxActionEvent(ctx.event) ? ctx.event : undefined,
    instancePath: Array.isArray(ctx.instancePath)
      ? (ctx.instancePath as ActionContext['instancePath'])
      : undefined,
    getInstanceKey: ctx.getInstanceKey,
  };
}
