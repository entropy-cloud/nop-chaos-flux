import type { BaseSchema, TemplateNode, TemplateRegion } from '@nop-chaos/flux-core';
import { attachCompiledCidState } from '@nop-chaos/flux-core';

function collectAllTemplateNodes(
  entry: TemplateNode | readonly TemplateNode[],
  out: TemplateNode[],
) {
  const queue: Array<TemplateNode | readonly TemplateNode[]> = [entry];
  while (queue.length > 0) {
    const current = queue.pop()!;
    if (Array.isArray(current)) {
      for (const item of current) {
        out.push(item);
        const regions = item.regions as Record<string, TemplateRegion>;
        for (const region of Object.values(regions)) {
          if (region.node) {
            queue.push(region.node as TemplateNode | readonly TemplateNode[]);
          }
        }
      }
    } else {
      out.push(current as TemplateNode);
      const regions = (current as TemplateNode).regions as Record<string, TemplateRegion>;
      for (const region of Object.values(regions)) {
        if (region.node) {
          queue.push(region.node as TemplateNode | readonly TemplateNode[]);
        }
      }
    }
  }
}

export function extractLifecycleActions(schema: BaseSchema) {
  const lifecycleActions: {
    onMount?: unknown;
    onUnmount?: unknown;
  } = {};

  if (schema.onMount !== undefined) {
    lifecycleActions.onMount = schema.onMount;
  }

  if (schema.onUnmount !== undefined) {
    lifecycleActions.onUnmount = schema.onUnmount;
  }

  return Object.keys(lifecycleActions).length > 0 ? lifecycleActions : undefined;
}

export function enrichTemplateNodeIds(
  compiled: TemplateNode | readonly TemplateNode[],
  cidState: import('@nop-chaos/flux-core').CompiledCidState,
): TemplateNode | readonly TemplateNode[] {
  const nodes: TemplateNode[] = [];
  collectAllTemplateNodes(compiled, nodes);

  for (const node of nodes) {
    cidState.nextTemplateNodeId += 1;
    (node as { templateNodeId: number }).templateNodeId = cidState.nextTemplateNodeId;
    attachCompiledCidState(node, cidState);
  }

  return compiled;
}
