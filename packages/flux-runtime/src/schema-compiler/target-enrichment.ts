import type {
  BaseSchema,
  CompiledCidState,
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

function rewriteActionTargets(
  value: unknown,
  byId: Map<string, { cid: number; templateGraphId?: string; templateNodeId?: number }>
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteActionTargets(item, byId));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, candidate] of Object.entries(source)) {
    output[key] = rewriteActionTargets(candidate, byId);
  }

  if (typeof source.action === 'string' && source.action.startsWith('component:')) {
    if (typeof source.componentId === 'string') {
      const resolvedTarget = byId.get(source.componentId);
      if (resolvedTarget) {
        output._targetCid = resolvedTarget.cid;

        if (resolvedTarget.templateGraphId && typeof resolvedTarget.templateNodeId === 'number') {
          output.__componentTarget = {
            staticPlan: {
              kind: 'static',
              templateGraphId: resolvedTarget.templateGraphId,
              templateNodeId: resolvedTarget.templateNodeId
            }
          };
        }
      }
    }
  }

  return output;
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

function indexNodeIds(nodes: readonly CompiledSchemaNode[], cidState: CompiledCidState): void {
  for (const node of nodes) {
    const id = typeof (node.schema as Record<string, unknown>).id === 'string'
      ? (node.schema as Record<string, unknown>).id as string
      : undefined;

    if (!id || typeof node.cid !== 'number') {
      continue;
    }

    const paths = cidState.idPaths.get(id) ?? [];
    paths.push(node.path);
    cidState.idPaths.set(id, paths);

    if (paths.length === 1 && !cidState.duplicateIds.has(id)) {
      cidState.byId.set(id, node.cid);
      continue;
    }

    cidState.duplicateIds.add(id);
    cidState.byId.delete(id);
    console.warn(
      `[SchemaCompiler] Duplicate component id "${id}" detected. Static cid resolution is disabled for this id. Paths: ${paths.join(', ')}`
    );
  }
}

function createResolvedIdMap(nodes: readonly CompiledSchemaNode[], cidState: CompiledCidState): Map<string, { cid: number; templateGraphId?: string; templateNodeId?: number }> {
  const resolved = new Map<string, { cid: number; templateGraphId?: string; templateNodeId?: number }>();

  for (const node of nodes) {
    const id = typeof (node.schema as Record<string, unknown>).id === 'string'
      ? (node.schema as Record<string, unknown>).id as string
      : undefined;

    if (!id || typeof node.cid !== 'number') {
      continue;
    }

    const paths = cidState.idPaths.get(id) ?? [];

    if (paths.length !== 1 || cidState.duplicateIds.has(id)) {
      continue;
    }

    const resolvedCid = cidState.byId.get(id);
    if (resolvedCid !== undefined) {
      resolved.set(id, {
        cid: resolvedCid,
        templateGraphId: node.templateGraphId,
        templateNodeId: node.templateNodeId
      });
    }
  }

  return resolved;
}

export function enrichCompiledComponentTargets(
  compiled: CompiledSchemaNode | CompiledSchemaNode[],
  cidState: CompiledCidState
): CompiledSchemaNode | CompiledSchemaNode[] {
  const nodes: CompiledSchemaNode[] = [];
  collectCompiledNodes(compiled, nodes);

  for (const node of nodes) {
    cidState.nextTemplateNodeId += 1;
    node.templateGraphId = cidState.templateGraphId;
    node.templateNodeId = cidState.nextTemplateNodeId;
    cidState.nextCid += 1;
    node.cid = cidState.nextCid;
    attachCompiledCidState(node, cidState);
  }

  indexNodeIds(nodes, cidState);
  const resolvedIds = createResolvedIdMap(nodes, cidState);

  for (const node of nodes) {
    const nextActions: Record<string, unknown> = {};
    for (const key of node.eventKeys) {
      nextActions[key] = rewriteActionTargets(node.eventActions[key], resolvedIds);
    }
    node.eventActions = nextActions;
  }

  return compiled;
}
