import type {
  GraphNode,
  GraphEdge,
  GraphDocument,
  NormalizedDesignerConfig,
} from '../types.js';
import {
  addNodeCommand,
  updateNodeCommand,
  moveNodeCommand,
  deleteNodeCommand,
  moveNodesCommand,
  updateMultipleNodesCommand,
  type NodeCommandContext,
} from '../core-node-commands.js';
import {
  addEdgeCommand,
  reconnectEdgeCommand,
  updateEdgeCommand,
  deleteEdgeCommand,
  type EdgeCommandContext,
} from '../core-edge-commands.js';
import type { DesignerSelectionState } from './selection.js';

export interface GraphCommandGateContext {
  isTreeMode: boolean;
  rejectTreeMutation(method: string): void;
  assertReadonly(methodName: string): boolean;
  buildNodeCtx(): NodeCommandContext;
  buildEdgeCtx(): EdgeCommandContext;
  getDoc(): GraphDocument;
  normalizedConfig: NormalizedDesignerConfig;
  getSelectionState(): DesignerSelectionState;
  addNodeFn(
    type: string,
    position: { x: number; y: number },
    data?: Record<string, unknown>,
  ): GraphNode | null;
}

export interface GraphCommandGateSurface {
  addNode(
    type: string,
    position: { x: number; y: number },
    data?: Record<string, unknown>,
  ): GraphNode | null;
  updateNode(nodeId: string, data: Record<string, unknown>): void;
  moveNode(nodeId: string, position: { x: number; y: number }): void;
  duplicateNode(nodeId: string): GraphNode | null;
  deleteNode(nodeId: string): void;
  addEdge(
    source: string,
    target: string,
    data?: Record<string, unknown>,
    sourcePort?: string,
    targetPort?: string,
  ): GraphEdge | null;
  reconnectEdge(
    edgeId: string,
    source: string,
    target: string,
    sourcePort?: string,
    targetPort?: string,
  ): { ok: boolean; edge?: GraphEdge; error?: string; reason?: string };
  updateEdge(edgeId: string, data: Record<string, unknown>): void;
  deleteEdge(edgeId: string): void;
  moveNodes(deltas: Record<string, { dx: number; dy: number }>): void;
  updateMultipleNodes(updates: Array<{ nodeId: string; data: Partial<GraphNode> }>): void;
}

export function createGraphCommandGate(ctx: GraphCommandGateContext): GraphCommandGateSurface {
  function addNode(
    type: string,
    position: { x: number; y: number },
    data?: Record<string, unknown>,
  ): GraphNode | null {
    if (ctx.isTreeMode) {
      ctx.rejectTreeMutation('addNode');
      return null;
    }
    if (ctx.assertReadonly('addNode')) return null;
    return addNodeCommand(ctx.buildNodeCtx(), type, position, data);
  }

  function updateNode(nodeId: string, data: Record<string, unknown>): void {
    if (ctx.isTreeMode) {
      ctx.rejectTreeMutation('updateNode');
      return;
    }
    if (ctx.assertReadonly('updateNode')) return;
    updateNodeCommand(ctx.buildNodeCtx(), nodeId, data);
  }

  function moveNode(nodeId: string, position: { x: number; y: number }): void {
    if (ctx.isTreeMode) {
      ctx.rejectTreeMutation('moveNode');
      return;
    }
    if (ctx.assertReadonly('moveNode')) return;
    moveNodeCommand(ctx.buildNodeCtx(), nodeId, position);
  }

  function checkMaxInstancesLocal(type: string): boolean {
    const nodeType = ctx.normalizedConfig.nodeTypes.get(type);
    if (!nodeType) return true;
    const max = nodeType.constraints?.maxInstances;
    if (max === undefined) return true;
    return ctx.getDoc().nodes.filter((node) => node.type === type).length < Number(max);
  }

  function duplicateNode(nodeId: string): GraphNode | null {
    if (ctx.isTreeMode) {
      ctx.rejectTreeMutation('duplicateNode');
      return null;
    }
    if (ctx.assertReadonly('duplicateNode')) return null;
    const source = ctx.getDoc().nodes.find((node) => node.id === nodeId);
    if (!source) {
      return null;
    }

    const nodeType = ctx.normalizedConfig.nodeTypes.get(source.type);

    if (nodeType && !checkMaxInstancesLocal(source.type)) {
      return null;
    }

    return addNode(
      source.type,
      { x: source.position.x + 48, y: source.position.y + 48 },
      source.data,
    );
  }

  function deleteNode(nodeId: string): void {
    if (ctx.isTreeMode) {
      ctx.rejectTreeMutation('deleteNode');
      return;
    }
    if (ctx.assertReadonly('deleteNode')) return;
    deleteNodeCommand(ctx.buildNodeCtx(), nodeId);
  }

  function addEdge(
    source: string,
    target: string,
    data?: Record<string, unknown>,
    sourcePort?: string,
    targetPort?: string,
  ): GraphEdge | null {
    if (ctx.isTreeMode) {
      ctx.rejectTreeMutation('addEdge');
      return null;
    }
    if (ctx.assertReadonly('addEdge')) return null;
    return addEdgeCommand(ctx.buildEdgeCtx(), source, target, data, sourcePort, targetPort);
  }

  function reconnectEdge(
    edgeId: string,
    source: string,
    target: string,
    sourcePort?: string,
    targetPort?: string,
  ): { ok: boolean; edge?: GraphEdge; error?: string; reason?: string } {
    if (ctx.isTreeMode) {
      ctx.rejectTreeMutation('reconnectEdge');
      return { ok: false, reason: 'unavailable' };
    }
    if (ctx.assertReadonly('reconnectEdge')) return { ok: false, error: 'Document is readonly' };
    return reconnectEdgeCommand(ctx.buildEdgeCtx(), edgeId, source, target, sourcePort, targetPort);
  }

  function updateEdge(edgeId: string, data: Record<string, unknown>): void {
    if (ctx.isTreeMode) {
      ctx.rejectTreeMutation('updateEdge');
      return;
    }
    if (ctx.assertReadonly('updateEdge')) return;
    updateEdgeCommand(ctx.buildEdgeCtx(), edgeId, data);
  }

  function deleteEdge(edgeId: string): void {
    if (ctx.isTreeMode) {
      ctx.rejectTreeMutation('deleteEdge');
      return;
    }
    if (ctx.assertReadonly('deleteEdge')) return;
    deleteEdgeCommand(ctx.buildEdgeCtx(), edgeId);
  }

  function moveNodes(deltas: Record<string, { dx: number; dy: number }>): void {
    if (ctx.isTreeMode) {
      ctx.rejectTreeMutation('moveNodes');
      return;
    }
    if (ctx.assertReadonly('moveNodes')) return;
    moveNodesCommand(ctx.buildNodeCtx(), deltas);
  }

  function updateMultipleNodes(updates: Array<{ nodeId: string; data: Partial<GraphNode> }>): void {
    if (ctx.isTreeMode) {
      ctx.rejectTreeMutation('updateMultipleNodes');
      return;
    }
    if (ctx.assertReadonly('updateMultipleNodes')) return;
    updateMultipleNodesCommand(ctx.buildNodeCtx(), updates);
  }

  return {
    addNode,
    updateNode,
    moveNode,
    duplicateNode,
    deleteNode,
    addEdge,
    reconnectEdge,
    updateEdge,
    deleteEdge,
    moveNodes,
    updateMultipleNodes,
  };
}
