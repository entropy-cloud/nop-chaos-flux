import type { DesignerSnapshot, GraphEdge, GraphNode } from '@nop-chaos/flow-designer-core';

export type DesignerCommandReason =
  | 'constraint'
  | 'missing-transaction'
  | 'duplicate-edge'
  | 'missing-edge'
  | 'missing-node'
  | 'missing-selection-target'
  | 'self-loop'
  | 'unchanged'
  | 'unknown-node-type'
  | 'unavailable';

export type DesignerCommand =
  | {
      type: 'addEdge';
      source: string;
      target: string;
      sourcePort?: string;
      targetPort?: string;
      data?: Record<string, unknown>;
    }
  | {
      type: 'addNode';
      nodeType: string;
      position?: { x: number; y: number };
      data?: Record<string, unknown>;
    }
  | { type: 'clearSelection' }
  | { type: 'deleteEdge'; edgeId: string }
  | { type: 'deleteNode'; nodeId: string }
  | { type: 'duplicateNode'; nodeId: string }
  | {
      type: 'addBranch';
      nodeId: string;
      branchData?: Record<string, unknown>;
      childType?: string;
      childData?: Record<string, unknown>;
    }
  | { type: 'deleteBranch'; nodeId: string; branchId: string }
  | { type: 'moveBranch'; nodeId: string; branchId: string; direction: 'left' | 'right' }
  | { type: 'copySelection' }
  | { type: 'pasteClipboard' }
  | { type: 'deleteSelection' }
  | { type: 'export' }
  | { type: 'moveNode'; nodeId: string; position: { x: number; y: number } }
  | {
      type: 'reconnectEdge';
      edgeId: string;
      source: string;
      target: string;
      sourcePort?: string;
      targetPort?: string;
    }
  | { type: 'redo' }
  | { type: 'restore' }
  | { type: 'save' }
  | { type: 'selectBranch'; nodeId: string; branchId: string | null }
  | { type: 'selectEdge'; edgeId: string | null }
  | { type: 'selectNode'; nodeId: string | null }
  | { type: 'setViewport'; viewport: { x: number; y: number; zoom: number } }
  | { type: 'toggleGrid' }
  | { type: 'togglePalette' }
  | { type: 'toggleInspector' }
  | { type: 'undo' }
  | { type: 'updateEdgeData'; edgeId: string; data: Record<string, unknown> }
  | { type: 'updateNodeData'; nodeId: string; data: Record<string, unknown> }
  | { type: 'updateBranchData'; nodeId: string; branchId: string; data: Record<string, unknown> }
  | { type: 'insertChainNode'; sourceId: string; nodeType: string; data?: Record<string, unknown> }
  | {
      type: 'insertChainNodeAtMerge';
      targetId: string;
      nodeType: string;
      data?: Record<string, unknown>;
    }
  | {
      type: 'insertBranchPair';
      sourceId: string;
      condNodeType: string;
      condData?: Record<string, unknown>;
    };

export interface DesignerCommandResult {
  ok: boolean;
  snapshot: DesignerSnapshot;
  data?: unknown;
  error?: unknown;
  exported?: string;
  reason?: DesignerCommandReason;
}

export interface DesignerCommandAdapter {
  execute(command: DesignerCommand): DesignerCommandResult;
  getSnapshot(): DesignerSnapshot;
}

export type { GraphEdge, GraphNode };
