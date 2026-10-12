import type {
  DesignerCore,
  GraphDocument,
  GraphNode,
} from '@nop-chaos/flow-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import type { DesignerCommandReason, DesignerCommandResult } from './designer-command-types.js';
export { viewportsEqual } from './designer-xyflow-canvas/xyflow-utils.js';

// WA-flowr-010 (plan 573): these surfaced through notify failure toasts; the
// bare-English constants (with their stale demo-host wording) are now
// localized via the flux.flowDesigner.command namespace.
const EDGE_SELF_LOOP_ERROR = () => t('flux.flowDesigner.command.selfLoopEdge');
const EDGE_MISSING_NODE_ERROR = () => t('flux.flowDesigner.command.missingEdgeNode');
const EDGE_DUPLICATE_ERROR = () => t('flux.flowDesigner.command.duplicateEdge');

export function createSuccess(
  core: DesignerCore,
  extra?: Omit<DesignerCommandResult, 'ok' | 'snapshot'>,
): DesignerCommandResult {
  return {
    ok: true,
    snapshot: core.getSnapshot(),
    ...extra,
  };
}

export function createFailure(
  core: DesignerCore,
  error: unknown,
  reason?: DesignerCommandReason,
  extra?: Omit<DesignerCommandResult, 'ok' | 'snapshot' | 'error' | 'reason'>,
): DesignerCommandResult {
  return {
    ok: false,
    snapshot: core.getSnapshot(),
    error,
    reason,
    ...extra,
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

export function hasEdgeConnection(
  doc: GraphDocument,
  source: string,
  target: string,
  sourcePort?: string,
  targetPort?: string,
  ignoreEdgeId?: string,
): boolean {
  return doc.edges.some(
    (edge) =>
      edge.id !== ignoreEdgeId &&
      edge.source === source &&
      edge.target === target &&
      edge.sourcePort === sourcePort &&
      edge.targetPort === targetPort,
  );
}

export function validateEdgeMutation(
  core: DesignerCore,
  source: string,
  target: string,
  sourcePort?: string,
  targetPort?: string,
  ignoreEdgeId?: string,
): { error?: string; reason?: DesignerCommandReason } {
  const doc = core.getDocument();
  const config = core.getConfig();

  if (!hasNode(doc, source) || !hasNode(doc, target)) {
    return { error: EDGE_MISSING_NODE_ERROR(), reason: 'missing-node' };
  }

  if (!config.rules.allowSelfLoop && source === target) {
    return { error: EDGE_SELF_LOOP_ERROR(), reason: 'self-loop' };
  }

  if (hasEdgeConnection(doc, source, target, sourcePort, targetPort, ignoreEdgeId)) {
    return { error: EDGE_DUPLICATE_ERROR(), reason: 'duplicate-edge' };
  }

  return {};
}

export function inferAddNodeFailure(
  core: DesignerCore,
  nodeType: string,
): { error: string; reason: DesignerCommandReason } {
  if (!core.getConfig().nodeTypes.has(nodeType)) {
    return {
      error: t('flux.flowDesigner.command.unknownNodeType', { nodeType }),
      reason: 'unknown-node-type',
    };
  }

  return {
    error: t('flux.flowDesigner.command.unableToAddNode', { nodeType }),
    reason: 'constraint',
  };
}
