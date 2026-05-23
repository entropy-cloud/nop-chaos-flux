import type {
  GraphDocument,
  GraphNode,
  GraphEdge,
  DesignerConfig,
  NormalizedDesignerConfig,
  DesignerSnapshot,
  DesignerEvent,
  TreeDocument,
} from './types.js';
import type { DesignerCore } from './designer-core-types.js';
import { cloneDocument } from './core/clone.js';
import { normalizeConfig } from './core/config.js';
import {
  canRedoHistory,
  canUndoHistory,
  createHistoryState,
  getCurrentRevision,
  pushHistoryEntry,
  redoHistory,
  undoHistory,
  type DesignerHistoryState,
} from './core/history.js';
import { createSelectionState, type DesignerSelectionState } from './core/selection.js';
import { createSelectionController } from './core/selection-controller.js';
import {
  beginTransactionState,
  commitTransactionState,
  rollbackTransactionState,
  type DesignerTransaction,
} from './core/transactions.js';
import { createDesignerShellState, resetShellViewportFromDocument } from './core/shell-state.js';
import { createShellControls } from './core/shell-controls.js';
import { createDesignerSnapshotCache, getDesignerSnapshot } from './core/snapshot.js';
import { layoutNodesInDocument } from './core/node-operations.js';
import {
  addNodeCommand,
  updateNodeCommand,
  moveNodeCommand,
  deleteNodeCommand,
  moveNodesCommand,
  updateMultipleNodesCommand,
  type NodeCommandContext,
} from './core-node-commands.js';
import {
  addEdgeCommand,
  reconnectEdgeCommand,
  updateEdgeCommand,
  deleteEdgeCommand,
  type EdgeCommandContext,
} from './core-edge-commands.js';
export function createDesignerCore(
  initialDoc: GraphDocument,
  config: DesignerConfig,
): DesignerCore {
  function cloneTreeDocument(tree: TreeDocument | undefined): TreeDocument | undefined {
    return tree ? (JSON.parse(JSON.stringify(tree)) as TreeDocument) : undefined;
  }

  let doc = cloneDocument(initialDoc);
  const normalizedConfig = normalizeConfig(config);
  let treeOwner:
    | { getTreeDocument: () => TreeDocument; setTreeDocument: (document: TreeDocument) => void }
    | undefined;
  const listeners = new Set<(event: DesignerEvent) => void>();

  let historyState: DesignerHistoryState = createHistoryState(doc, 0);
  let savedDoc: GraphDocument | null = cloneDocument(doc);
  let savedTreeDocument: TreeDocument | undefined;
  let docRevision = 0;
  let savedRevision = 0;

  let selectionState: DesignerSelectionState = createSelectionState();
  const shellState = createDesignerShellState(doc);
  const snapshotCache = createDesignerSnapshotCache({
    doc,
    selectionState,
    shell: shellState,
    canUndo: canUndo(),
    canRedo: canRedo(),
    isDirty: isDirty(),
  });

  let transactionStack: DesignerTransaction[] = [];
  const selectionController = createSelectionController({
    getSelectionState: () => selectionState,
    setSelectionState: (next) => {
      selectionState = next;
    },
    getAllNodeIds: () => doc.nodes.map((node) => node.id),
    emit,
  });

  const maxHistorySize = 50;

  function emit(event: DesignerEvent) {
    for (const listener of listeners) {
      listener(event);
    }
  }

  function emitMutation(event: DesignerEvent) {
    emit(event);
    normalizedConfig.hooks?.afterCommand?.(event);
  }
  function updateDirtyState() {
    emit({ type: 'dirtyChanged', isDirty: isDirty() });
  }

  function setDocument(nextDoc: GraphDocument) {
    if (nextDoc === doc) {
      return false;
    }

    doc = nextDoc;
    docRevision += 1;
    return true;
  }
  function replaceDocument(nextDoc: GraphDocument, revision: number) {
    doc = nextDoc;
    docRevision = revision;
  }

  function replaceHistoryBaseline(nextDoc: GraphDocument) {
    historyState = createHistoryState(nextDoc, docRevision, treeOwner?.getTreeDocument());
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
  }

  function markHostDocumentSaved(nextDoc: GraphDocument) {
    savedDoc = cloneDocument(nextDoc);
    savedTreeDocument = cloneTreeDocument(treeOwner?.getTreeDocument());
    savedRevision = docRevision;
  }

  function pushHistory() {
    historyState = pushHistoryEntry(
      historyState,
      doc,
      docRevision,
      maxHistorySize,
      treeOwner?.getTreeDocument(),
    );
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
  }

  function canUndo(): boolean {
    return canUndoHistory(historyState);
  }

  function canRedo(): boolean {
    return canRedoHistory(historyState);
  }
  function getSnapshot(): DesignerSnapshot {
    return getDesignerSnapshot({
      cache: snapshotCache,
      doc,
      selectionState,
      shell: shellState,
      canUndo: canUndo(),
      canRedo: canRedo(),
      isDirty: isDirty(),
    });
  }

  function getDocument(): GraphDocument {
    return doc;
  }

  function getConfig(): NormalizedDesignerConfig {
    return normalizedConfig;
  }

  function subscribe(listener: (event: DesignerEvent) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function buildNodeCtx(): NodeCommandContext {
    return {
      get doc() {
        return doc;
      },
      normalizedConfig,
      get selectionState() {
        return selectionState;
      },
      get transactionStack() {
        return transactionStack;
      },
      setDocument,
      pushHistory,
      emitMutation,
      emit,
      updateDirtyState,
      setSelectionState: (s) => {
        selectionState = s;
      },
      addNodeFn: addNode,
    };
  }

  function buildEdgeCtx(): EdgeCommandContext {
    return {
      get doc() {
        return doc;
      },
      normalizedConfig,
      get selectionState() {
        return selectionState;
      },
      get transactionStack() {
        return transactionStack;
      },
      setDocument,
      pushHistory,
      emitMutation,
      emit,
      updateDirtyState,
      setSelectionState: (s) => {
        selectionState = s;
      },
    };
  }

  const shellControls = createShellControls({
    getDocument,
    setDocument,
    pushHistory,
    replaceHistory: replaceHistoryBaseline,
    markHostDocumentSaved,
    emit,
    updateDirtyState,
    shellState,
    getTransactionDepth: () => transactionStack.length,
  });

  function addNode(
    type: string,
    position: { x: number; y: number },
    data?: Record<string, unknown>,
  ): GraphNode | null {
    return addNodeCommand(buildNodeCtx(), type, position, data);
  }

  function updateNode(nodeId: string, data: Record<string, unknown>): void {
    updateNodeCommand(buildNodeCtx(), nodeId, data);
  }

  function moveNode(nodeId: string, position: { x: number; y: number }): void {
    moveNodeCommand(buildNodeCtx(), nodeId, position);
  }

  function duplicateNode(nodeId: string): GraphNode | null {
    const source = doc.nodes.find((n) => n.id === nodeId);
    if (!source) {
      return null;
    }

    const nodeType = normalizedConfig.nodeTypes.get(source.type);

    if (nodeType && !checkMaxInstancesLocal(source.type)) {
      return null;
    }

    return addNode(
      source.type,
      { x: source.position.x + 48, y: source.position.y + 48 },
      source.data,
    );
  }

  function checkMaxInstancesLocal(type: string): boolean {
    const nodeType = normalizedConfig.nodeTypes.get(type);
    if (!nodeType) return true;
    const max = nodeType.constraints?.maxInstances;
    if (max === undefined) return true;
    return doc.nodes.filter((n) => n.type === type).length < Number(max);
  }

  function deleteNode(nodeId: string): void {
    deleteNodeCommand(buildNodeCtx(), nodeId);
  }

  function addEdge(
    source: string,
    target: string,
    data?: Record<string, unknown>,
    sourcePort?: string,
    targetPort?: string,
  ): GraphEdge | null {
    return addEdgeCommand(buildEdgeCtx(), source, target, data, sourcePort, targetPort);
  }

  function reconnectEdge(
    edgeId: string,
    source: string,
    target: string,
    sourcePort?: string,
    targetPort?: string,
  ): { ok: boolean; edge?: GraphEdge; error?: string; reason?: string } {
    return reconnectEdgeCommand(buildEdgeCtx(), edgeId, source, target, sourcePort, targetPort);
  }

  function updateEdge(edgeId: string, data: Record<string, unknown>): void {
    updateEdgeCommand(buildEdgeCtx(), edgeId, data);
  }

  function deleteEdge(edgeId: string): void {
    deleteEdgeCommand(buildEdgeCtx(), edgeId);
  }

  function selectBranch(ownerNodeId: string, branchId: string | null): void {
    selectionController.selectBranch(ownerNodeId, branchId);
  }

  function moveNodes(deltas: Record<string, { dx: number; dy: number }>): void {
    moveNodesCommand(buildNodeCtx(), deltas);
  }

  function updateMultipleNodes(updates: Array<{ nodeId: string; data: Partial<GraphNode> }>): void {
    updateMultipleNodesCommand(buildNodeCtx(), updates);
  }

  function undo(): void {
    const result = undoHistory(historyState);
    if (!result) {
      return;
    }

    historyState = result.state;
    replaceDocument(cloneDocument(result.entry.doc), result.entry.revision);
    if (treeOwner && result.entry.treeDocument) {
      treeOwner.setTreeDocument(result.entry.treeDocument);
    }
    resetShellViewportFromDocument(shellState, doc);
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'viewportChanged', viewport: shellState.viewport });
    updateDirtyState();
  }

  function redo(): void {
    const result = redoHistory(historyState);
    if (!result) {
      return;
    }

    historyState = result.state;
    replaceDocument(cloneDocument(result.entry.doc), result.entry.revision);
    if (treeOwner && result.entry.treeDocument) {
      treeOwner.setTreeDocument(result.entry.treeDocument);
    }
    resetShellViewportFromDocument(shellState, doc);
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'viewportChanged', viewport: shellState.viewport });
    updateDirtyState();
  }

  function copySelection(): void {
    shellControls.copySelection(selectionState.selectedNodeIds[0] ?? null);
  }

  function pasteClipboard(): void {
    shellControls.pasteClipboard(addNode);
  }

  function toggleGrid(): void {
    shellControls.toggleGrid();
  }

  function setGrid(enabled: boolean): void {
    shellControls.setGrid(enabled);
  }

  function togglePalette(): void {
    shellControls.togglePalette();
  }

  function setPaletteCollapsed(collapsed: boolean): void {
    shellControls.setPaletteCollapsed(collapsed);
  }

  function toggleInspector(): void {
    shellControls.toggleInspector();
  }

  function setInspectorCollapsed(collapsed: boolean): void {
    shellControls.setInspectorCollapsed(collapsed);
  }

  function setViewport(newViewport: { x: number; y: number; zoom: number }): void {
    shellControls.setViewport(newViewport);
  }

  function replaceDocumentFromHost(nextDoc: GraphDocument, treeDocument?: TreeDocument): void {
    if (treeOwner && treeDocument) {
      treeOwner.setTreeDocument(treeDocument);
    }
    shellControls.replaceDocumentFromHost(nextDoc);
  }

  function replaceDocumentWithHistory(nextDoc: GraphDocument, treeDocument?: TreeDocument): void {
    if (!setDocument(cloneDocument(nextDoc))) {
      return;
    }

    if (treeOwner && treeDocument) {
      treeOwner.setTreeDocument(treeDocument);
    }

    if (transactionStack.length === 0) {
      pushHistory();
    }
    resetShellViewportFromDocument(shellState, doc);
    emit({ type: 'documentChanged', doc });
    emit({ type: 'viewportChanged', viewport: shellState.viewport });
    updateDirtyState();
  }

  function setTreeOwner(
    getTreeDocument: () => TreeDocument,
    setTreeDocument: (document: TreeDocument) => void,
  ): void {
    const hadTreeOwner = Boolean(treeOwner);
    treeOwner = { getTreeDocument, setTreeDocument };
    if (!hadTreeOwner) {
      historyState = createHistoryState(doc, docRevision, treeOwner.getTreeDocument());
      savedTreeDocument = cloneTreeDocument(treeOwner.getTreeDocument());
    }
  }

  function save(): void {
    savedDoc = cloneDocument(doc);
    savedTreeDocument = cloneTreeDocument(treeOwner?.getTreeDocument());
    savedRevision = docRevision;
    emit({ type: 'dirtyChanged', isDirty: false });
  }

  function restore(): void {
    if (!savedDoc) {
      return;
    }

    replaceDocument(cloneDocument(savedDoc), savedRevision);
    if (treeOwner && savedTreeDocument) {
      treeOwner.setTreeDocument(cloneTreeDocument(savedTreeDocument)!);
    }
    resetShellViewportFromDocument(shellState, doc);
    if (transactionStack.length === 0) pushHistory();
    emit({ type: 'documentChanged', doc });
    emit({ type: 'dirtyChanged', isDirty: false });
    emit({ type: 'viewportChanged', viewport: shellState.viewport });
  }

  function exportDocument(): string {
    return JSON.stringify(doc, null, 2);
  }

  function isDirty(): boolean {
    return savedDoc !== null && docRevision !== savedRevision;
  }

  function layoutNodes(positions: Map<string, { x: number; y: number }>): void {
    const nextDoc = layoutNodesInDocument(doc, positions);
    if (!nextDoc) {
      return;
    }

    setDocument(nextDoc);
    if (transactionStack.length === 0) {
      pushHistory();
    }
    emit({ type: 'documentChanged', doc });
    updateDirtyState();
  }

  function isInTransaction(): boolean {
    return transactionStack.length > 0;
  }

  function beginTransaction(label?: string, transactionId?: string): string {
    const nextState = beginTransactionState(transactionStack, doc, label, transactionId);
    transactionStack = nextState.stack;
    const { id } = nextState;
    emit({ type: 'transactionStarted', transactionId: id, label });
    return id;
  }

  function commitTransaction(transactionId?: string): void {
    const result = commitTransactionState(transactionStack, transactionId);
    if (!result?.committedId) {
      return;
    }

    transactionStack = result.stack;
    if (result.shouldPushHistory) {
      pushHistory();
    }
    emit({ type: 'transactionCommitted', transactionId: result.committedId });
  }

  function rollbackTransaction(transactionId?: string): void {
    const result = rollbackTransactionState(transactionStack, transactionId);
    if (!result) {
      return;
    }

    transactionStack = result.stack;
    replaceDocument(result.snapshotBefore, getCurrentRevision(historyState) ?? docRevision);
    resetShellViewportFromDocument(shellState, doc);
    for (const rolledBackId of result.rolledBackIds) {
      emit({ type: 'transactionRolledBack', transactionId: rolledBackId });
    }

    emit({ type: 'documentChanged', doc });
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
    updateDirtyState();
  }

  return {
    getSnapshot,
    getDocument,
    getConfig,
    subscribe,
    addNode,
    updateNode,
    moveNode,
    duplicateNode,
    deleteNode,
    addEdge,
    reconnectEdge,
    updateEdge,
    deleteEdge,
    selectNode: selectionController.selectNode,
    selectEdge: selectionController.selectEdge,
    selectBranch,
    clearSelection: selectionController.clearSelection,
    toggleNodeSelection: selectionController.toggleNodeSelection,
    toggleEdgeSelection: selectionController.toggleEdgeSelection,
    selectAllNodes: selectionController.selectAllNodes,
    setSelection: selectionController.setSelection,
    moveNodes,
    updateMultipleNodes,
    undo,
    redo,
    canUndo,
    canRedo,
    copySelection,
    pasteClipboard,
    toggleGrid,
    setGrid,
    togglePalette,
    setPaletteCollapsed,
    toggleInspector,
    setInspectorCollapsed,
    setViewport,
    replaceDocument: replaceDocumentWithHistory,
    replaceDocumentFromHost,
    setTreeOwner,
    save,
    restore,
    exportDocument,
    isDirty,
    layoutNodes,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    isInTransaction,
  };
}
