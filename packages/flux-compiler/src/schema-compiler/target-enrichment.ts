import type {
  BaseSchema,
  TemplateNode,
  TemplateRegion,
  CompiledCidState,
} from '@nop-chaos/flux-core';
import { attachCompiledCidState } from '@nop-chaos/flux-core';
import type { SchemaCompilerDiagnosticsContext } from './diagnostics.js';

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
  cidState: CompiledCidState,
  diagnostics?: SchemaCompilerDiagnosticsContext,
): TemplateNode | readonly TemplateNode[] {
  const nodes: TemplateNode[] = [];
  collectAllTemplateNodes(compiled, nodes);

  for (const node of nodes) {
    cidState.nextTemplateNodeId += 1;
    (node as { templateNodeId: number }).templateNodeId = cidState.nextTemplateNodeId;
    attachCompiledCidState(node, cidState);

    if (!node.id) {
      continue;
    }

    const firstTemplateNodeId = cidState.byId.get(node.id);
    const duplicatePaths = cidState.idPaths.get(node.id);

    if (firstTemplateNodeId == null) {
      cidState.byId.set(node.id, node.templateNodeId);
      cidState.idPaths.set(node.id, [node.templatePath]);
      continue;
    }

    if (!duplicatePaths) {
      cidState.idPaths.set(node.id, [node.templatePath]);
      continue;
    }

    cidState.duplicateIds.add(node.id);

    if (!duplicatePaths.includes(node.templatePath)) {
      duplicatePaths.push(node.templatePath);
    }

    if (diagnostics?.enabled) {
      diagnostics.emit({
        code: 'duplicate-schema-id',
        path: node.templatePath,
        severity: 'warning',
        message: `Duplicate schema id "${node.id}" detected at ${duplicatePaths.join(', ')}. The first occurrence remains bound to ${duplicatePaths[0]}.`,
      });
    }
  }

  return compiled;
}
