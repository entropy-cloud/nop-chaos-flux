import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
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
  
  const initialSnapshotRef = useRef<string>('');
  const historyRef = useRef<HistorySnapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);

  const currentSnapshot = useMemo<HistorySnapshot>(
    () => ({ nodes: cloneNodes(nodes), edges: cloneEdges(edges) }),
    [nodes, edges]
  );

  const dirty = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return JSON.stringify({ nodes, edges }) !== initialSnapshotRef.current;
  }, [nodes, edges]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  useEffect(() => {
    if (initialDocument) {
      const snapshot = JSON.stringify(initialDocument);
      initialSnapshotRef.current = snapshot;
      setNodes(cloneNodes(initialDocument.nodes));
      setEdges(cloneEdges(initialDocument.edges));
      historyRef.current = [{ nodes: cloneNodes(initialDocument.nodes), edges: cloneEdges(initialDocument.edges) }];
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

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((prev) => {
      const next = applyNodeChanges(changes, prev) as FlowCanvasNode[];
      
      if (shouldRecordHistory(changes)) {
        recordHistory({ nodes: cloneNodes(next), edges: cloneEdges(edges) });
      }
      
      return next;
    });

    for (const change of changes) {
      if (change.type === 'remove' && change.id === selectedNodeId) {
        setSelectedNodeId(null);
      }
    }
  }, [edges, selectedNodeId, recordHistory]);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((prev) => {
      const next = applyEdgeChanges(changes, prev) as FlowCanvasEdge[];
      
      if (shouldRecordHistory(changes)) {
        recordHistory({ nodes: cloneNodes(nodes), edges: cloneEdges(next) });
      }
      
      return next;
    });

    for (const change of changes) {
      if (change.type === 'remove' && change.id === selectedEdgeId) {
        setSelectedEdgeId(null);
      }
    }
  }, [nodes, selectedEdgeId, recordHistory]);

  const onConnect: OnConnect = useCallback((connection) => {
    setEdges((prev) => {
      const newEdge: FlowCanvasEdge = {
        ...connection,
        id: `edge-${Date.now()}`,
        data: { label: '' }
      };
      const next = addEdge(newEdge, prev) as FlowCanvasEdge[];
      recordHistory({ nodes: cloneNodes(nodes), edges: cloneEdges(next) });
      return next;
    });
  }, [nodes, recordHistory]);

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
      data: {
        label: type,
        ...data
      }
    };
    
    setNodes((prev) => {
      const next = [...prev, newNode];
      recordHistory({ nodes: cloneNodes(next), edges: cloneEdges(edges) });
      return next;
    });
    
    return id;
  }, [edges, recordHistory]);

  const updateNodeData = useCallback((nodeId: string, data: Partial<FlowCanvasNode['data']>) => {
    setNodes((prev) => {
      const next = prev.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      );
      recordHistory({ nodes: cloneNodes(next), edges: cloneEdges(edges) });
      return next;
    });
  }, [edges, recordHistory]);

  const updateEdgeData = useCallback((edgeId: string, data: Partial<FlowCanvasEdge['data']>) => {
    setEdges((prev) => {
      const next = prev.map((edge) =>
        edge.id === edgeId ? { ...edge, data: { ...edge.data, ...data } } : edge
      );
      recordHistory({ nodes: cloneNodes(nodes), edges: cloneEdges(next) });
      return next;
    });
  }, [nodes, recordHistory]);

  const deleteSelected = useCallback(() => {
    if (selectedNodeId) {
      setNodes((prev) => {
        const next = prev.filter((node) => node.id !== selectedNodeId);
        setEdges((edges) => {
          const nextEdges = edges.filter(
            (edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId
          );
          recordHistory({ nodes: cloneNodes(next), edges: cloneEdges(nextEdges) });
          return nextEdges;
        });
        return next;
      });
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      setEdges((prev) => {
        const next = prev.filter((edge) => edge.id !== selectedEdgeId);
        recordHistory({ nodes: cloneNodes(nodes), edges: cloneEdges(next) });
        return next;
      });
      setSelectedEdgeId(null);
    }
  }, [selectedNodeId, selectedEdgeId, nodes, recordHistory]);

  const undo = useCallback(() => {
    const history = historyRef.current;
    const index = historyIndexRef.current;
    
    if (index > 0) {
      const snapshot = history[index - 1];
      historyIndexRef.current = index - 1;
      setNodes(cloneNodes(snapshot.nodes));
      setEdges(cloneEdges(snapshot.edges));
    }
  }, []);

  const redo = useCallback(() => {
    const history = historyRef.current;
    const index = historyIndexRef.current;
    
    if (index < history.length - 1) {
      const snapshot = history[index + 1];
      historyIndexRef.current = index + 1;
      setNodes(cloneNodes(snapshot.nodes));
      setEdges(cloneEdges(snapshot.edges));
    }
  }, []);

  const save = useCallback(() => {
    const document: FlowCanvasDocument = {
      nodes: cloneNodes(nodes),
      edges: cloneEdges(edges)
    };
    initialSnapshotRef.current = JSON.stringify(document);
    return document;
  }, [nodes, edges]);

  const reset = useCallback(() => {
    if (initialSnapshotRef.current) {
      const document = JSON.parse(initialSnapshotRef.current) as FlowCanvasDocument;
      setNodes(cloneNodes(document.nodes));
      setEdges(cloneEdges(document.edges));
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  }, []);

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
