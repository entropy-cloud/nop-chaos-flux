import type {
  GraphDocument,
  GraphNode,
  GraphEdge,
  DesignerConfig,
  NormalizedDesignerConfig,
  DesignerSnapshot,
  SelectionSummary,
  DesignerEvent,
  NodeTypeConfig,
  NodeConstraintConfig,
  NodePermissionConfig
} from './types';

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

interface HistoryEntry {
  doc: GraphDocument;
}

const EDGE_SELF_LOOP_ERROR = 'Self-loop edges are not supported in the playground example.';
const EDGE_MISSING_NODE_ERROR = 'Edges must connect existing nodes.';
const EDGE_DUPLICATE_ERROR = 'Duplicate edges are not supported in the playground example.';

function normalizeViewport(viewport: GraphDocument['viewport']) {
  return viewport ? { ...viewport } : { x: 0, y: 0, zoom: 1 };
}

function clampZoom(zoom: number) {
  return Math.max(0.1, Math.min(4, Number(zoom.toFixed(1))));
}

function normalizeViewportInput(viewport: { x: number; y: number; zoom: number }) {
  return {
    x: Math.round(viewport.x),
    y: Math.round(viewport.y),
    zoom: clampZoom(viewport.zoom)
  };
}

function viewportsEqual(left: { x: number; y: number; zoom: number }, right: { x: number; y: number; zoom: number }) {
  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneNode(node: GraphNode): GraphNode {
  return {
    ...node,
    position: { ...node.position },
    data: { ...node.data },
  };
}

function cloneEdge(edge: GraphEdge): GraphEdge {
  return {
    ...edge,
    data: { ...edge.data },
  };
}

function cloneDocument(doc: GraphDocument): GraphDocument {
  return {
    ...doc,
    viewport: doc.viewport ? { ...doc.viewport } : undefined,
    nodes: doc.nodes.map(cloneNode),
    edges: doc.edges.map(cloneEdge),
  };
}

function evaluatePermission(value: boolean | string | undefined, context: Record<string, unknown>): boolean {
  if (value === undefined) return true;
  if (typeof value === 'boolean') return value;
  try {
    const keys = Object.keys(context);
    const values = Object.values(context);
    const fn = new Function(...keys, `"use strict"; return (${value});`);
    return !!fn(...values);
  } catch {
    return true;
  }
}

function checkNodePermission(
  nodeType: NodeTypeConfig | undefined,
  permissionKey: keyof NodePermissionConfig,
  context: Record<string, unknown>
): boolean {
  if (!nodeType?.permissions) return true;
  return evaluatePermission(nodeType.permissions[permissionKey], context);
}

function countNodesOfType(doc: GraphDocument, type: string): number {
  return doc.nodes.filter((n) => n.type === type).length;
}

function countIncomingEdges(doc: GraphDocument, nodeId: string): number {
  return doc.edges.filter((e) => e.target === nodeId).length;
}

function countOutgoingEdges(doc: GraphDocument, nodeId: string): number {
  return doc.edges.filter((e) => e.source === nodeId).length;
}

function checkMaxInstances(doc: GraphDocument, constraints: NodeConstraintConfig | undefined, type: string): boolean {
  if (!constraints?.maxInstances) return true;
  if (constraints.maxInstances === 'unlimited') return true;
  return countNodesOfType(doc, type) < constraints.maxInstances;
}

function checkMinInstances(doc: GraphDocument, constraints: NodeConstraintConfig | undefined, type: string): boolean {
  if (constraints?.minInstances === undefined) return true;
  return countNodesOfType(doc, type) > constraints.minInstances;
}

function hasEdgeConnection(doc: GraphDocument, source: string, target: string, ignoreEdgeId?: string): boolean {
  return doc.edges.some((edge) => edge.id !== ignoreEdgeId && edge.source === source && edge.target === target);
}

function validateEdgeConnection(
  doc: GraphDocument,
  normalizedConfig: NormalizedDesignerConfig,
  source: string,
  target: string,
  ignoreEdgeId?: string
): string | undefined {
  const sourceNode = doc.nodes.find((node) => node.id === source);
  const targetNode = doc.nodes.find((node) => node.id === target);

  if (!sourceNode || !targetNode) {
    return EDGE_MISSING_NODE_ERROR;
  }

  if (!normalizedConfig.rules.allowSelfLoop && source === target) {
    return EDGE_SELF_LOOP_ERROR;
  }

  if (!normalizedConfig.rules.allowMultiEdge && hasEdgeConnection(doc, source, target, ignoreEdgeId)) {
    return EDGE_DUPLICATE_ERROR;
  }

  if (normalizedConfig.rules.allowMultiEdge && hasEdgeConnection(doc, source, target, ignoreEdgeId)) {
    return EDGE_DUPLICATE_ERROR;
  }

  return undefined;
}

function normalizeConfig(config: DesignerConfig): NormalizedDesignerConfig {
  const nodeTypes = new Map(config.nodeTypes.map((nt) => [nt.id, nt]));
  const edgeTypes = new Map((config.edgeTypes ?? []).map((et) => [et.id, et]));

  return {
    version: config.version,
    kind: config.kind,
    nodeTypes,
    edgeTypes,
    palette: config.palette,
    toolbar: config.toolbar,
    shortcuts: {
      undo: ['Ctrl+Z', 'Cmd+Z'],
      redo: ['Ctrl+Y', 'Cmd+Y', 'Ctrl+Shift+Z', 'Cmd+Shift+Z'],
      copy: ['Ctrl+C', 'Cmd+C'],
      paste: ['Ctrl+V', 'Cmd+V'],
      delete: ['Delete', 'Backspace'],
      ...config.shortcuts,
    },
    features: {
      undo: true,
      redo: true,
      history: true,
      grid: true,
      minimap: true,
      fitView: true,
      export: true,
      shortcuts: true,
      floatingToolbar: true,
      clipboard: true,
      autoLayout: false,
      multiSelect: false,
      ...config.features,
    },
    rules: {
      allowSelfLoop: false,
      allowMultiEdge: true,
      defaultEdgeType: 'default',
      ...config.rules,
    },
    permissions: {
      canAddNode: true,
      canDeleteNode: true,
      canEditNode: true,
      canConnect: true,
      canExport: true,
      ...config.permissions,
    },
    canvas: {
      background: 'dots',
      gridSize: 24,
      minZoom: 0.1,
      maxZoom: 4,
      defaultZoom: 1,
      pannable: true,
      zoomable: true,
      snapToGrid: true,
      ...config.canvas,
    },
    hooks: config.hooks,
    classAliases: config.classAliases,
    themeStyles: config.themeStyles,
  };
}

export function createDesignerCore(initialDoc: GraphDocument, config: DesignerConfig): DesignerCore {
  let doc = cloneDocument(initialDoc);
  const normalizedConfig = normalizeConfig(config);
  const listeners = new Set<(event: DesignerEvent) => void>();

  let history: HistoryEntry[] = [];
  let historyIndex = -1;
  let savedDoc: GraphDocument | null = cloneDocument(doc);
  let clipboard: GraphNode | null = null;

  let selectedNodeIds: string[] = [];
  let selectedEdgeIds: string[] = [];
  let gridEnabled = true;
  let viewport = normalizeViewport(doc.viewport);

  let transactionStack: Array<{ id: string; label: string; snapshotBefore: GraphDocument }> = [];

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

  function pushHistory() {
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    history.push({ doc: cloneDocument(doc) });
    if (history.length > maxHistorySize) {
      history.shift();
    } else {
      historyIndex++;
    }
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
  }

  function canUndo(): boolean {
    return historyIndex > 0;
  }

  function canRedo(): boolean {
    return historyIndex < history.length - 1;
  }

  function getSelectionSummary(): SelectionSummary {
    return {
      selectedNodeIds,
      selectedEdgeIds,
      activeNodeId: selectedNodeIds[0] ?? null,
      activeEdgeId: selectedEdgeIds[0] ?? null,
    };
  }

  function getSnapshot(): DesignerSnapshot {
    const activeNodeId = selectedNodeIds[0] ?? null;
    const activeEdgeId = selectedEdgeIds[0] ?? null;
    return {
      doc,
      selection: getSelectionSummary(),
      activeNode: activeNodeId ? doc.nodes.find((n) => n.id === activeNodeId) ?? null : null,
      activeEdge: activeEdgeId ? doc.edges.find((e) => e.id === activeEdgeId) ?? null : null,
      canUndo: canUndo(),
      canRedo: canRedo(),
      isDirty: savedDoc !== null && JSON.stringify(doc) !== JSON.stringify(savedDoc),
      gridEnabled,
      viewport,
    };
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
    const permContext = { doc, type, position, data };
    if (!evaluatePermission(normalizedConfig.permissions.canAddNode, permContext)) {
      return null;
    }

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

    if (!checkNodePermission(nodeType, 'canCreate', { doc, nodeType, type, position, data })) {
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

    doc = { ...doc, nodes: [...doc.nodes, newNode] };
    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'nodeAdded', node: newNode });
    emit({ type: 'documentChanged', doc });

    return newNode;
  }

  function updateNode(nodeId: string, data: Record<string, unknown>): void {
    const nodeIndex = doc.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) {
      return;
    }

    const node = doc.nodes[nodeIndex];
    const nodeType = normalizedConfig.nodeTypes.get(node.type);
    const permContext = { doc, node, nodeType, nodeId, data };

    if (!evaluatePermission(normalizedConfig.permissions.canEditNode, permContext)) {
      return;
    }

    if (!checkNodePermission(nodeType, 'canEdit', permContext)) {
      return;
    }

    const updatedNode = { ...doc.nodes[nodeIndex], data: { ...doc.nodes[nodeIndex].data, ...data } };
    const newNodes = [...doc.nodes];
    newNodes[nodeIndex] = updatedNode;
    doc = { ...doc, nodes: newNodes };

    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'nodeUpdated', node: updatedNode });
    emit({ type: 'documentChanged', doc });
  }

  function moveNode(nodeId: string, position: { x: number; y: number }): void {
    const nodeIndex = doc.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) {
      return;
    }

    const node = doc.nodes[nodeIndex];
    const nodeType = normalizedConfig.nodeTypes.get(node.type);
    const permContext = { doc, node, nodeType, nodeId, position };

    if (!checkNodePermission(nodeType, 'canMove', permContext)) {
      return;
    }

    if (nodeType?.constraints?.allowMove === false) {
      return;
    }

    const updatedNode = { ...doc.nodes[nodeIndex], position: { ...position } };
    const newNodes = [...doc.nodes];
    newNodes[nodeIndex] = updatedNode;
    doc = { ...doc, nodes: newNodes };

    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'nodeMoved', node: updatedNode });
    emit({ type: 'documentChanged', doc });
  }

  function duplicateNode(nodeId: string): GraphNode | null {
    const source = doc.nodes.find((n) => n.id === nodeId);
    if (!source) {
      return null;
    }

    const nodeType = normalizedConfig.nodeTypes.get(source.type);
    const permContext = { doc, source, nodeType, nodeId };

    if (!evaluatePermission(normalizedConfig.permissions.canAddNode, permContext)) {
      return null;
    }

    if (!checkNodePermission(nodeType, 'canDuplicate', permContext)) {
      return null;
    }

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
    const permContext = { doc, node, nodeType, nodeId };

    if (!evaluatePermission(normalizedConfig.permissions.canDeleteNode, permContext)) {
      return;
    }

    if (!checkNodePermission(nodeType, 'canDelete', permContext)) {
      return;
    }

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

    const newNodes = doc.nodes.filter((n) => n.id !== nodeId);
    const newEdges = doc.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    doc = { ...doc, nodes: newNodes, edges: newEdges };

    if (selectedNodeIds.includes(nodeId)) {
      selectedNodeIds = selectedNodeIds.filter(id => id !== nodeId);
    }

    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'nodeDeleted', nodeId });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function addEdge(source: string, target: string, data?: Record<string, unknown>): GraphEdge | null {
    const sourceNode = doc.nodes.find((n) => n.id === source);
    const targetNode = doc.nodes.find((n) => n.id === target);
    const permContext = { doc, source, target, data, sourceNode, targetNode };

    if (!evaluatePermission(normalizedConfig.permissions.canConnect, permContext)) {
      return null;
    }

    if (sourceNode) {
      const sourceType = normalizedConfig.nodeTypes.get(sourceNode.type);
      if (!checkNodePermission(sourceType, 'canConnect', permContext)) {
        return null;
      }
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
      if (!checkNodePermission(targetType, 'canConnect', permContext)) {
        return null;
      }
      if (targetType?.constraints?.allowIncoming === false) {
        return null;
      }
      const maxIn = targetType?.constraints?.maxIncoming;
      if (maxIn !== undefined && countIncomingEdges(doc, target) >= maxIn) {
        return null;
      }
    }

    if (normalizedConfig.rules.validateConnection) {
      const expr = normalizedConfig.rules.validateConnection;
      const valid = evaluatePermission(expr, { doc, source, target, data, sourceNode, targetNode });
      if (!valid) {
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

    doc = { ...doc, edges: [...doc.edges, newEdge] };
    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'edgeAdded', edge: newEdge });
    emit({ type: 'documentChanged', doc });

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

    selectedEdgeIds = [edgeId];
    selectedNodeIds = [];

    if (currentEdge.source === source && currentEdge.target === target) {
      emit({ type: 'selectionChanged', selection: getSelectionSummary() });
      return { ok: true, edge: currentEdge, reason: 'unchanged' };
    }

    const updatedEdge = {
      ...currentEdge,
      source,
      target
    };
    const newEdges = [...doc.edges];
    newEdges[edgeIndex] = updatedEdge;
    doc = { ...doc, edges: newEdges };

    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'edgeUpdated', edge: updatedEdge });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });

    return { ok: true, edge: updatedEdge };
  }

  function updateEdge(edgeId: string, data: Record<string, unknown>): void {
    const edgeIndex = doc.edges.findIndex((e) => e.id === edgeId);
    if (edgeIndex === -1) {
      return;
    }

    const updatedEdge = { ...doc.edges[edgeIndex], data: { ...doc.edges[edgeIndex].data, ...data } };
    const newEdges = [...doc.edges];
    newEdges[edgeIndex] = updatedEdge;
    doc = { ...doc, edges: newEdges };

    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'edgeUpdated', edge: updatedEdge });
    emit({ type: 'documentChanged', doc });
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

    doc = { ...doc, edges: doc.edges.filter((e) => e.id !== edgeId) };

    if (selectedEdgeIds.includes(edgeId)) {
      selectedEdgeIds = selectedEdgeIds.filter(id => id !== edgeId);
    }

    if (transactionStack.length === 0) pushHistory();
    emitMutation({ type: 'edgeDeleted', edgeId });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function selectNode(nodeId: string | null): void {
    if (selectedNodeIds.length === 1 && selectedNodeIds[0] === nodeId) {
      return;
    }

    selectedNodeIds = nodeId ? [nodeId] : [];
    selectedEdgeIds = [];
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function selectEdge(edgeId: string | null): void {
    if (selectedEdgeIds.length === 1 && selectedEdgeIds[0] === edgeId) {
      return;
    }

    selectedEdgeIds = edgeId ? [edgeId] : [];
    selectedNodeIds = [];
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function clearSelection(): void {
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
      return;
    }

    selectedNodeIds = [];
    selectedEdgeIds = [];
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function toggleNodeSelection(nodeId: string): void {
    if (selectedNodeIds.includes(nodeId)) {
      selectedNodeIds = selectedNodeIds.filter(id => id !== nodeId);
    } else {
      selectedNodeIds = [...selectedNodeIds, nodeId];
      selectedEdgeIds = [];
    }
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function toggleEdgeSelection(edgeId: string): void {
    if (selectedEdgeIds.includes(edgeId)) {
      selectedEdgeIds = selectedEdgeIds.filter(id => id !== edgeId);
    } else {
      selectedEdgeIds = [...selectedEdgeIds, edgeId];
      selectedNodeIds = [];
    }
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function selectAllNodes(): void {
    selectedNodeIds = doc.nodes.map(n => n.id);
    selectedEdgeIds = [];
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function setSelection(nodeIds: string[], edgeIds: string[]): void {
    selectedNodeIds = nodeIds;
    selectedEdgeIds = edgeIds;
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function moveNodes(deltas: Record<string, { dx: number; dy: number }>): void {
    if (transactionStack.length === 0) pushHistory();
    for (const [nodeId, delta] of Object.entries(deltas)) {
      const nodeIndex = doc.nodes.findIndex(n => n.id === nodeId);
      if (nodeIndex === -1) continue;
      const node = doc.nodes[nodeIndex];
      const nodeType = normalizedConfig.nodeTypes.get(node.type);
      if (!checkNodePermission(nodeType, 'canMove', { doc, node, nodeType, nodeId, position: node.position })) continue;
      if (nodeType?.constraints?.allowMove === false) continue;
      const updatedNode = { ...doc.nodes[nodeIndex], position: { x: node.position.x + delta.dx, y: node.position.y + delta.dy } };
      const newNodes = [...doc.nodes];
      newNodes[nodeIndex] = updatedNode;
      doc = { ...doc, nodes: newNodes };
    }
    emitMutation({ type: 'nodes:moved' });
    emit({ type: 'documentChanged', doc });
  }

  function updateMultipleNodes(updates: Array<{ nodeId: string; data: Partial<GraphNode> }>): void {
    if (transactionStack.length === 0) pushHistory();
    for (const { nodeId, data } of updates) {
      const idx = doc.nodes.findIndex(n => n.id === nodeId);
      if (idx === -1) continue;
      doc.nodes[idx] = { ...doc.nodes[idx], ...data };
    }
    emitMutation({ type: 'nodes:updated' });
    emit({ type: 'documentChanged', doc });
  }

  function undo(): void {
    if (!canUndo()) {
      return;
    }

    historyIndex--;
    doc = cloneDocument(history[historyIndex].doc);
    viewport = normalizeViewport(doc.viewport);
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'viewportChanged', viewport });
  }

  function redo(): void {
    if (!canRedo()) {
      return;
    }

    historyIndex++;
    doc = cloneDocument(history[historyIndex].doc);
    viewport = normalizeViewport(doc.viewport);
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'viewportChanged', viewport });
  }

  function copySelection(): void {
    const activeNodeId = selectedNodeIds[0] ?? null;
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
    doc = { ...doc, viewport };
    if (transactionStack.length === 0) pushHistory();
    emit({ type: 'viewportChanged', viewport });
    emit({ type: 'documentChanged', doc });
  }

  function save(): void {
    savedDoc = cloneDocument(doc);
    emit({ type: 'dirtyChanged', isDirty: false });
  }

  function restore(): void {
    if (!savedDoc) {
      return;
    }

    doc = cloneDocument(savedDoc);
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
    return savedDoc !== null && JSON.stringify(doc) !== JSON.stringify(savedDoc);
  }

  function layoutNodes(positions: Map<string, { x: number; y: number }>): void {
    const newNodes = doc.nodes.map((node) => {
      const newPos = positions.get(node.id);
      if (!newPos || (node.position.x === newPos.x && node.position.y === newPos.y)) {
        return node;
      }
      return { ...node, position: { ...newPos } };
    });
    doc = { ...doc, nodes: newNodes };
    if (transactionStack.length === 0) {
      pushHistory();
    }
    emit({ type: 'documentChanged', doc });
  }

  function isInTransaction(): boolean {
    return transactionStack.length > 0;
  }

  function beginTransaction(label?: string, transactionId?: string): string {
    const id = transactionId ?? generateId();
    transactionStack.push({
      id,
      label: label ?? '',
      snapshotBefore: cloneDocument(doc),
    });
    emit({ type: 'transactionStarted', transactionId: id, label });
    return id;
  }

  function commitTransaction(transactionId?: string): void {
    if (transactionStack.length === 0) {
      return;
    }

    if (transactionId) {
      const index = transactionStack.findIndex((t) => t.id === transactionId);
      if (index === -1) {
        return;
      }

      if (index === 0) {
        const txn = transactionStack.pop()!;
        transactionStack = [];
        pushHistory();
        emit({ type: 'transactionCommitted', transactionId: txn.id });
      } else {
        const txn = transactionStack[index];
        transactionStack.splice(index, 1);
        emit({ type: 'transactionCommitted', transactionId: txn.id });
        if (transactionStack.length === 0) {
          pushHistory();
        }
      }
    } else {
      const txn = transactionStack.pop()!;
      emit({ type: 'transactionCommitted', transactionId: txn.id });
      if (transactionStack.length === 0) {
        pushHistory();
      }
    }
  }

  function rollbackTransaction(transactionId?: string): void {
    if (transactionStack.length === 0) {
      return;
    }

    if (transactionId) {
      const index = transactionStack.findIndex((t) => t.id === transactionId);
      if (index === -1) {
        return;
      }

      const txn = transactionStack[index];
      const innerStack = transactionStack.splice(index);
      doc = cloneDocument(txn.snapshotBefore);
      viewport = normalizeViewport(doc.viewport);
      emit({ type: 'transactionRolledBack', transactionId: txn.id });
      for (let i = innerStack.length - 2; i >= 0; i--) {
        emit({ type: 'transactionRolledBack', transactionId: innerStack[i].id });
      }
    } else {
      const txn = transactionStack.pop()!;
      doc = cloneDocument(txn.snapshotBefore);
      viewport = normalizeViewport(doc.viewport);
      emit({ type: 'transactionRolledBack', transactionId: txn.id });
    }

    emit({ type: 'documentChanged', doc });
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
  }

  history.push({ doc: cloneDocument(doc) });
  historyIndex = 0;

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
