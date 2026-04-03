import type {
  GraphDocument,
  GraphNode,
  GraphEdge,
  DesignerConfig,
  NormalizedDesignerConfig,
  DesignerSnapshot,
  DesignerEvent
} from './types';
import { cloneDocument, cloneNode, generateId } from './core/clone';
import {
  checkMaxInstances,
  checkMinInstances,
  countIncomingEdges,
  countOutgoingEdges,
  EDGE_MISSING_NODE_ERROR,
  EDGE_SELF_LOOP_ERROR,
  validateEdgeConnection,
} from './core/constraints';
import { normalizeConfig } from './core/config';
import {
  normalizeViewport,
  normalizeViewportInput,
  viewportsEqual,
} from './core/viewport';
import {
  canRedoHistory,
  canUndoHistory,
  createHistoryState,
  getCurrentRevision,
  pushHistoryEntry,
  redoHistory,
  undoHistory,
  type DesignerHistoryState,
} from './core/history';
import {
  clearSelectionState,
  createSelectionState,
  getSelectionSummary,
  removeEdgeFromSelection,
  removeNodeFromSelection,
  selectAllNodeIds,
  selectSingleEdge,
  selectSingleNode,
  setSelectionState,
  toggleExistingEdgeSelection,
  toggleNodeSelection as toggleExistingNodeSelection,
  type DesignerSelectionState,
} from './core/selection';
import {
  beginTransactionState,
  commitTransactionState,
  rollbackTransactionState,
  type DesignerTransaction,
} from './core/transactions';
import {
  addNodeToDocument,
  layoutNodesInDocument,
  moveNodesInDocument,
  removeNodeFromDocument,
  replaceNodeInDocument,
  updateMultipleNodesInDocument,
  updateNodeDataInDocument,
} from './core/node-operations';
import {
  addEdgeToDocument,
  removeEdgeFromDocument,
  replaceEdgeInDocument,
  updateEdgeDataInDocument,
} from './core/edge-operations';

export interface DesignerCore {
  getSnapshot(): DesignerSnapshot;
  getDocument(): GraphDocument;
  getConfig(): NormalizedDesignerConfig;

  subscribe(listener: (event: DesignerEvent) => void): () => void;

  addNode(type: string, position: { x: number; y: number }, data?: Record<string, unknown>): GraphNode | null;
  updateNode(nodeId: string, data: Record<string, unknown>): void;
  moveNode(nodeId: string, position: { x: number; y: number }): void;
  duplicateNode(nodeId: string): GraphNode | null;
  deleteNode(nodeId: string): void;

  addEdge(source: string, target: string, data?: Record<string, unknown>): GraphEdge | null;
  reconnectEdge(edgeId: string, source: string, target: string): { ok: boolean; edge?: GraphEdge; error?: string; reason?: string };
  updateEdge(edgeId: string, data: Record<string, unknown>): void;
  deleteEdge(edgeId: string): void;

  selectNode(nodeId: string | null): void;
  selectEdge(edgeId: string | null): void;
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

  setViewport(viewport: { x: number; y: number; zoom: number }): void;

  save(): void;
  restore(): void;
  exportDocument(): string;
  isDirty(): boolean;

  layoutNodes(positions: Map<string, { x: number; y: number }>): void;

  beginTransaction(label?: string, transactionId?: string): string;
  commitTransaction(transactionId?: string): void;
  rollbackTransaction(transactionId?: string): void;
  isInTransaction(): boolean;
}

export function createDesignerCore(initialDoc: GraphDocument, config: DesignerConfig): DesignerCore {
  let doc = cloneDocument(initialDoc);
  const normalizedConfig = normalizeConfig(config);
  const listeners = new Set<(event: DesignerEvent) => void>();

  let historyState: DesignerHistoryState = createHistoryState(doc, 0);
  let savedDoc: GraphDocument | null = cloneDocument(doc);
  let docRevision = 0;
  let savedRevision = 0;
  let clipboard: GraphNode | null = null;

  let selectionState: DesignerSelectionState = createSelectionState();
  let gridEnabled = true;
  let viewport = normalizeViewport(doc.viewport);
  let cachedSelection = getSelectionSummary(selectionState);
  let cachedSnapshot: DesignerSnapshot = {
    doc,
    selection: cachedSelection,
    activeNode: null,
    activeEdge: null,
    canUndo: canUndo(),
    canRedo: canRedo(),
    isDirty: isDirty(),
    gridEnabled,
    viewport,
  };

  let transactionStack: DesignerTransaction[] = [];

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

  function pushHistory() {
    historyState = pushHistoryEntry(historyState, doc, docRevision, maxHistorySize);
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
  }

  function canUndo(): boolean {
    return canUndoHistory(historyState);
  }

  function canRedo(): boolean {
    return canRedoHistory(historyState);
  }

  function getSnapshot(): DesignerSnapshot {
    const selection = getSelectionSummary(selectionState);
    const activeNodeId = selection.activeNodeId;
    const activeEdgeId = selection.activeEdgeId;
    const activeNode = activeNodeId ? doc.nodes.find((n) => n.id === activeNodeId) ?? null : null;
    const activeEdge = activeEdgeId ? doc.edges.find((e) => e.id === activeEdgeId) ?? null : null;
    const nextCanUndo = canUndo();
    const nextCanRedo = canRedo();
    const nextIsDirty = isDirty();

    const selectionUnchanged =
      cachedSelection.activeNodeId === selection.activeNodeId &&
      cachedSelection.activeEdgeId === selection.activeEdgeId &&
      cachedSelection.selectedNodeIds === selection.selectedNodeIds &&
      cachedSelection.selectedEdgeIds === selection.selectedEdgeIds;

    if (
      cachedSnapshot.doc === doc &&
      selectionUnchanged &&
      cachedSnapshot.activeNode === activeNode &&
      cachedSnapshot.activeEdge === activeEdge &&
      cachedSnapshot.canUndo === nextCanUndo &&
      cachedSnapshot.canRedo === nextCanRedo &&
      cachedSnapshot.isDirty === nextIsDirty &&
      cachedSnapshot.gridEnabled === gridEnabled &&
      cachedSnapshot.viewport === viewport
    ) {
      return cachedSnapshot;
    }

    cachedSelection = selection;
    cachedSnapshot = {
      doc,
      selection,
      activeNode,
      activeEdge,
      canUndo: nextCanUndo,
      canRedo: nextCanRedo,
      isDirty: nextIsDirty,
      gridEnabled,
      viewport,
    };

    return cachedSnapshot;
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

  function addNode(type: string, position: { x: number; y: number }, data?: Record<string, unknown>): GraphNode | null {
    if (normalizedConfig.hooks?.beforeCreateNode) {
      try {
        const result = normalizedConfig.hooks.beforeCreateNode({ type, position, data });
        if (result === false) {
          return null;
        }
        type = result.type;
        position = result.position;
        data = result.data;
      } catch (err) {
        emit({ type: 'lifecycleHookError', hook: 'beforeCreateNode', error: String(err) });
        return null;
      }
    }

    const nodeType = normalizedConfig.nodeTypes.get(type);
    if (!nodeType) {
      return null;
    }

    if (!checkMaxInstances(doc, nodeType.constraints, type)) {
      return null;
    }

    const newNode: GraphNode = {
      id: generateId(),
      type,
      position: { ...position },
      data: { ...nodeType.defaults, ...data },
    };

    setDocument(addNodeToDocument(doc, newNode));
    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'nodeAdded', node: newNode });
    emit({ type: 'documentChanged', doc });
    updateDirtyState();

    return newNode;
  }

  function updateNode(nodeId: string, data: Record<string, unknown>): void {
    const updatedNode = updateNodeDataInDocument(doc, nodeId, data);
    if (!updatedNode) {
      return;
    }

    setDocument(replaceNodeInDocument(doc, nodeId, updatedNode));

    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'nodeUpdated', node: updatedNode });
    emit({ type: 'documentChanged', doc });
    updateDirtyState();
  }

  function moveNode(nodeId: string, position: { x: number; y: number }): void {
    const nodeIndex = doc.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) {
      return;
    }

    const node = doc.nodes[nodeIndex];
    const nodeType = normalizedConfig.nodeTypes.get(node.type);
    if (nodeType?.constraints?.allowMove === false) {
      return;
    }

    const updatedNode = { ...doc.nodes[nodeIndex], position: { ...position } };
    setDocument(replaceNodeInDocument(doc, nodeId, updatedNode));

    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'nodeMoved', node: updatedNode });
    emit({ type: 'documentChanged', doc });
    updateDirtyState();
  }

  function duplicateNode(nodeId: string): GraphNode | null {
    const source = doc.nodes.find((n) => n.id === nodeId);
    if (!source) {
      return null;
    }

    const nodeType = normalizedConfig.nodeTypes.get(source.type);

    if (nodeType && !checkMaxInstances(doc, nodeType.constraints, source.type)) {
      return null;
    }

    return addNode(source.type, { x: source.position.x + 48, y: source.position.y + 48 }, source.data);
  }

  function deleteNode(nodeId: string): void {
    const nodeIndex = doc.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) {
      return;
    }

    const node = doc.nodes[nodeIndex];
    const nodeType = normalizedConfig.nodeTypes.get(node.type);

    if (nodeType && !checkMinInstances(doc, nodeType.constraints, node.type)) {
      return;
    }

    if (normalizedConfig.hooks?.beforeDelete) {
      try {
        const result = normalizedConfig.hooks.beforeDelete({ type: 'node', id: nodeId });
        if (result === false) {
          return;
        }
        nodeId = result.id;
      } catch (err) {
        emit({ type: 'lifecycleHookError', hook: 'beforeDelete', error: String(err) });
        return;
      }
    }

    setDocument(removeNodeFromDocument(doc, nodeId));
    selectionState = removeNodeFromSelection(selectionState, nodeId);

    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'nodeDeleted', nodeId });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'selectionChanged', selection: getSelectionSummary(selectionState) });
    updateDirtyState();
  }

  function addEdge(source: string, target: string, data?: Record<string, unknown>): GraphEdge | null {
    const sourceNode = doc.nodes.find((n) => n.id === source);
    const targetNode = doc.nodes.find((n) => n.id === target);

    if (sourceNode) {
      const sourceType = normalizedConfig.nodeTypes.get(sourceNode.type);
      if (sourceType?.constraints?.allowOutgoing === false) {
        return null;
      }
      const maxOut = sourceType?.constraints?.maxOutgoing;
      if (maxOut !== undefined && countOutgoingEdges(doc, source) >= maxOut) {
        return null;
      }
    }

    if (targetNode) {
      const targetType = normalizedConfig.nodeTypes.get(targetNode.type);
      if (targetType?.constraints?.allowIncoming === false) {
        return null;
      }
      const maxIn = targetType?.constraints?.maxIncoming;
      if (maxIn !== undefined && countIncomingEdges(doc, target) >= maxIn) {
        return null;
      }
    }

    if (normalizedConfig.hooks?.beforeConnect) {
      try {
        const result = normalizedConfig.hooks.beforeConnect({ source, target, data });
        if (result === false) {
          return null;
        }
        source = result.source;
        target = result.target;
        data = result.data;
      } catch (err) {
        emit({ type: 'lifecycleHookError', hook: 'beforeConnect', error: String(err) });
        return null;
      }
    }

    const validationError = validateEdgeConnection(doc, normalizedConfig, source, target);
    if (validationError) {
      return null;
    }

    const newEdge: GraphEdge = {
      id: generateId(),
      type: normalizedConfig.rules.defaultEdgeType ?? 'default',
      source,
      target,
      data: { ...data },
    };

    setDocument(addEdgeToDocument(doc, newEdge));
    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'edgeAdded', edge: newEdge });
    emit({ type: 'documentChanged', doc });
    updateDirtyState();

    return newEdge;
  }

  function reconnectEdge(edgeId: string, source: string, target: string): { ok: boolean; edge?: GraphEdge; error?: string; reason?: string } {
    const edgeIndex = doc.edges.findIndex((edge) => edge.id === edgeId);
    if (edgeIndex === -1) {
      return { ok: false, error: `Unknown edge: ${edgeId}`, reason: 'unknown-edge' };
    }

    const currentEdge = doc.edges[edgeIndex];
    const validationError = validateEdgeConnection(doc, normalizedConfig, source, target, edgeId);
    if (validationError) {
      return {
        ok: false,
        error: validationError,
        reason:
          validationError === EDGE_MISSING_NODE_ERROR
            ? 'missing-node'
            : validationError === EDGE_SELF_LOOP_ERROR
            ? 'self-loop'
            : 'duplicate-edge'
      };
    }

    selectionState = selectSingleEdge(selectionState, edgeId);

    if (currentEdge.source === source && currentEdge.target === target) {
      emit({ type: 'selectionChanged', selection: getSelectionSummary(selectionState) });
      return { ok: true, edge: currentEdge, reason: 'unchanged' };
    }

    const updatedEdge = {
      ...currentEdge,
      source,
      target
    };
    setDocument(replaceEdgeInDocument(doc, edgeId, updatedEdge));

    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'edgeUpdated', edge: updatedEdge });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'selectionChanged', selection: getSelectionSummary(selectionState) });
    updateDirtyState();

    return { ok: true, edge: updatedEdge };
  }

  function updateEdge(edgeId: string, data: Record<string, unknown>): void {
    const updatedEdge = updateEdgeDataInDocument(doc, edgeId, data);
    if (!updatedEdge) {
      return;
    }

    setDocument(replaceEdgeInDocument(doc, edgeId, updatedEdge));

    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'edgeUpdated', edge: updatedEdge });
    emit({ type: 'documentChanged', doc });
    updateDirtyState();
  }

  function deleteEdge(edgeId: string): void {
    if (normalizedConfig.hooks?.beforeDelete) {
      try {
        const result = normalizedConfig.hooks.beforeDelete({ type: 'edge', id: edgeId });
        if (result === false) {
          return;
        }
        edgeId = result.id;
      } catch (err) {
        emit({ type: 'lifecycleHookError', hook: 'beforeDelete', error: String(err) });
        return;
      }
    }

    const edgeIndex = doc.edges.findIndex((e) => e.id === edgeId);
    if (edgeIndex === -1) {
      return;
    }

    setDocument(removeEdgeFromDocument(doc, edgeId));
    selectionState = removeEdgeFromSelection(selectionState, edgeId);

    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'edgeDeleted', edgeId });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'selectionChanged', selection: getSelectionSummary(selectionState) });
    updateDirtyState();
  }

  function selectNode(nodeId: string | null): void {
    const nextSelection = selectSingleNode(selectionState, nodeId);
    if (nextSelection === selectionState) {
      return;
    }

    selectionState = nextSelection;
    emit({ type: 'selectionChanged', selection: getSelectionSummary(selectionState) });
  }

  function selectEdge(edgeId: string | null): void {
    const nextSelection = selectSingleEdge(selectionState, edgeId);
    if (nextSelection === selectionState) {
      return;
    }

    selectionState = nextSelection;
    emit({ type: 'selectionChanged', selection: getSelectionSummary(selectionState) });
  }

  function clearSelection(): void {
    const nextSelection = clearSelectionState(selectionState);
    if (nextSelection === selectionState) {
      return;
    }

    selectionState = nextSelection;
    emit({ type: 'selectionChanged', selection: getSelectionSummary(selectionState) });
  }

  function toggleNodeSelection(nodeId: string): void {
    selectionState = toggleExistingNodeSelection(selectionState, nodeId);
    emit({ type: 'selectionChanged', selection: getSelectionSummary(selectionState) });
  }

  function toggleEdgeSelection(edgeId: string): void {
    selectionState = toggleExistingEdgeSelection(selectionState, edgeId);
    emit({ type: 'selectionChanged', selection: getSelectionSummary(selectionState) });
  }

  function selectAllNodes(): void {
    selectionState = selectAllNodeIds(selectionState, doc.nodes.map((node) => node.id));
    emit({ type: 'selectionChanged', selection: getSelectionSummary(selectionState) });
  }

  function setSelection(nodeIds: string[], edgeIds: string[]): void {
    selectionState = setSelectionState(selectionState, nodeIds, edgeIds);
    emit({ type: 'selectionChanged', selection: getSelectionSummary(selectionState) });
  }

  function moveNodes(deltas: Record<string, { dx: number; dy: number }>): void {
    const nextDoc = moveNodesInDocument(doc, deltas, normalizedConfig);
    if (!nextDoc) {
      return;
    }

    setDocument(nextDoc);
    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'nodes:moved' });
    emit({ type: 'documentChanged', doc });
    updateDirtyState();
  }

  function updateMultipleNodes(updates: Array<{ nodeId: string; data: Partial<GraphNode> }>): void {
    const nextDoc = updateMultipleNodesInDocument(doc, updates);
    if (!nextDoc) {
      return;
    }

    setDocument(nextDoc);
    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'nodes:updated' });
    emit({ type: 'documentChanged', doc });
    updateDirtyState();
  }

  function undo(): void {
    const result = undoHistory(historyState);
    if (!result) {
      return;
    }

    historyState = result.state;
    replaceDocument(cloneDocument(result.entry.doc), result.entry.revision);
    viewport = normalizeViewport(doc.viewport);
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'viewportChanged', viewport });
    updateDirtyState();
  }

  function redo(): void {
    const result = redoHistory(historyState);
    if (!result) {
      return;
    }

    historyState = result.state;
    replaceDocument(cloneDocument(result.entry.doc), result.entry.revision);
    viewport = normalizeViewport(doc.viewport);
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'viewportChanged', viewport });
    updateDirtyState();
  }

  function copySelection(): void {
    const activeNodeId = selectionState.selectedNodeIds[0] ?? null;
    if (!activeNodeId) {
      return;
    }

    const node = doc.nodes.find((n) => n.id === activeNodeId);
    if (node) {
      clipboard = cloneNode(node);
    }
  }

  function pasteClipboard(): void {
    if (!clipboard) {
      return;
    }

    addNode(clipboard.type, { x: clipboard.position.x + 48, y: clipboard.position.y + 48 }, clipboard.data);
  }

  function toggleGrid(): void {
    gridEnabled = !gridEnabled;
    emit({ type: 'gridToggled', enabled: gridEnabled });
  }

  function setGrid(enabled: boolean): void {
    if (gridEnabled === enabled) {
      return;
    }

    gridEnabled = enabled;
    emit({ type: 'gridToggled', enabled: gridEnabled });
  }

  function setViewport(newViewport: { x: number; y: number; zoom: number }): void {
    const normalizedViewport = normalizeViewportInput(newViewport);
    if (viewportsEqual(viewport, normalizedViewport)) {
      return;
    }

    viewport = normalizedViewport;
    setDocument({ ...doc, viewport });
    if (transactionStack.length === 0) pushHistory();
    emit({ type: 'viewportChanged', viewport });
    emit({ type: 'documentChanged', doc });
    updateDirtyState();
  }

  function save(): void {
    savedDoc = cloneDocument(doc);
    savedRevision = docRevision;
    emit({ type: 'dirtyChanged', isDirty: false });
  }

  function restore(): void {
    if (!savedDoc) {
      return;
    }

    replaceDocument(cloneDocument(savedDoc), savedRevision);
    viewport = normalizeViewport(doc.viewport);
    if (transactionStack.length === 0) pushHistory();
    emit({ type: 'documentChanged', doc });
    emit({ type: 'dirtyChanged', isDirty: false });
    emit({ type: 'viewportChanged', viewport });
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
    viewport = normalizeViewport(doc.viewport);
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
    selectNode,
    selectEdge,
    clearSelection,
    toggleNodeSelection,
    toggleEdgeSelection,
    selectAllNodes,
    setSelection,
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
    setViewport,
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
