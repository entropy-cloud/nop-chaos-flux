import type { GraphDocument, GraphEdge, NormalizedDesignerConfig, DesignerEvent } from './types';
import { generateId } from './core/clone';
import {
  countIncomingEdges,
  countOutgoingEdges,
  EDGE_MISSING_NODE_ERROR,
  EDGE_SELF_LOOP_ERROR,
  validateEdgeConnection,
} from './core/constraints';
import {
  addEdgeToDocument,
  removeEdgeFromDocument,
  replaceEdgeInDocument,
  updateEdgeDataInDocument,
} from './core/edge-operations';
import {
  getSelectionSummary,
  removeEdgeFromSelection,
  selectSingleEdge,
  type DesignerSelectionState,
} from './core/selection';

export interface EdgeCommandContext {
  doc: GraphDocument;
  normalizedConfig: NormalizedDesignerConfig;
  selectionState: DesignerSelectionState;
  transactionStack: readonly unknown[];
  setDocument: (doc: GraphDocument) => boolean;
  pushHistory: () => void;
  emitMutation: (event: DesignerEvent) => void;
  emit: (event: DesignerEvent) => void;
  updateDirtyState: () => void;
  setSelectionState: (state: DesignerSelectionState) => void;
}

export function addEdgeCommand(
  ctx: EdgeCommandContext,
  source: string,
  target: string,
  data?: Record<string, unknown>,
  sourcePort?: string,
  targetPort?: string,
): GraphEdge | null {
  const sourceNode = ctx.doc.nodes.find((n) => n.id === source);
  const targetNode = ctx.doc.nodes.find((n) => n.id === target);

  if (sourceNode) {
    const sourceType = ctx.normalizedConfig.nodeTypes.get(sourceNode.type);
    if (sourceType?.constraints?.allowOutgoing === false) {
      return null;
    }
    const maxOut = sourceType?.constraints?.maxOutgoing;
    if (maxOut !== undefined && countOutgoingEdges(ctx.doc, source) >= maxOut) {
      return null;
    }
  }

  if (targetNode) {
    const targetType = ctx.normalizedConfig.nodeTypes.get(targetNode.type);
    if (targetType?.constraints?.allowIncoming === false) {
      return null;
    }
    const maxIn = targetType?.constraints?.maxIncoming;
    if (maxIn !== undefined && countIncomingEdges(ctx.doc, target) >= maxIn) {
      return null;
    }
  }

  if (ctx.normalizedConfig.hooks?.beforeConnect) {
    try {
      const result = ctx.normalizedConfig.hooks.beforeConnect({
        source,
        target,
        sourcePort,
        targetPort,
        data,
      });
      if (result === false) {
        return null;
      }
      source = result.source;
      target = result.target;
      sourcePort = result.sourcePort;
      targetPort = result.targetPort;
      data = result.data;
    } catch (err) {
      ctx.emit({ type: 'lifecycleHookError', hook: 'beforeConnect', error: String(err) });
      return null;
    }
  }

  const validationError = validateEdgeConnection(
    ctx.doc,
    ctx.normalizedConfig,
    source,
    target,
    sourcePort,
    targetPort,
  );
  if (validationError) {
    return null;
  }

  const newEdge: GraphEdge = {
    id: generateId(),
    type: ctx.normalizedConfig.rules.defaultEdgeType ?? 'default',
    source,
    target,
    sourcePort,
    targetPort,
    data: { ...data },
  };

  ctx.setDocument(addEdgeToDocument(ctx.doc, newEdge));
  if (ctx.transactionStack.length === 0) ctx.pushHistory();
  ctx.emitMutation({ type: 'edgeAdded', edge: newEdge });
  ctx.emit({ type: 'documentChanged', doc: ctx.doc });
  ctx.updateDirtyState();

  return newEdge;
}

export function reconnectEdgeCommand(
  ctx: EdgeCommandContext,
  edgeId: string,
  source: string,
  target: string,
  sourcePort?: string,
  targetPort?: string,
): { ok: boolean; edge?: GraphEdge; error?: string; reason?: string } {
  const edgeIndex = ctx.doc.edges.findIndex((edge) => edge.id === edgeId);
  if (edgeIndex === -1) {
    return { ok: false, error: `Unknown edge: ${edgeId}`, reason: 'unknown-edge' };
  }

  const currentEdge = ctx.doc.edges[edgeIndex];
  const validationError = validateEdgeConnection(
    ctx.doc,
    ctx.normalizedConfig,
    source,
    target,
    sourcePort,
    targetPort,
    edgeId,
  );
  if (validationError) {
    return {
      ok: false,
      error: validationError,
      reason:
        validationError === EDGE_MISSING_NODE_ERROR
          ? 'missing-node'
          : validationError === EDGE_SELF_LOOP_ERROR
            ? 'self-loop'
            : 'duplicate-edge',
    };
  }

  ctx.setSelectionState(selectSingleEdge(ctx.selectionState, edgeId));

  if (
    currentEdge.source === source &&
    currentEdge.target === target &&
    currentEdge.sourcePort === sourcePort &&
    currentEdge.targetPort === targetPort
  ) {
    ctx.emit({ type: 'selectionChanged', selection: getSelectionSummary(ctx.selectionState) });
    return { ok: true, edge: currentEdge, reason: 'unchanged' };
  }

  const updatedEdge = {
    ...currentEdge,
    source,
    target,
    sourcePort,
    targetPort,
  };
  ctx.setDocument(replaceEdgeInDocument(ctx.doc, edgeId, updatedEdge));

  if (ctx.transactionStack.length === 0) ctx.pushHistory();
  ctx.emitMutation({ type: 'edgeUpdated', edge: updatedEdge });
  ctx.emit({ type: 'documentChanged', doc: ctx.doc });
  ctx.emit({ type: 'selectionChanged', selection: getSelectionSummary(ctx.selectionState) });
  ctx.updateDirtyState();

  return { ok: true, edge: updatedEdge };
}

export function updateEdgeCommand(
  ctx: EdgeCommandContext,
  edgeId: string,
  data: Record<string, unknown>,
): void {
  const updatedEdge = updateEdgeDataInDocument(ctx.doc, edgeId, data);
  if (!updatedEdge) {
    return;
  }

  ctx.setDocument(replaceEdgeInDocument(ctx.doc, edgeId, updatedEdge));

  if (ctx.transactionStack.length === 0) ctx.pushHistory();
  ctx.emitMutation({ type: 'edgeUpdated', edge: updatedEdge });
  ctx.emit({ type: 'documentChanged', doc: ctx.doc });
  ctx.updateDirtyState();
}

export function deleteEdgeCommand(ctx: EdgeCommandContext, edgeId: string): void {
  if (ctx.normalizedConfig.hooks?.beforeDelete) {
    try {
      const result = ctx.normalizedConfig.hooks.beforeDelete({ type: 'edge', id: edgeId });
      if (result === false) {
        return;
      }
      edgeId = result.id;
    } catch (err) {
      ctx.emit({ type: 'lifecycleHookError', hook: 'beforeDelete', error: String(err) });
      return;
    }
  }

  const edgeIndex = ctx.doc.edges.findIndex((e) => e.id === edgeId);
  if (edgeIndex === -1) {
    return;
  }

  ctx.setDocument(removeEdgeFromDocument(ctx.doc, edgeId));
  ctx.setSelectionState(removeEdgeFromSelection(ctx.selectionState, edgeId));

  if (ctx.transactionStack.length === 0) ctx.pushHistory();
  ctx.emitMutation({ type: 'edgeDeleted', edgeId });
  ctx.emit({ type: 'documentChanged', doc: ctx.doc });
  ctx.emit({ type: 'selectionChanged', selection: getSelectionSummary(ctx.selectionState) });
  ctx.updateDirtyState();
}
