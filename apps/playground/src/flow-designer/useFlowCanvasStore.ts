import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type EdgeChange,
  type NodeChange,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';

export type FlowCanvasNode = Node<Record<string, unknown>>;
export type FlowCanvasEdge = Edge<Record<string, unknown>>;

export interface FlowCanvasDocument {
  nodes: FlowCanvasNode[];
  edges: FlowCanvasEdge[];
}

export interface FlowCanvasStore {
  nodes: FlowCanvasNode[];
  edges: FlowCanvasEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  addNode: (type: string, position: { x: number; y: number }, data?: Record<string, unknown>) => string;
  updateNodeData: (nodeId: string, data: Partial<FlowCanvasNode['data']>) => void;
  updateEdgeData: (edgeId: string, data: Partial<FlowCanvasEdge['data']>) => void;
  deleteSelected: () => void;
  undo: () => void;
  redo: () => void;
  save: () => FlowCanvasDocument;
  reset: () => void;
  export: () => string;
}

interface HistorySnapshot {
  nodes: FlowCanvasNode[];
  edges: FlowCanvasEdge[];
  revision: number;
}

function cloneNodes(nodes: FlowCanvasNode[]): FlowCanvasNode[] {
  return structuredClone(nodes);
}

function cloneEdges(edges: FlowCanvasEdge[]): FlowCanvasEdge[] {
  return structuredClone(edges);
}

function shouldRecordHistory(changes: Array<NodeChange | EdgeChange>): boolean {
  return changes.some((change) => {
    if (change.type === 'select' || change.type === 'dimensions') return false;
    if (change.type === 'position') return change.dragging === false;
    return true;
  });
}

export function useFlowCanvasStore(initialDocument?: FlowCanvasDocument): FlowCanvasStore {
  const [nodes, setNodes] = useState<FlowCanvasNode[]>(() => initialDocument?.nodes ?? []);
  const [edges, setEdges] = useState<FlowCanvasEdge[]>(() => initialDocument?.edges ?? []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);

  const savedDocumentRef = useRef<FlowCanvasDocument | null>(null);
  const historyRef = useRef<HistorySnapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const revisionRef = useRef(0);
  const nodesRef = useRef<FlowCanvasNode[]>(nodes);
  const edgesRef = useRef<FlowCanvasEdge[]>(edges);

  const dirty = useMemo(() => revision !== savedRevision, [revision, savedRevision]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    if (initialDocument) {
      const nextNodes = cloneNodes(initialDocument.nodes);
      const nextEdges = cloneEdges(initialDocument.edges);
      savedDocumentRef.current = {
        nodes: cloneNodes(initialDocument.nodes),
        edges: cloneEdges(initialDocument.edges)
      };
      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      revisionRef.current = 0;
      setRevision(0);
      setSavedRevision(0);
      setNodes(nextNodes);
      setEdges(nextEdges);
      historyRef.current = [{ nodes: cloneNodes(initialDocument.nodes), edges: cloneEdges(initialDocument.edges), revision: 0 }];
      historyIndexRef.current = 0;
    }
  }, [initialDocument]);

  const recordHistory = useCallback((snapshot: HistorySnapshot) => {
    const history = historyRef.current;
    const index = historyIndexRef.current;
    
    history.splice(index + 1);
    history.push(snapshot);
    historyIndexRef.current = history.length - 1;
  }, []);

  const commitSnapshot = useCallback((nextNodes: FlowCanvasNode[], nextEdges: FlowCanvasEdge[], options?: { recordHistory?: boolean }) => {
    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    setNodes(nextNodes);
    setEdges(nextEdges);

    const nextRevision = revisionRef.current + 1;
    revisionRef.current = nextRevision;
    setRevision(nextRevision);

    if (options?.recordHistory !== false) {
      recordHistory({
        nodes: cloneNodes(nextNodes),
        edges: cloneEdges(nextEdges),
        revision: nextRevision
      });
    }
  }, [recordHistory]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    const nextNodes = applyNodeChanges(changes, nodesRef.current) as FlowCanvasNode[];

    if (shouldRecordHistory(changes)) {
      commitSnapshot(nextNodes, edgesRef.current);
    } else {
      nodesRef.current = nextNodes;
      setNodes(nextNodes);
    }

    for (const change of changes) {
      if (change.type === 'remove' && change.id === selectedNodeId) {
        setSelectedNodeId(null);
      }
    }
  }, [commitSnapshot, selectedNodeId]);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    const nextEdges = applyEdgeChanges(changes, edgesRef.current) as FlowCanvasEdge[];

    if (shouldRecordHistory(changes)) {
      commitSnapshot(nodesRef.current, nextEdges);
    } else {
      edgesRef.current = nextEdges;
      setEdges(nextEdges);
    }

    for (const change of changes) {
      if (change.type === 'remove' && change.id === selectedEdgeId) {
        setSelectedEdgeId(null);
      }
    }
  }, [commitSnapshot, selectedEdgeId]);

  const onConnect: OnConnect = useCallback((connection) => {
    const newEdge: FlowCanvasEdge = {
      ...connection,
      id: `edge-${Date.now()}`,
      data: { label: '' }
    };
    const nextEdges = addEdge(newEdge, edgesRef.current) as FlowCanvasEdge[];
    commitSnapshot(nodesRef.current, nextEdges);
  }, [commitSnapshot]);

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) setSelectedEdgeId(null);
  }, []);

  const selectEdge = useCallback((edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
    if (edgeId) setSelectedNodeId(null);
  }, []);

  const addNode = useCallback((type: string, position: { x: number; y: number }, data?: Record<string, unknown>) => {
    const id = `${type}-${Date.now()}`;
    const newNode: FlowCanvasNode = {
      id,
      type,
      position,
      measured: { width: 0, height: 0 },
      data: {
        label: type,
        ...data
      }
    };
    
    const nextNodes = [...nodesRef.current, newNode];
    commitSnapshot(nextNodes, edgesRef.current);
    
    return id;
  }, [commitSnapshot]);

  const updateNodeData = useCallback((nodeId: string, data: Partial<FlowCanvasNode['data']>) => {
    const nextNodes = nodesRef.current.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      );
    commitSnapshot(nextNodes, edgesRef.current);
  }, [commitSnapshot]);

  const updateEdgeData = useCallback((edgeId: string, data: Partial<FlowCanvasEdge['data']>) => {
    const nextEdges = edgesRef.current.map((edge) =>
        edge.id === edgeId ? { ...edge, data: { ...edge.data, ...data } } : edge
      );
    commitSnapshot(nodesRef.current, nextEdges);
  }, [commitSnapshot]);

  const deleteSelected = useCallback(() => {
    if (selectedNodeId) {
      const nextNodes = nodesRef.current.filter((node) => node.id !== selectedNodeId);
      const nextEdges = edgesRef.current.filter(
        (edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId
      );
      commitSnapshot(nextNodes, nextEdges);
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      const nextEdges = edgesRef.current.filter((edge) => edge.id !== selectedEdgeId);
      commitSnapshot(nodesRef.current, nextEdges);
      setSelectedEdgeId(null);
    }
  }, [commitSnapshot, selectedNodeId, selectedEdgeId]);

  const undo = useCallback(() => {
    const history = historyRef.current;
    const index = historyIndexRef.current;
    
    if (index > 0) {
      const snapshot = history[index - 1];
      historyIndexRef.current = index - 1;
      const nextNodes = cloneNodes(snapshot.nodes);
      const nextEdges = cloneEdges(snapshot.edges);
      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      revisionRef.current = snapshot.revision;
      setRevision(snapshot.revision);
      setNodes(nextNodes);
      setEdges(nextEdges);
    }
  }, []);

  const redo = useCallback(() => {
    const history = historyRef.current;
    const index = historyIndexRef.current;
    
    if (index < history.length - 1) {
      const snapshot = history[index + 1];
      historyIndexRef.current = index + 1;
      const nextNodes = cloneNodes(snapshot.nodes);
      const nextEdges = cloneEdges(snapshot.edges);
      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      revisionRef.current = snapshot.revision;
      setRevision(snapshot.revision);
      setNodes(nextNodes);
      setEdges(nextEdges);
    }
  }, []);

  const save = useCallback(() => {
    const document: FlowCanvasDocument = {
      nodes: cloneNodes(nodes),
      edges: cloneEdges(edges)
    };
    savedDocumentRef.current = document;
    setSavedRevision(revisionRef.current);
    return document;
  }, [nodes, edges]);

  const reset = useCallback(() => {
    if (savedDocumentRef.current) {
      const document = savedDocumentRef.current;
      const nextNodes = cloneNodes(document.nodes);
      const nextEdges = cloneEdges(document.edges);
      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      revisionRef.current = savedRevision;
      setRevision(savedRevision);
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  }, [savedRevision]);

  const export_ = useCallback(() => {
    return JSON.stringify({ nodes, edges }, null, 2);
  }, [nodes, edges]);

  return {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    dirty,
    canUndo,
    canRedo,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    selectEdge,
    addNode,
    updateNodeData,
    updateEdgeData,
    deleteSelected,
    undo,
    redo,
    save,
    reset,
    export: export_
  };
}
