import type {
  GraphDocument,
  GraphNode,
  GraphEdge,
  DesignerConfig,
  NormalizedDesignerConfig,
  DesignerSnapshot,
  SelectionSummary,
  DesignerEvent
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
}

interface HistoryEntry {
  doc: GraphDocument;
}

const EDGE_SELF_LOOP_ERROR = 'Self-loop edges are not supported in the playground example.';
const EDGE_MISSING_NODE_ERROR = 'Edges must connect existing nodes.';
const EDGE_DUPLICATE_ERROR = 'Duplicate edges are not supported in the playground example.';

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
  };
}

export function createDesignerCore(initialDoc: GraphDocument, config: DesignerConfig): DesignerCore {
  let doc = cloneDocument(initialDoc);
  const normalizedConfig = normalizeConfig(config);
  const listeners = new Set<(event: DesignerEvent) => void>();

  let history: HistoryEntry[] = [];
  let historyIndex = -1;
  let savedDoc: GraphDocument | null = null;
  let clipboard: GraphNode | null = null;

  let activeNodeId: string | null = null;
  let activeEdgeId: string | null = null;
  let gridEnabled = true;
  let viewport = doc.viewport ?? { x: 0, y: 0, zoom: 1 };

  const maxHistorySize = 50;

  function emit(event: DesignerEvent) {
    for (const listener of listeners) {
      listener(event);
    }
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
      selectedNodeIds: activeNodeId ? [activeNodeId] : [],
      selectedEdgeIds: activeEdgeId ? [activeEdgeId] : [],
      activeNodeId,
      activeEdgeId,
    };
  }

  function getSnapshot(): DesignerSnapshot {
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
    const nodeType = normalizedConfig.nodeTypes.get(type);
    if (!nodeType) {
      return null;
    }

    if (type === 'start') {
      const startNodes = doc.nodes.filter((n) => n.type === 'start');
      const maxInstances = nodeType.constraints?.maxInstances ?? 1;
      if (maxInstances !== 'unlimited' && startNodes.length >= maxInstances) {
        return null;
      }
    }

    const newNode: GraphNode = {
      id: generateId(),
      type,
      position: { ...position },
      data: { ...nodeType.defaults, ...data },
    };

    doc = { ...doc, nodes: [...doc.nodes, newNode] };
    pushHistory();
    emit({ type: 'nodeAdded', node: newNode });
    emit({ type: 'documentChanged', doc });

    return newNode;
  }

  function updateNode(nodeId: string, data: Record<string, unknown>): void {
    const nodeIndex = doc.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) {
      return;
    }

    const updatedNode = { ...doc.nodes[nodeIndex], data: { ...doc.nodes[nodeIndex].data, ...data } };
    const newNodes = [...doc.nodes];
    newNodes[nodeIndex] = updatedNode;
    doc = { ...doc, nodes: newNodes };

    pushHistory();
    emit({ type: 'nodeUpdated', node: updatedNode });
    emit({ type: 'documentChanged', doc });
  }

  function moveNode(nodeId: string, position: { x: number; y: number }): void {
    const nodeIndex = doc.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) {
      return;
    }

    const updatedNode = { ...doc.nodes[nodeIndex], position: { ...position } };
    const newNodes = [...doc.nodes];
    newNodes[nodeIndex] = updatedNode;
    doc = { ...doc, nodes: newNodes };

    pushHistory();
    emit({ type: 'nodeMoved', node: updatedNode });
    emit({ type: 'documentChanged', doc });
  }

  function duplicateNode(nodeId: string): GraphNode | null {
    const source = doc.nodes.find((n) => n.id === nodeId);
    if (!source) {
      return null;
    }

    return addNode(source.type, { x: source.position.x + 48, y: source.position.y + 48 }, source.data);
  }

  function deleteNode(nodeId: string): void {
    const nodeIndex = doc.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) {
      return;
    }

    const newNodes = doc.nodes.filter((n) => n.id !== nodeId);
    const newEdges = doc.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    doc = { ...doc, nodes: newNodes, edges: newEdges };

    if (activeNodeId === nodeId) {
      activeNodeId = null;
    }

    pushHistory();
    emit({ type: 'nodeDeleted', nodeId });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function addEdge(source: string, target: string, data?: Record<string, unknown>): GraphEdge | null {
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
    pushHistory();
    emit({ type: 'edgeAdded', edge: newEdge });
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

    activeEdgeId = edgeId;
    activeNodeId = null;

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

    pushHistory();
    emit({ type: 'edgeUpdated', edge: updatedEdge });
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

    pushHistory();
    emit({ type: 'edgeUpdated', edge: updatedEdge });
    emit({ type: 'documentChanged', doc });
  }

  function deleteEdge(edgeId: string): void {
    const edgeIndex = doc.edges.findIndex((e) => e.id === edgeId);
    if (edgeIndex === -1) {
      return;
    }

    doc = { ...doc, edges: doc.edges.filter((e) => e.id !== edgeId) };

    if (activeEdgeId === edgeId) {
      activeEdgeId = null;
    }

    pushHistory();
    emit({ type: 'edgeDeleted', edgeId });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function selectNode(nodeId: string | null): void {
    if (activeNodeId === nodeId) {
      return;
    }

    activeNodeId = nodeId;
    activeEdgeId = null;
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function selectEdge(edgeId: string | null): void {
    if (activeEdgeId === edgeId) {
      return;
    }

    activeEdgeId = edgeId;
    activeNodeId = null;
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function clearSelection(): void {
    if (!activeNodeId && !activeEdgeId) {
      return;
    }

    activeNodeId = null;
    activeEdgeId = null;
    emit({ type: 'selectionChanged', selection: getSelectionSummary() });
  }

  function undo(): void {
    if (!canUndo()) {
      return;
    }

    historyIndex--;
    doc = cloneDocument(history[historyIndex].doc);
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
    emit({ type: 'documentChanged', doc });
  }

  function redo(): void {
    if (!canRedo()) {
      return;
    }

    historyIndex++;
    doc = cloneDocument(history[historyIndex].doc);
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
    emit({ type: 'documentChanged', doc });
  }

  function copySelection(): void {
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
    viewport = newViewport;
    doc = { ...doc, viewport };
    emit({ type: 'viewportChanged', viewport });
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
    pushHistory();
    emit({ type: 'documentChanged', doc });
    emit({ type: 'dirtyChanged', isDirty: false });
  }

  function exportDocument(): string {
    return JSON.stringify(doc, null, 2);
  }

  function isDirty(): boolean {
    return savedDoc !== null && JSON.stringify(doc) !== JSON.stringify(savedDoc);
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
  };
}
