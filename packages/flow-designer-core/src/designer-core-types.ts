import type {
  GraphDocument,
  GraphNode,
  GraphEdge,
  NormalizedDesignerConfig,
  DesignerSnapshot,
  DesignerEvent,
  TreeDocument,
  TreeHostReplacementResult,
  TreeCommandResult,
} from './types.js';

export interface DesignerCore {
  getSnapshot(): DesignerSnapshot;
  getDocument(): GraphDocument;
  getConfig(): NormalizedDesignerConfig;

  subscribe(listener: (event: DesignerEvent) => void): () => void;

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

  selectNode(nodeId: string | null): void;
  selectEdge(edgeId: string | null): void;
  selectBranch(ownerNodeId: string, branchId: string | null): void;
  clearSelection(): void;

  toggleNodeSelection(nodeId: string): { ok: true } | { ok: false; reason: 'missing-node' };
  toggleEdgeSelection(edgeId: string): { ok: true } | { ok: false; reason: 'missing-edge' };
  selectAllNodes(): void;
  setSelection(nodeIds: string[], edgeIds: string[]): void;
  moveNodes(deltas: Record<string, { dx: number; dy: number }>): void;
  updateMultipleNodes(updates: Array<{ nodeId: string; data: Partial<GraphNode> }>): void;

  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;

  copySelection(): void;
  pasteClipboard(): void;

  toggleGrid(): void;
  setGrid(enabled: boolean): void;

  togglePalette(): void;
  setPaletteCollapsed(collapsed: boolean): void;
  toggleInspector(): void;
  setInspectorCollapsed(collapsed: boolean): void;

  setPaletteWidth(width: number): void;
  setInspectorWidth(width: number): void;

  setViewport(viewport: { x: number; y: number; zoom: number }): void;
  replaceDocument(document: GraphDocument): void;
  replaceDocumentFromHost(document: GraphDocument): void;

  save(): void;
  restore(): void;
  exportDocument(): string;
  isDirty(): boolean;

  layoutNodes(positions: Map<string, { x: number; y: number }>): void;

  beginTransaction(label?: string, transactionId?: string): string;
  commitTransaction(transactionId?: string): { ok: boolean; transactionId?: string; reason?: 'unavailable' | 'missing-transaction' };
  rollbackTransaction(transactionId?: string): { ok: boolean; transactionId?: string; reason?: 'unavailable' | 'missing-transaction' };
  isInTransaction(): boolean;

  // Tree session surface (tree mode only).
  getTreeDocument(): TreeDocument | undefined;
  getAcceptedHostEpoch(): number;
  replaceTreeFromHost(tree: TreeDocument, epoch?: number): TreeHostReplacementResult;
  relayoutTree(): TreeCommandResult;
  insertChainNode(sourceId: string, nodeType: string, data?: Record<string, unknown>): TreeCommandResult;
  insertChainNodeAtMerge(targetId: string, nodeType: string, data?: Record<string, unknown>): TreeCommandResult;
  insertBranchPair(sourceId: string, condNodeType: string, condData?: Record<string, unknown>): TreeCommandResult;
  addBranch(nodeId: string, branchData?: Record<string, unknown>, childType?: string, childData?: Record<string, unknown>): TreeCommandResult;
  deleteBranch(nodeId: string, branchId: string): TreeCommandResult;
  moveBranch(nodeId: string, branchId: string, direction: 'left' | 'right'): TreeCommandResult;
  deleteTreeNode(nodeId: string): TreeCommandResult;
  updateTreeNodeData(nodeId: string, data: Record<string, unknown>): TreeCommandResult;
  updateBranchData(nodeId: string, branchId: string, data: Record<string, unknown>): TreeCommandResult;
  insertBranchChild(ownerId: string, branchId: string, nodeType: string, data?: Record<string, unknown>): TreeCommandResult;
}
