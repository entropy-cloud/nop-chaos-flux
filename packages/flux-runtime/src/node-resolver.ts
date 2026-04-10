import type {
  ComponentTarget,
  ComponentHandleRegistry,
  NodeInstance,
  ResolutionContext,
  RendererRuntime
} from '@nop-chaos/flux-core';

export function createRuntimeNodeResolver(_runtime: RendererRuntime) {
  void _runtime;

  return {
    resolveTarget(target: ComponentTarget, ctx: ResolutionContext & { componentRegistry?: ComponentHandleRegistry }): NodeInstance | undefined {
      void ctx;
      void target;
      return undefined;
    }
  };
}
