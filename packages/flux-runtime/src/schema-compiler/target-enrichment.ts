import type {
  BaseSchema,
  CompiledSchemaNode
} from '@nop-chaos/flux-core';
import { attachCompiledCidState } from '@nop-chaos/flux-core';

function collectCompiledNodes(entry: CompiledSchemaNode | CompiledSchemaNode[], out: CompiledSchemaNode[]) {
  if (Array.isArray(entry)) {
    entry.forEach((item) => collectCompiledNodes(item, out));
    return;
  }

  out.push(entry);

  for (const region of Object.values(entry.regions)) {
    if (!region.node) {
      continue;
    }
    collectCompiledNodes(region.node, out);
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

export function enrichCompiledComponentTargets(
  compiled: CompiledSchemaNode | CompiledSchemaNode[],
  cidState: import('@nop-chaos/flux-core').CompiledCidState
): CompiledSchemaNode | CompiledSchemaNode[] {
  const nodes: CompiledSchemaNode[] = [];
  collectCompiledNodes(compiled, nodes);

  for (const node of nodes) {
    cidState.nextTemplateNodeId += 1;
    node.templateNodeId = cidState.nextTemplateNodeId;
    cidState.nextCid += 1;
    node.cid = cidState.nextCid;
    attachCompiledCidState(node, cidState);
  }

  return compiled;
}
