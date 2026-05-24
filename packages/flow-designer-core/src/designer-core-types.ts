import type {
  GraphDocument,
  GraphNode,
  GraphEdge,
  NormalizedDesignerConfig,
  DesignerSnapshot,
  DesignerEvent,
  TreeDocument,
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

  toggleNodeSelection(nodeId: string): void;
  toggleEdgeSelection(edgeId: string): void;
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

  setViewport(viewport: { x: number; y: number; zoom: number }): void;
  replaceDocument(document: GraphDocument, treeDocument?: TreeDocument): void;
  replaceDocumentFromHost(document: GraphDocument, treeDocument?: TreeDocument): void;
  setTreeOwner(getTreeDocument: () => TreeDocument, setTreeDocument: (document: TreeDocument) => void): void;

  save(): void;
  restore(): void;
  exportDocument(): string;
  isDirty(): boolean;

  layoutNodes(positions: Map<string, { x: number; y: number }>): void;

  beginTransaction(label?: string, transactionId?: string): string;
  commitTransaction(transactionId?: string): { ok: boolean; transactionId?: string; reason?: 'unavailable' | 'missing-transaction' };
  rollbackTransaction(transactionId?: string): { ok: boolean; transactionId?: string; reason?: 'unavailable' | 'missing-transaction' };
  isInTransaction(): boolean;
}
