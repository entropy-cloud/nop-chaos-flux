import type {
  ComponentTarget,
  ComponentHandleRegistry,
  NodeInstance,
  ResolutionContext,
  RendererRuntime
} from '@nop-chaos/flux-core';

export function createRuntimeNodeResolver(_runtime: RendererRuntime) {
  return {
    resolveTarget(target: ComponentTarget, ctx: ResolutionContext & { componentRegistry?: ComponentHandleRegistry }): NodeInstance | undefined {
      const registry = ctx.componentRegistry;

      if (!registry) {
        return undefined;
      }

      const handle = registry.resolve(target);
      const cid = handle?._cid;

      if (typeof cid !== 'number') {
        return undefined;
      }

      const debugData = registry.getHandleDebugData?.(cid);
      const nodeInstance = debugData?.nodeInstance;

      if (!nodeInstance) {
        return undefined;
      }

      if (ctx.runtimeId !== _runtime.runtimeId) {
        return undefined;
      }

      return nodeInstance;
    }
  };
}
