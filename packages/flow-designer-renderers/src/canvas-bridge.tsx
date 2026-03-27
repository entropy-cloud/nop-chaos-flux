import React from 'react';
import {
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
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

export const DESIGNER_PALETTE_NODE_MIME = 'application/x-flow-designer-node-type';

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
  showMinimap?: boolean;
  showControls?: boolean;
  onPaneClick(): void;
  onNodeSelect(nodeId: string, event?: React.MouseEvent): void;
  onEdgeSelect(edgeId: string, event?: React.MouseEvent): void;
  onStartConnection(nodeId: string, event?: React.MouseEvent): void;
  onCancelConnection(nodeId: string, event?: React.MouseEvent): void;
  onCompleteConnection(nodeId: string, event?: React.MouseEvent): void;
  onStartReconnect(edgeId: string, event?: React.MouseEvent): void;
  onCancelReconnect(edgeId: string, event?: React.MouseEvent): void;
  onCompleteReconnect(edgeId: string, sourceId: string, targetId: string, event?: React.MouseEvent): void;
  onDuplicateNode(nodeId: string, event?: React.MouseEvent): void;
  onDeleteNode(nodeId: string, event?: React.MouseEvent): void;
  onDeleteEdge(edgeId: string, event?: React.MouseEvent): void;
  onMoveNode(nodeId: string, event?: React.MouseEvent, position?: { x: number; y: number }): void;
  onViewportChange(viewport: { x: number; y: number; zoom: number }, event?: React.MouseEvent): void;
  onNodeDoubleClick?(nodeId: string, event?: React.MouseEvent): void;
  onEdgeDoubleClick?(edgeId: string, event?: React.MouseEvent): void;
  onNodeHover?(nodeId: string | null, event?: React.MouseEvent): void;
  onEdgeHover?(edgeId: string | null, event?: React.MouseEvent): void;
  onDrop?(nodeTypeId: string, position: { x: number; y: number }): void;
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

interface DesignerXyflowControlledViewport {
  x: number;
  y: number;
  zoom: number;
}

interface DesignerFlowNodeData extends Record<string, unknown> {
  label: string;
  typeLabel: string;
  typeId: string;
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
    },
    width: 180,
    height: 60
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
              top: node.position.y
            }}
            onClick={(event) => props.onNodeSelect(node.id, event)}
          >
            <div className="fd-node__header">
              <span className="fd-node__icon">{getNodeIcon(node.type)}</span>
              <div>
                <div className="fd-node__title">{String(node.data.label ?? node.type)}</div>
                <div className="fd-node__type">{node.type}</div>
              </div>
            </div>
            {selection.activeNodeId === node.id && (
              <div className="fd-node__actions">
                <button
                  className="fd-node__action fd-node__action--duplicate"
                  onClick={(event) => props.onDuplicateNode(node.id, event)}
                  title="Duplicate"
                  type="button"
                >
                  D
                </button>
                <button
                  className="fd-node__action fd-node__action--connect"
                  onClick={(event) => props.onStartConnection(node.id, event)}
                  title="Connect"
                  type="button"
                >
                  C
                </button>
                <button
                  className="fd-node__action fd-node__action--move"
                  onClick={(event) => props.onMoveNode(node.id, event)}
                  title="Move"
                  type="button"
                >
                  M
                </button>
                <button
                  className="fd-node__action fd-node__action--delete"
                  onClick={(event) => props.onDeleteNode(node.id, event)}
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
                className={classNames(
                  'fd-port',
                  `fd-port--${port.direction}`,
                  port.position ? `fd-port--${port.position}` : undefined
                )}
                title={port.label ?? port.id}
              />
            ))}
            <div className="fd-node__bridge-actions">
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
                    <button
                      type="button"
                      onClick={(event) => props.onCompleteReconnect(reconnectingEdge.id, reconnectingEdge.source, node.id, event)}
                    >
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
              className={classNames('fd-edge', selection.activeEdgeId === edge.id && 'fd-edge--selected')}
              onClick={(event) => props.onEdgeSelect(edge.id, event as unknown as React.MouseEvent)}
            >
              <path
                className="fd-edge__path"
                d={`M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`}
                markerEnd="url(#arrowhead)"
              />
              {edgeLabel ? (
                <text
                  className="fd-edge__label"
                  x={midX}
                  y={(sourceY + targetY) / 2 - 10}
                  textAnchor="middle"
                >
                  {edgeLabel}
                </text>
              ) : null}
              {selection.activeEdgeId === edge.id ? (
                <g
                  className="fd-edge__action"
                  transform={`translate(${midX + 20}, ${(sourceY + targetY) / 2 + 5})`}
                  onClick={(event) => props.onDeleteEdge(edge.id, event as unknown as React.MouseEvent)}
                >
                  <circle className="fd-edge__action-circle--delete" r={10} />
                  <text className="fd-edge__action-text" textAnchor="middle" dy={4} fontSize={14}>
                    X
                  </text>
                </g>
              ) : null}
              {selection.activeEdgeId === edge.id ? (
                <g
                  className="fd-edge__action"
                  transform={`translate(${midX - 10}, ${(sourceY + targetY) / 2 + 5})`}
                  onClick={(event) => props.onStartReconnect(edge.id, event as unknown as React.MouseEvent)}
                >
                  <circle className="fd-edge__action-circle--reconnect" r={10} />
                  <text className="fd-edge__action-text" textAnchor="middle" dy={4} fontSize={12}>
                    R
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
        <defs>
          <marker id="arrowhead" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon className="fd-edge__arrow" points="0 0, 10 3.5, 0 7" />
          </marker>
        </defs>
      </svg>
      <div
        className="fd-canvas__info"
      >
        Nodes: {doc.nodes.length} | Edges: {doc.edges.length}
        <button
          className="fd-canvas__mini-button"
          type="button"
          title="Zoom in"
          onClick={(event) => props.onViewportChange({ x: props.snapshot.viewport.x, y: props.snapshot.viewport.y, zoom: props.snapshot.viewport.zoom + 0.1 }, event)}
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
                    onClick={(event) => props.onCompleteReconnect(reconnectingEdge.id, reconnectingEdge.source, node.id, event)}
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
  const xyflowNodeTypes = React.useMemo(() => ({
    designerNode: DesignerXyflowNode
  }), []);
  const snapshotNodes = React.useMemo(() => createXyflowNodes(props.snapshot), [props.snapshot]);
  const snapshotEdges = React.useMemo(() => createXyflowEdges(props.snapshot), [props.snapshot]);
  const viewport = React.useMemo(
    () => normalizeControlledViewport(props.snapshot.doc.viewport ?? props.snapshot.viewport),
    [props.snapshot.doc.viewport, props.snapshot.viewport]
  );
  const [controlledViewport, setControlledViewport] = React.useState<DesignerXyflowControlledViewport>(viewport);
  const [localNodes, setLocalNodes] = React.useState<Node[]>(() => snapshotNodes);
  const lastCommittedPositionsRef = React.useRef<Map<string, string>>(new Map());
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMinimap = props.showMinimap !== false;
  const showControls = props.showControls !== false;

  React.useEffect(() => {
    setControlledViewport((current) => (viewportsEqual(current, viewport) ? current : viewport));
  }, [viewport]);

  React.useEffect(() => {
    const snapshotPositionMap = new Map(
      snapshotNodes.map((node) => [node.id, normalizePositionSignature(node.position)])
    );
    
    setLocalNodes((currentNodes) => {
      if (currentNodes.length === 0) {
        return snapshotNodes;
      }
      
      const lastCommitted = lastCommittedPositionsRef.current;
      const mergedNodes = snapshotNodes.map((snapshotNode) => {
        const localNode = currentNodes.find((n) => n.id === snapshotNode.id);
        if (!localNode) {
          return snapshotNode;
        }
        
        const snapshotSignature = snapshotPositionMap.get(snapshotNode.id);
        const committedSignature = lastCommitted.get(snapshotNode.id);
        
        if (committedSignature && snapshotSignature === committedSignature) {
          return localNode;
        }
        
        return snapshotNode;
      });
      
      return mergedNodes;
    });
  }, [snapshotNodes]);

  function handleNodesChange(changes: NodeChange[]) {
    setLocalNodes((currentNodes) => applyNodeChanges(changes, currentNodes));

    for (const change of changes) {
      if (change.type === 'remove') {
        props.onDeleteNode(change.id, undefined);
        lastCommittedPositionsRef.current.delete(change.id);
        continue;
      }

      if (change.type === 'position' && change.dragging === false && change.position) {
        const position = {
          x: Math.round(change.position.x),
          y: Math.round(change.position.y)
        };
        const signature = normalizePositionSignature(position);
        lastCommittedPositionsRef.current.set(change.id, signature);
        props.onMoveNode(change.id, undefined, position);
      }
    }
  }

  function handleViewportChange(nextViewport: XyflowViewportChange) {
    const normalized = normalizeViewportChange(nextViewport);
    if (!normalized) {
      return;
    }

    setControlledViewport((current) => (viewportsEqual(current, normalized) ? current : normalized));

    if (!viewportsEqual(viewport, normalized)) {
      props.onViewportChange(normalized, undefined);
    }
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return;
    }

    props.onStartConnection(connection.source, undefined);
    props.onCompleteConnection(connection.target, undefined);
  }

  const handleReconnect = React.useCallback<NonNullable<OnReconnect>>(
    (oldEdge, newConnection) => {
      if (!oldEdge.id || !newConnection.source || !newConnection.target || newConnection.source === newConnection.target) {
        return;
      }

      props.onStartReconnect(oldEdge.id, undefined);
      props.onCompleteReconnect(oldEdge.id, newConnection.source, newConnection.target, undefined);
    },
    [props]
  );

  const lastSelectionRef = React.useRef<{ nodeId: string | null; edgeId: string | null }>({
    nodeId: null,
    edgeId: null
  });

  function handleSelectionChange(selection: OnSelectionChangeParams) {
    if (selection.nodes.length > 0) {
      const nodeId = selection.nodes[0].id;
      if (lastSelectionRef.current.nodeId !== nodeId) {
        lastSelectionRef.current = { nodeId, edgeId: null };
        props.onNodeSelect(nodeId, undefined);
      }
      return;
    }

    if (selection.edges.length > 0) {
      const edgeId = selection.edges[0].id;
      if (lastSelectionRef.current.edgeId !== edgeId) {
        lastSelectionRef.current = { nodeId: null, edgeId };
        props.onEdgeSelect(edgeId, undefined);
      }
      return;
    }

    if (lastSelectionRef.current.nodeId || lastSelectionRef.current.edgeId) {
      lastSelectionRef.current = { nodeId: null, edgeId: null };
      props.onPaneClick();
    }
  }

  function handleEdgesChange(changes: EdgeChange[]) {
    for (const change of changes) {
      if (change.type === 'remove') {
        props.onDeleteEdge(change.id, undefined);
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
            nodes={localNodes}
            edges={snapshotEdges}
            nodeTypes={xyflowNodeTypes}
            defaultViewport={controlledViewport}
            fitView
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
            onNodeClick={(_event, node) => props.onNodeSelect(node.id, undefined)}
            onEdgeClick={(_event, edge) => props.onEdgeSelect(edge.id, undefined)}
            proOptions={{ hideAttribution: true }}
            onNodeMouseEnter={(_e, node) => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
              }
              props.onNodeHover?.(node.id, undefined);
            }}
            onNodeMouseLeave={() => {
              hoverTimeoutRef.current = setTimeout(() => {
                props.onNodeHover?.(null, undefined);
              }, 160);
            }}
            onEdgeMouseEnter={(_e, edge) => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
              }
              props.onEdgeHover?.(edge.id, undefined);
            }}
            onEdgeMouseLeave={() => {
              hoverTimeoutRef.current = setTimeout(() => {
                props.onEdgeHover?.(null, undefined);
              }, 160);
            }}
            onNodeDoubleClick={(_event, node) => {
              props.onNodeDoubleClick?.(node.id, undefined);
            }}
            onEdgeDoubleClick={(_event, edge) => {
              props.onEdgeDoubleClick?.(edge.id, undefined);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const nodeTypeId = event.dataTransfer.getData(DESIGNER_PALETTE_NODE_MIME);
              if (!nodeTypeId || !props.onDrop) return;
              
              // Get the position relative to the canvas
              const reactFlowBounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
              if (!reactFlowBounds) return;
              
              const position = {
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top
              };
              
              props.onDrop(nodeTypeId, position);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
          >
            <Background gap={24} size={1} />
            {showMinimap && <MiniMap pannable zoomable style={{ background: 'rgba(255,255,255,0.9)' }} />}
            {showControls && <Controls showInteractive={false} />}
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
