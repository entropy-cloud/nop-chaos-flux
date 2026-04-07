import type {
  ComponentTarget,
  ComponentHandleRegistry,
  NodeLocator,
  ResolutionContext,
  ResolutionResult,
  RendererRuntime
} from '@nop-chaos/flux-core';
import { normalizeNodeLocator } from '@nop-chaos/flux-core';

export function createRuntimeNodeResolver(_runtime: RendererRuntime) {
  void _runtime;

  function resolveNode(locator: NodeLocator, options?: { componentRegistry?: ComponentHandleRegistry }): ResolutionResult {
    const normalizedLocator = normalizeNodeLocator(locator);
    const resolvedHandle = options?.componentRegistry?.resolveHandle?.(normalizedLocator);

    if (resolvedHandle) {
      return {
        kind: 'resolved',
        locator: normalizedLocator,
        handle: resolvedHandle
      };
    }

    return {
      kind: 'notMaterialized',
      locator: normalizedLocator
    };
  }

  return {
    resolveNode,
    resolveTarget(target: ComponentTarget, ctx: ResolutionContext & { componentRegistry?: ComponentHandleRegistry }): ResolutionResult {
      if (target.locator) {
        return resolveNode(target.locator, { componentRegistry: ctx.componentRegistry });
      }

      if (target.staticPlan) {
        return resolveNode({
          runtimeId: ctx.runtimeId,
          templateGraphId: target.staticPlan.templateGraphId,
          templateNodeId: target.staticPlan.templateNodeId
        }, { componentRegistry: ctx.componentRegistry });
      }

      if (target.repeatedPlan) {
        const instancePath = ctx.instancePathFor?.(target.repeatedPlan.repeatedTemplateId);

        if (!instancePath) {
          return {
            kind: 'notMaterialized',
            locator: {
              runtimeId: ctx.runtimeId,
              templateGraphId: target.repeatedPlan.templateGraphId,
              templateNodeId: target.repeatedPlan.templateNodeId
            }
          };
        }

        return resolveNode({
          runtimeId: ctx.runtimeId,
          templateGraphId: target.repeatedPlan.templateGraphId,
          templateNodeId: target.repeatedPlan.templateNodeId,
          instancePath
        }, { componentRegistry: ctx.componentRegistry });
      }

      if (target.repeatedSelector) {
        const instancePath = ctx.instancePathForExplicit?.(target.repeatedSelector.repeatedTemplateId, target.repeatedSelector.instanceKey);

        if (!instancePath) {
          return {
            kind: 'notMaterialized',
            locator: {
              runtimeId: ctx.runtimeId,
              templateGraphId: target.repeatedSelector.templateGraphId,
              templateNodeId: target.repeatedSelector.templateNodeId
            }
          };
        }

        return resolveNode({
          runtimeId: ctx.runtimeId,
          templateGraphId: target.repeatedSelector.templateGraphId,
          templateNodeId: target.repeatedSelector.templateNodeId,
          instancePath
        }, { componentRegistry: ctx.componentRegistry });
      }

      return ctx.componentRegistry?.resolveTarget?.(target) ?? { kind: 'notFound' };
    }
  };
}
