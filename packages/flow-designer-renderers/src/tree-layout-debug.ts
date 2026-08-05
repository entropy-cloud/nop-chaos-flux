import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';
import type { RendererEnv } from '@nop-chaos/flux-core';

function summarizeNode(node: DesignerSnapshot['doc']['nodes'][number]) {
  const data = node.data as Record<string, unknown>;
  return {
    id: node.id,
    type: node.type,
    label: data.label,
    x: Math.round(node.position.x),
    y: Math.round(node.position.y),
    branches: Array.isArray(data.branches) ? data.branches.length : 0,
  };
}

function summarizeEdge(edge: DesignerSnapshot['doc']['edges'][number]) {
  const data = edge.data as Record<string, unknown> | undefined;
  const geometry = data?.__fdTree as
    | { kind?: string; direction?: string; ownerId?: string; branchId?: string; continuationId?: string; lineMain?: number; fanoutCross?: number }
    | undefined;
  return {
    id: edge.id,
    type: edge.type,
    source: edge.source,
    target: edge.target,
    sourcePort: edge.sourcePort,
    targetPort: edge.targetPort,
    kind: geometry?.kind,
    direction: geometry?.direction,
    ownerId: geometry?.ownerId,
    branchId: geometry?.branchId,
    continuationId: geometry?.continuationId,
    lineMain: geometry?.lineMain,
    fanoutCross: geometry?.fanoutCross,
  };
}

export function emitTreeLayoutDebugSnapshot(
  env: Pick<RendererEnv, 'notify'> | undefined,
  snapshot: DesignerSnapshot,
) {
  const payload = {
    docId: snapshot.doc.id,
    nodeCount: snapshot.doc.nodes.length,
    edgeCount: snapshot.doc.edges.length,
    activeNodeId: snapshot.selection.activeNodeId,
    activeBranchId: snapshot.selection.activeBranchId,
    nodes: snapshot.doc.nodes.map(summarizeNode),
    edges: snapshot.doc.edges.map(summarizeEdge),
  };

  env?.notify?.('info', `[flow-designer tree-layout] ${JSON.stringify(payload)}`);
}
