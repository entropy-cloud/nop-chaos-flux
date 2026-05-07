import type { GraphDocument, GraphNode, NormalizedDesignerConfig, DesignerEvent } from './types.js';
import { generateId } from './core/clone.js';
import { checkMaxInstances, checkMinInstances } from './core/constraints.js';
import {
  addNodeToDocument,
  moveNodesInDocument,
  removeNodeFromDocument,
  replaceNodeInDocument,
  updateMultipleNodesInDocument,
  updateNodeDataInDocument,
} from './core/node-operations.js';
import {
  removeNodeFromSelection,
  getSelectionSummary,
  type DesignerSelectionState,
} from './core/selection.js';

export interface NodeCommandContext {
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
  addNodeFn: (
    type: string,
    position: { x: number; y: number },
    data?: Record<string, unknown>,
  ) => GraphNode | null;
}

export function addNodeCommand(
  ctx: NodeCommandContext,
  type: string,
  position: { x: number; y: number },
  data?: Record<string, unknown>,
): GraphNode | null {
  if (ctx.normalizedConfig.hooks?.beforeCreateNode) {
    try {
      const result = ctx.normalizedConfig.hooks.beforeCreateNode({ type, position, data });
      if (result === false) {
        return null;
      }
      type = result.type;
      position = result.position;
      data = result.data;
    } catch (err) {
      ctx.emit({ type: 'lifecycleHookError', hook: 'beforeCreateNode', error: String(err) });
      return null;
    }
  }

  const nodeType = ctx.normalizedConfig.nodeTypes.get(type);
  if (!nodeType) {
    return null;
  }

  if (!checkMaxInstances(ctx.doc, nodeType.constraints, type)) {
    return null;
  }

  const newNode: GraphNode = {
    id: generateId(),
    type,
    position: { ...position },
    data: { ...nodeType.defaults, ...data },
  };

  ctx.setDocument(addNodeToDocument(ctx.doc, newNode));
  if (ctx.transactionStack.length === 0) ctx.pushHistory();
  ctx.emitMutation({ type: 'nodeAdded', node: newNode });
  ctx.emit({ type: 'documentChanged', doc: ctx.doc });
  ctx.updateDirtyState();

  return newNode;
}

export function updateNodeCommand(
  ctx: NodeCommandContext,
  nodeId: string,
  data: Record<string, unknown>,
): void {
  const updatedNode = updateNodeDataInDocument(ctx.doc, nodeId, data);
  if (!updatedNode) {
    return;
  }

  ctx.setDocument(replaceNodeInDocument(ctx.doc, nodeId, updatedNode));

  if (ctx.transactionStack.length === 0) ctx.pushHistory();
  ctx.emitMutation({ type: 'nodeUpdated', node: updatedNode });
  ctx.emit({ type: 'documentChanged', doc: ctx.doc });
  ctx.updateDirtyState();
}

export function moveNodeCommand(
  ctx: NodeCommandContext,
  nodeId: string,
  position: { x: number; y: number },
): void {
  const nodeIndex = ctx.doc.nodes.findIndex((n) => n.id === nodeId);
  if (nodeIndex === -1) {
    return;
  }

  const node = ctx.doc.nodes[nodeIndex];
  const nodeType = ctx.normalizedConfig.nodeTypes.get(node.type);
  if (nodeType?.constraints?.allowMove === false) {
    return;
  }

  const updatedNode = { ...ctx.doc.nodes[nodeIndex], position: { ...position } };
  ctx.setDocument(replaceNodeInDocument(ctx.doc, nodeId, updatedNode));

  if (ctx.transactionStack.length === 0) ctx.pushHistory();
  ctx.emitMutation({ type: 'nodeMoved', node: updatedNode });
  ctx.emit({ type: 'documentChanged', doc: ctx.doc });
  ctx.updateDirtyState();
}

export function deleteNodeCommand(ctx: NodeCommandContext, nodeId: string): void {
  const nodeIndex = ctx.doc.nodes.findIndex((n) => n.id === nodeId);
  if (nodeIndex === -1) {
    return;
  }

  const node = ctx.doc.nodes[nodeIndex];
  const nodeType = ctx.normalizedConfig.nodeTypes.get(node.type);

  if (nodeType && !checkMinInstances(ctx.doc, nodeType.constraints, node.type)) {
    return;
  }

  if (ctx.normalizedConfig.hooks?.beforeDelete) {
    try {
      const result = ctx.normalizedConfig.hooks.beforeDelete({ type: 'node', id: nodeId });
      if (result === false) {
        return;
      }
      nodeId = result.id;
    } catch (err) {
      ctx.emit({ type: 'lifecycleHookError', hook: 'beforeDelete', error: String(err) });
      return;
    }
  }

  ctx.setDocument(removeNodeFromDocument(ctx.doc, nodeId));
  ctx.setSelectionState(removeNodeFromSelection(ctx.selectionState, nodeId));

  if (ctx.transactionStack.length === 0) ctx.pushHistory();
  ctx.emitMutation({ type: 'nodeDeleted', nodeId });
  ctx.emit({ type: 'documentChanged', doc: ctx.doc });
  ctx.emit({ type: 'selectionChanged', selection: getSelectionSummary(ctx.selectionState) });
  ctx.updateDirtyState();
}

export function moveNodesCommand(
  ctx: NodeCommandContext,
  deltas: Record<string, { dx: number; dy: number }>,
): void {
  const nextDoc = moveNodesInDocument(ctx.doc, deltas, ctx.normalizedConfig);
  if (!nextDoc) {
    return;
  }

  ctx.setDocument(nextDoc);
  if (ctx.transactionStack.length === 0) ctx.pushHistory();
  ctx.emitMutation({ type: 'nodes:moved' });
  ctx.emit({ type: 'documentChanged', doc: ctx.doc });
  ctx.updateDirtyState();
}

export function updateMultipleNodesCommand(
  ctx: NodeCommandContext,
  updates: Array<{ nodeId: string; data: Partial<GraphNode> }>,
): void {
  const nextDoc = updateMultipleNodesInDocument(ctx.doc, updates);
  if (!nextDoc) {
    return;
  }

  ctx.setDocument(nextDoc);
  if (ctx.transactionStack.length === 0) ctx.pushHistory();
  ctx.emitMutation({ type: 'nodes:updated' });
  ctx.emit({ type: 'documentChanged', doc: ctx.doc });
  ctx.updateDirtyState();
}
