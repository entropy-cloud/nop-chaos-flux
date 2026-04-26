import { simpleTreeLayout } from '@nop-chaos/flow-designer-core';
import type { DesignerCore, GraphDocument, GraphNode, TreeDocument } from '@nop-chaos/flow-designer-core';
import type { DesignerCommandReason, DesignerCommandResult } from './designer-command-types';

export interface TreeCommandOwner {
  getTreeDocument(): TreeDocument;
  setTreeDocument(next: TreeDocument): void;
  config: { documentMode?: 'graph' | 'tree' };
}

const EDGE_SELF_LOOP_ERROR = 'Self-loop edges are not supported in the playground example.';
const EDGE_MISSING_NODE_ERROR = 'Edges must connect existing nodes.';
const EDGE_DUPLICATE_ERROR = 'Duplicate edges are not supported in the playground example.';

export function createSuccess(core: DesignerCore, extra?: Omit<DesignerCommandResult, 'ok' | 'snapshot'>): DesignerCommandResult {
  return {
    ok: true,
    snapshot: core.getSnapshot(),
    ...extra
  };
}

export function createFailure(
  core: DesignerCore,
  error: string,
  reason?: DesignerCommandReason,
  extra?: Omit<DesignerCommandResult, 'ok' | 'snapshot' | 'error' | 'reason'>
): DesignerCommandResult {
  return {
    ok: false,
    snapshot: core.getSnapshot(),
    error,
    reason,
    ...extra
  };
}

export function hasNode(doc: GraphDocument, nodeId: string): boolean {
  return doc.nodes.some((node) => node.id === nodeId);
}

export function getNode(doc: GraphDocument, nodeId: string): GraphNode | undefined {
  return doc.nodes.find((node) => node.id === nodeId);
}

export function hasEdge(doc: GraphDocument, edgeId: string): boolean {
  return doc.edges.some((edge) => edge.id === edgeId);
}

export function hasEdgeConnection(doc: GraphDocument, source: string, target: string, ignoreEdgeId?: string): boolean {
  return doc.edges.some((edge) => edge.id !== ignoreEdgeId && edge.source === source && edge.target === target);
}

export function viewportsEqual(
  left: { x: number; y: number; zoom: number },
  right: { x: number; y: number; zoom: number }
): boolean {
  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}

export function validateEdgeMutation(
  core: DesignerCore,
  source: string,
  target: string,
  ignoreEdgeId?: string
): { error?: string; reason?: DesignerCommandReason } {
  const doc = core.getDocument();
  const config = core.getConfig();

  if (!hasNode(doc, source) || !hasNode(doc, target)) {
    return { error: EDGE_MISSING_NODE_ERROR, reason: 'missing-node' };
  }

  if (!config.rules.allowSelfLoop && source === target) {
    return { error: EDGE_SELF_LOOP_ERROR, reason: 'self-loop' };
  }

  if (hasEdgeConnection(doc, source, target, ignoreEdgeId)) {
    return { error: EDGE_DUPLICATE_ERROR, reason: 'duplicate-edge' };
  }

  return {};
}

export function inferAddNodeFailure(core: DesignerCore, nodeType: string): { error: string; reason: DesignerCommandReason } {
  if (!core.getConfig().nodeTypes.has(nodeType)) {
    return {
      error: `Unknown node type: ${nodeType}`,
      reason: 'unknown-node-type'
    };
  }

  return {
    error: `Unable to add node: ${nodeType}`,
    reason: 'constraint'
  };
}

export function relayoutAfterTreeMutation(core: DesignerCore): void {
  const config = core.getConfig();
  if (config.documentMode !== 'tree' || !config.treeConfig) return;
  const doc = core.getDocument();
  const layoutedNodes = simpleTreeLayout(doc.nodes, doc.edges, config.treeConfig, config.nodeTypes);
  const positions = new Map(layoutedNodes.map((node) => [node.id, node.position]));
  core.layoutNodes(positions);
}
