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
  let nextTemplateNodeId = cidState.nextTemplateNodeId;
  const nextById = new Map(cidState.byId);
  const nextIdPaths = new Map<string, string[]>(
    Array.from(cidState.idPaths.entries(), ([key, value]) => [key, [...value]]),
  );
  const nextDuplicateIds = new Set(cidState.duplicateIds);
  const nodes: TemplateNode[] = [];
  collectAllTemplateNodes(compiled, nodes);

  for (const node of nodes) {
    nextTemplateNodeId += 1;
    (node as { templateNodeId: number }).templateNodeId = nextTemplateNodeId;

    if (!node.id) {
      continue;
    }

    const firstTemplateNodeId = nextById.get(node.id);
    const duplicatePaths = nextIdPaths.get(node.id);

    if (firstTemplateNodeId == null) {
      nextById.set(node.id, node.templateNodeId);
      nextIdPaths.set(node.id, [node.templatePath]);
      continue;
    }

    if (!duplicatePaths) {
      nextIdPaths.set(node.id, [node.templatePath]);
      continue;
    }

    nextDuplicateIds.add(node.id);

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

  const nextCidState: CompiledCidState = {
    nextCid: cidState.nextCid,
    nextTemplateNodeId,
    byId: nextById,
    idPaths: nextIdPaths,
    duplicateIds: nextDuplicateIds,
  };

  for (const node of nodes) {
    attachCompiledCidState(node, nextCidState);
  }

  return compiled;
}
