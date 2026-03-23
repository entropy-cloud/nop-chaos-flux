import React from 'react';
import { Background, Handle, Position, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  NodeProps,
  OnReconnect,
  OnSelectionChangeParams
} from '@xyflow/react';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';

export type DesignerCanvasAdapterKind = 'card' | 'xyflow-preview' | 'xyflow';

function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

function getNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    start: '>',
    end: '[]',
    task: '*',
    condition: '<>',
    parallel: '||',
    loop: '~'
  };
  return icons[type] ?? 'o';
}

function getNodePorts(type: string): Array<{ id: string; direction: 'input' | 'output'; position: string; label?: string }> {
  switch (type) {
    case 'start':
      return [{ id: 'out', direction: 'output', position: 'right' }];
    case 'end':
      return [{ id: 'in', direction: 'input', position: 'left' }];
    case 'task':
    case 'condition':
    case 'parallel':
    case 'loop':
      return [
        { id: 'in', direction: 'input', position: 'left' },
        { id: 'out', direction: 'output', position: 'right' }
      ];
    default:
      return [
        { id: 'in', direction: 'input', position: 'left' },
        { id: 'out', direction: 'output', position: 'right' }
      ];
  }
}

export interface DesignerCanvasBridgeProps {
  snapshot: DesignerSnapshot;
  pendingConnectionSourceId: string | null;
  reconnectingEdgeId: string | null;
  onPaneClick(): void;
  onNodeSelect(nodeId: string, event: React.MouseEvent): void;
  onEdgeSelect(edgeId: string, event: React.MouseEvent): void;
  onStartConnection(nodeId: string, event: React.MouseEvent): void;
  onCancelConnection(nodeId: string, event: React.MouseEvent): void;
  onCompleteConnection(nodeId: string, event: React.MouseEvent): void;
  onStartReconnect(edgeId: string, event: React.MouseEvent): void;
  onCancelReconnect(edgeId: string, event: React.MouseEvent): void;
  onCompleteReconnect(edgeId: string, nodeId: string, event: React.MouseEvent): void;
  onDuplicateNode(nodeId: string, event: React.MouseEvent): void;
  onDeleteNode(nodeId: string, event: React.MouseEvent): void;
  onDeleteEdge(edgeId: string, event: React.MouseEvent): void;
  onMoveNode(nodeId: string, event: React.MouseEvent, position?: { x: number; y: number }): void;
  onViewportChange(viewport: { x: number; y: number; zoom: number }, event: React.MouseEvent): void;
}

function getReconnectEdge(snapshot: DesignerSnapshot, reconnectingEdgeId: string | null) {
  if (!reconnectingEdgeId) {
    return null;
  }

  return snapshot.doc.edges.find((edge) => edge.id === reconnectingEdgeId) ?? null;
}

interface XyflowViewportChange {
  x?: number;
  y?: number;
  zoom?: number;
}

type DesignerXyflowReactFlowProps = React.ComponentProps<typeof ReactFlow>;

interface DesignerXyflowControlledViewport {
  x: number;
  y: number;
  zoom: number;
}

interface DesignerXyflowPositionChange {
  id: string;
  type: 'position';
  position?: {
    x: number;
    y: number;
  };
  dragging?: boolean;
}

interface DesignerXyflowRemoveChange {
  id: string;
  type: 'remove';
}

interface DesignerFlowNodeData extends Record<string, unknown> {
  label: string;
  typeLabel: string;
}

const VIEWPORT_EPSILON = 0.01;

function createXyflowNodes(snapshot: DesignerSnapshot): Node[] {
  return snapshot.doc.nodes.map((node) => ({
    id: node.id,
    type: 'designerNode',
    position: { ...node.position },
    selected: snapshot.selection.activeNodeId === node.id,
    data: {
      label: String(node.data.label ?? node.id),
      typeLabel: node.type
    }
  }));
}

function createXyflowEdges(snapshot: DesignerSnapshot): Edge[] {
  return snapshot.doc.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: String(edge.data.label ?? edge.id),
    selected: snapshot.selection.activeEdgeId === edge.id
  }));
}

function normalizeControlledViewport(viewport: { x: number; y: number; zoom: number }): DesignerXyflowControlledViewport {
  return {
    x: Math.round(viewport.x),
    y: Math.round(viewport.y),
    zoom: Number(viewport.zoom.toFixed(1))
  };
}

function viewportsEqual(left: DesignerXyflowControlledViewport, right: DesignerXyflowControlledViewport) {
  return (
    Math.abs(left.x - right.x) < VIEWPORT_EPSILON &&
    Math.abs(left.y - right.y) < VIEWPORT_EPSILON &&
    Math.abs(left.zoom - right.zoom) < VIEWPORT_EPSILON
  );
}

function normalizeViewportChange(value: XyflowViewportChange | null | undefined): DesignerXyflowControlledViewport | null {
  if (!value || typeof value.x !== 'number' || typeof value.y !== 'number' || typeof value.zoom !== 'number') {
    return null;
  }

  return normalizeControlledViewport({ x: value.x, y: value.y, zoom: value.zoom });
}

function normalizePositionSignature(position: { x: number; y: number }) {
  return `${Math.round(position.x)}:${Math.round(position.y)}`;
}

function asPositionChange(change: NodeChange): DesignerXyflowPositionChange | null {
  if (change.type !== 'position') {
    return null;
  }

  return change as DesignerXyflowPositionChange;
}

function asRemoveChange<T extends NodeChange | EdgeChange>(change: T): DesignerXyflowRemoveChange | null {
  if (change.type !== 'remove') {
    return null;
  }

  return change as DesignerXyflowRemoveChange;
}

function DesignerXyflowNode(props: NodeProps) {
  const data = props.data as DesignerFlowNodeData;
  return (
    <div className={classNames('fd-xyflow-node', props.selected && 'fd-xyflow-node--active')}>
      <Handle type="target" position={Position.Top} />
      <strong>{data.label}</strong>
      <small>{data.typeLabel}</small>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const xyflowNodeTypes = {
  designerNode: DesignerXyflowNode
};

export function DesignerCardCanvasBridge(props: DesignerCanvasBridgeProps) {
  const { doc, selection } = props.snapshot;

  return (
    <div className="fd-canvas" onClick={props.onPaneClick}>
      <div className="fd-canvas__nodes">
        {doc.nodes.map((node) => (
          (() => {
            const isConnectionSource = props.pendingConnectionSourceId === node.id;
            const isConnectionTarget = !!props.pendingConnectionSourceId && props.pendingConnectionSourceId !== node.id;
            const reconnectingEdge = getReconnectEdge(props.snapshot, props.reconnectingEdgeId);
            const isReconnectTarget = !!reconnectingEdge && reconnectingEdge.target !== node.id;

            return (
          <div
            key={node.id}
            className={classNames(
              'fd-node',
              selection.activeNodeId === node.id && 'fd-node--selected',
              isConnectionSource && 'fd-node--connection-source',
              isConnectionTarget && 'fd-node--connection-target',
              isReconnectTarget && 'fd-node--reconnect-target',
              node.type && `fd-node--${node.type}`
            )}
            style={{
              position: 'absolute',
              left: node.position.x,
              top: node.position.y,
              minWidth: 160,
              padding: '12px 16px',
              background: '#fff',
              borderRadius: 8,
              border: selection.activeNodeId === node.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={(event) => props.onNodeSelect(node.id, event)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{getNodeIcon(node.type)}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{String(node.data.label ?? node.type)}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{node.type}</div>
              </div>
            </div>
            {selection.activeNodeId === node.id && (
              <div
                className="fd-node__actions"
                style={{
                  position: 'absolute',
                  top: -12,
                  right: -12,
                  display: 'flex',
                  gap: 4
                }}
              >
                <button
                  className="fd-node__action"
                  onClick={(event) => props.onDuplicateNode(node.id, event)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12
                  }}
                  title="Duplicate"
                  type="button"
                >
                  D
                </button>
                <button
                  className="fd-node__action"
                  onClick={(event) => props.onStartConnection(node.id, event)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12
                  }}
                  title="Connect"
                  type="button"
                >
                  C
                </button>
                <button
                  className="fd-node__action"
                  onClick={(event) => props.onMoveNode(node.id, event)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12
                  }}
                  title="Move"
                  type="button"
                >
                  M
                </button>
                <button
                  className="fd-node__action fd-node__action--delete"
                  onClick={(event) => props.onDeleteNode(node.id, event)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12
                  }}
                  title="Delete"
                  type="button"
                >
                  X
                </button>
              </div>
            )}
            {getNodePorts(node.type).map((port) => (
              <div
                key={port.id}
                className={`fd-port fd-port--${port.direction}`}
                style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: port.direction === 'input' ? '#3b82f6' : '#10b981',
                  border: '2px solid #fff',
                  ...(port.position === 'left' ? { left: -5, top: '50%', transform: 'translateY(-50%)' } : {}),
                  ...(port.position === 'right' ? { right: -5, top: '50%', transform: 'translateY(-50%)' } : {}),
                  ...(port.position === 'top' ? { top: -5, left: '50%', transform: 'translateX(-50%)' } : {}),
                  ...(port.position === 'bottom' ? { bottom: -5, left: '50%', transform: 'translateX(-50%)' } : {})
                }}
                title={port.label ?? port.id}
              />
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {isConnectionSource ? (
                <button type="button" onClick={(event) => props.onCancelConnection(node.id, event)}>
                  Cancel connection
                </button>
              ) : isConnectionTarget ? (
                <button type="button" onClick={(event) => props.onCompleteConnection(node.id, event)}>
                  Connect here
                </button>
              ) : (
                <button type="button" onClick={(event) => props.onStartConnection(node.id, event)}>
                  Start connection
                </button>
              )}
              {reconnectingEdge ? (
                reconnectingEdge.id === props.reconnectingEdgeId && reconnectingEdge.target === node.id ? (
                  <button type="button" onClick={(event) => props.onCancelReconnect(reconnectingEdge.id, event)}>
                    Cancel reconnect
                  </button>
                ) : (
                  <button type="button" onClick={(event) => props.onCompleteReconnect(reconnectingEdge.id, node.id, event)}>
                    Reconnect here
                  </button>
                )
              ) : null}
            </div>
          </div>
            );
          })()
        ))}
      </div>
      <svg
        className="fd-canvas__edges"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        {doc.edges.map((edge) => {
          const sourceNode = doc.nodes.find((node) => node.id === edge.source);
          const targetNode = doc.nodes.find((node) => node.id === edge.target);
          if (!sourceNode || !targetNode) {
            return null;
          }

          const sourceX = sourceNode.position.x + 160;
          const sourceY = sourceNode.position.y + 30;
          const targetX = targetNode.position.x;
          const targetY = targetNode.position.y + 30;
          const midX = (sourceX + targetX) / 2;
          const edgeLabel = edge.data.label != null ? String(edge.data.label) : null;

          return (
            <g
              key={edge.id}
              onClick={(event) => props.onEdgeSelect(edge.id, event as unknown as React.MouseEvent)}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            >
              <path
                d={`M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`}
                fill="none"
                stroke={selection.activeEdgeId === edge.id ? '#3b82f6' : '#94a3b8'}
                strokeWidth={selection.activeEdgeId === edge.id ? 3 : 2}
                markerEnd="url(#arrowhead)"
              />
              {edgeLabel ? (
                <text
                  x={midX}
                  y={(sourceY + targetY) / 2 - 10}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize={12}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                >
                  {edgeLabel}
                </text>
              ) : null}
              {selection.activeEdgeId === edge.id ? (
                <g
                  transform={`translate(${midX + 20}, ${(sourceY + targetY) / 2 + 5})`}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onClick={(event) => props.onDeleteEdge(edge.id, event as unknown as React.MouseEvent)}
                >
                  <circle r={10} fill="#ef4444" />
                  <text textAnchor="middle" dy={4} fill="#fff" fontSize={14}>
                    X
                  </text>
                </g>
              ) : null}
              {selection.activeEdgeId === edge.id ? (
                <g
                  transform={`translate(${midX - 10}, ${(sourceY + targetY) / 2 + 5})`}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onClick={(event) => props.onStartReconnect(edge.id, event as unknown as React.MouseEvent)}
                >
                  <circle r={10} fill="#f59e0b" />
                  <text textAnchor="middle" dy={4} fill="#fff" fontSize={12}>
                    R
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
        <defs>
          <marker id="arrowhead" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>
      </svg>
      <div
        className="fd-canvas__info"
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          background: 'rgba(255,255,255,0.9)',
          padding: '8px 12px',
          borderRadius: 6,
          fontSize: 12,
          color: '#64748b'
        }}
      >
        Nodes: {doc.nodes.length} | Edges: {doc.edges.length}
        <button
          type="button"
          title="Zoom in"
          onClick={(event) => props.onViewportChange({ x: props.snapshot.viewport.x, y: props.snapshot.viewport.y, zoom: props.snapshot.viewport.zoom + 0.1 }, event)}
          style={{ marginLeft: 8 }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function DesignerXyflowPreviewBridge(props: DesignerCanvasBridgeProps) {
  const { doc, selection, viewport } = props.snapshot;
  const reconnectingEdge = getReconnectEdge(props.snapshot, props.reconnectingEdgeId);
  const activeEdge = selection.activeEdgeId
    ? doc.edges.find((edge) => edge.id === selection.activeEdgeId) ?? null
    : null;

  return (
    <div className="fd-xyflow-preview" onClick={props.onPaneClick}>
      <div className="fd-xyflow-preview__hero">
        <strong>Xyflow preview bridge</strong>
        <span>
          This preview keeps pane, selection, connect, reconnect, move, and viewport callbacks explicit before a real xyflow
          adapter lands.
        </span>
      </div>
      <div className="fd-xyflow-preview__section">
        <strong>Selection</strong>
        <div className="fd-xyflow-preview__actions">
          {doc.nodes.map((node) => (
            <button key={node.id} type="button" onClick={(event) => props.onNodeSelect(node.id, event)}>
              Select {String(node.data.label ?? node.id)}
            </button>
          ))}
          {doc.edges.map((edge) => (
            <button key={edge.id} type="button" onClick={(event) => props.onEdgeSelect(edge.id, event)}>
              Select {String(edge.data.label ?? edge.id)}
            </button>
          ))}
        </div>
      </div>
      <div className="fd-xyflow-preview__section">
        <strong>Connect</strong>
        <div className="fd-xyflow-preview__actions">
          {props.pendingConnectionSourceId ? (
            <>
              {doc.nodes
                .filter((node) => node.id !== props.pendingConnectionSourceId)
                .map((node) => (
                  <button key={node.id} type="button" onClick={(event) => props.onCompleteConnection(node.id, event)}>
                    Connect to {String(node.data.label ?? node.id)}
                  </button>
                ))}
              <button type="button" onClick={(event) => props.onCancelConnection(props.pendingConnectionSourceId!, event)}>
                Cancel connect preview
              </button>
            </>
          ) : (
            doc.nodes.map((node) => (
              <button key={node.id} type="button" onClick={(event) => props.onStartConnection(node.id, event)}>
                Start from {String(node.data.label ?? node.id)}
              </button>
            ))
          )}
        </div>
      </div>
      <div className="fd-xyflow-preview__section">
        <strong>Reconnect</strong>
        <div className="fd-xyflow-preview__actions">
          {reconnectingEdge ? (
            <>
              {doc.nodes
                .filter((node) => node.id !== reconnectingEdge.target)
                .map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={(event) => props.onCompleteReconnect(reconnectingEdge.id, node.id, event)}
                  >
                    Reconnect to {String(node.data.label ?? node.id)}
                  </button>
                ))}
              <button type="button" onClick={(event) => props.onCancelReconnect(reconnectingEdge.id, event)}>
                Cancel reconnect preview
              </button>
            </>
          ) : activeEdge ? (
            <button type="button" onClick={(event) => props.onStartReconnect(activeEdge.id, event)}>
              Start reconnect for {String(activeEdge.data.label ?? activeEdge.id)}
            </button>
          ) : (
            <span>Select an edge to preview reconnect.</span>
          )}
        </div>
      </div>
      <div className="fd-xyflow-preview__section">
        <strong>Move and viewport</strong>
        <div className="fd-xyflow-preview__actions">
          {doc.nodes.map((node) => (
            <button key={node.id} type="button" onClick={(event) => props.onMoveNode(node.id, event)}>
              Nudge {String(node.data.label ?? node.id)}
            </button>
          ))}
          <button
            type="button"
            onClick={(event) => props.onViewportChange({ x: viewport.x + 12, y: viewport.y + 8, zoom: viewport.zoom + 0.1 }, event)}
          >
            Simulate viewport sync
          </button>
        </div>
      </div>
      <div className="fd-xyflow-preview__section">
        <strong>Pane</strong>
        <div className="fd-xyflow-preview__actions">
          <button type="button" onClick={props.onPaneClick}>
            Simulate pane click
          </button>
          <span>
            Active node: {selection.activeNodeId ?? 'none'} | Active edge: {selection.activeEdgeId ?? 'none'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DesignerXyflowCanvasBridge(props: DesignerCanvasBridgeProps) {
  const nodes = React.useMemo(() => createXyflowNodes(props.snapshot), [props.snapshot]);
  const edges = React.useMemo(() => createXyflowEdges(props.snapshot), [props.snapshot]);
  const viewport = React.useMemo(
    () => normalizeControlledViewport(props.snapshot.doc.viewport ?? props.snapshot.viewport),
    [props.snapshot.doc.viewport, props.snapshot.viewport]
  );
  const [controlledViewport, setControlledViewport] = React.useState<DesignerXyflowControlledViewport>(viewport);
  const documentNodePositionsRef = React.useRef<Map<string, string>>(new Map());
  const pendingNodePositionCommitsRef = React.useRef<Map<string, string>>(new Map());

  React.useEffect(() => {
    setControlledViewport((current) => (viewportsEqual(current, viewport) ? current : viewport));
  }, [viewport]);

  React.useEffect(() => {
    const nextDocumentPositions = new Map(
      props.snapshot.doc.nodes.map((node) => [node.id, normalizePositionSignature(node.position)])
    );
    documentNodePositionsRef.current = nextDocumentPositions;

    for (const [nodeId, signature] of pendingNodePositionCommitsRef.current) {
      if (!nextDocumentPositions.has(nodeId) || nextDocumentPositions.get(nodeId) === signature) {
        pendingNodePositionCommitsRef.current.delete(nodeId);
      }
    }
  }, [props.snapshot.doc.nodes]);

  function getLatestCommittedNodePositionSignature(nodeId: string) {
    return pendingNodePositionCommitsRef.current.get(nodeId) ?? documentNodePositionsRef.current.get(nodeId);
  }

  function commitNodePosition(nodeId: string, position: { x: number; y: number }) {
    const roundedPosition = {
      x: Math.round(position.x),
      y: Math.round(position.y)
    };
    const signature = normalizePositionSignature(roundedPosition);

    if (getLatestCommittedNodePositionSignature(nodeId) === signature) {
      return;
    }

    pendingNodePositionCommitsRef.current.set(nodeId, signature);
    props.onMoveNode(nodeId, {} as React.MouseEvent, roundedPosition);
  }

  function handleViewportChange(nextViewport: XyflowViewportChange) {
    const normalized = normalizeViewportChange(nextViewport);
    if (!normalized) {
      return;
    }

    setControlledViewport((current) => (viewportsEqual(current, normalized) ? current : normalized));

    if (!viewportsEqual(viewport, normalized)) {
      props.onViewportChange(normalized, {} as React.MouseEvent);
    }
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return;
    }

    props.onStartConnection(connection.source, {} as React.MouseEvent);
    props.onCompleteConnection(connection.target, {} as React.MouseEvent);
  }

  const handleReconnect = React.useCallback<NonNullable<OnReconnect>>(
    (oldEdge, newConnection) => {
      if (!oldEdge.id || !newConnection.source || !newConnection.target || newConnection.source === newConnection.target) {
        return;
      }

      props.onStartReconnect(oldEdge.id, {} as React.MouseEvent);
      props.onCompleteReconnect(oldEdge.id, newConnection.target, {} as React.MouseEvent);
    },
    [props]
  );

  function handleSelectionChange(selection: OnSelectionChangeParams) {
    if (selection.nodes.length > 0) {
      props.onNodeSelect(selection.nodes[0].id, {} as React.MouseEvent);
      return;
    }

    if (selection.edges.length > 0) {
      props.onEdgeSelect(selection.edges[0].id, {} as React.MouseEvent);
      return;
    }

    if (props.snapshot.selection.activeNodeId || props.snapshot.selection.activeEdgeId) {
      props.onPaneClick();
    }
  }

  function handleNodesChange(changes: NodeChange[]) {
    for (const change of changes) {
      const removeChange = asRemoveChange(change);
      if (removeChange) {
        pendingNodePositionCommitsRef.current.delete(removeChange.id);
        props.onDeleteNode(removeChange.id, {} as React.MouseEvent);
        continue;
      }

      const positionChange = asPositionChange(change);
      if (!positionChange?.position || positionChange.dragging === true) {
        continue;
      }

      commitNodePosition(positionChange.id, positionChange.position);
    }
  }

  function handleEdgesChange(changes: EdgeChange[]) {
    for (const change of changes) {
      const removeChange = asRemoveChange(change);
      if (removeChange) {
        props.onDeleteEdge(removeChange.id, {} as React.MouseEvent);
      }
    }
  }

  return (
    <div className="fd-xyflow-live">
      <div className="fd-xyflow-live__copy">
        <strong>React Flow canvas</strong>
        <span>Real xyflow adapter path for pane, selection, connect, reconnect, move, and viewport sync.</span>
      </div>
      <div className="fd-xyflow-live__surface">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={xyflowNodeTypes}
            viewport={controlledViewport as DesignerXyflowReactFlowProps['viewport']}
            fitView={false}
            nodesConnectable
            elementsSelectable
            nodesDraggable
            onMove={(_event, nextViewport) => handleViewportChange(nextViewport as XyflowViewportChange)}
            onMoveEnd={(_event, nextViewport) => handleViewportChange(nextViewport as XyflowViewportChange)}
            onPaneClick={() => {
              props.onPaneClick();
            }}
            onConnect={handleConnect}
            onReconnect={handleReconnect}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onSelectionChange={handleSelectionChange}
            onNodeClick={(_event, node) => props.onNodeSelect(node.id, {} as React.MouseEvent)}
            onEdgeClick={(_event, edge) => props.onEdgeSelect(edge.id, {} as React.MouseEvent)}
            onNodeDragStop={(_event, node) =>
              commitNodePosition(node.id, {
                x: node.position.x,
                y: node.position.y
              })
            }
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} size={1} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}

export function renderDesignerCanvasBridge(kind: DesignerCanvasAdapterKind, props: DesignerCanvasBridgeProps) {
  if (kind === 'xyflow') {
    return <DesignerXyflowCanvasBridge {...props} />;
  }

  if (kind === 'xyflow-preview') {
    return <DesignerXyflowPreviewBridge {...props} />;
  }

  return <DesignerCardCanvasBridge {...props} />;
}
