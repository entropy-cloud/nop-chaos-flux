import React from 'react';
import type { GraphDocument, DesignerSnapshot } from '@nop-chaos/flow-designer-core';

export interface FlowDesignerCanvasProps {
  doc: GraphDocument;
  snapshot: DesignerSnapshot;
  onPaneClick: () => void;
  onNodeClick: (nodeId: string, e: React.MouseEvent) => void;
  onEdgeClick: (edgeId: string, e: React.MouseEvent) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDrop?: (nodeTypeId: string, position: { x: number; y: number }) => void;
  onNodeHover?: (nodeId: string | null) => void;
  onEdgeHover?: (edgeId: string | null) => void;
}

function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

function getNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    start: '▶',
    end: '■',
    task: '⚙',
    condition: '◇',
    parallel: '⫼',
    loop: '↻'
  };
  return icons[type] ?? '○';
}

function getChipLabel(type: string): string {
  const labels: Record<string, string> = {
    start: '开始节点',
    end: '结束节点',
    task: '任务节点',
    condition: '条件分支',
    parallel: '并行网关',
    loop: '循环节点'
  };
  return labels[type] ?? '';
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

export function FlowDesignerCanvas({
  doc,
  snapshot,
  onPaneClick,
  onNodeClick,
  onEdgeClick,
  onDuplicateNode,
  onDeleteNode,
  onDrop,
  onNodeHover,
  onEdgeHover
}: FlowDesignerCanvasProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!onDrop) return;

    const nodeTypeId = e.dataTransfer.getData('application/x-flow-designer-node-type');
    if (!nodeTypeId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    onDrop(nodeTypeId, position);
  };

  return (
    <div
      className="flow-designer-example__canvas fd-page__canvas"
      onClick={onPaneClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flow-designer-example__canvas-surface fd-canvas">
        <div className="fd-canvas__nodes">
          {doc.nodes.map((node) => (
            <div
              key={node.id}
              className={classNames(
                'fd-node',
                snapshot.selection.activeNodeId === node.id && 'fd-node--selected',
                node.type && `fd-node--${node.type}`
              )}
              style={{
                left: node.position.x,
                top: node.position.y
              }}
              onClick={(e) => onNodeClick(node.id, e)}
              onMouseEnter={() => onNodeHover?.(node.id)}
              onMouseLeave={() => onNodeHover?.(null)}
            >
              <div className="fd-node__header">
                <span className="fd-node__icon">{getNodeIcon(node.type)}</span>
                <div className="fd-node__info">
                  <div className="fd-node__title">{String(node.data.label ?? node.type)}</div>
                  <div className="fd-node__desc">{String(node.data.description ?? '')}</div>
                </div>
              </div>
              <div className="fd-node__footer">
                <span className={`fd-node__chip fd-node__chip--${node.type}`}>
                  {getChipLabel(node.type)}
                </span>
              </div>
              {snapshot.selection.activeNodeId === node.id && (
                <div className="fd-node__actions">
                  <button
                    className="fd-node__action fd-node__action--duplicate"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateNode(node.id);
                    }}
                    title="Duplicate"
                    type="button"
                  >
                    ⧉
                  </button>
                  <button
                    className="fd-node__action fd-node__action--delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNode(node.id);
                    }}
                    title="Delete"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              )}
              {getNodePorts(node.type).map((port) => (
                <div
                  key={port.id}
                  className={classNames(
                    'fd-port',
                    `fd-port--${port.direction}`,
                    `fd-port--${port.position}`
                  )}
                  title={port.label ?? port.id}
                />
              ))}
            </div>
          ))}
        </div>
        <svg className="fd-canvas__edges">
          {doc.edges.map((edge) => {
            const sourceNode = doc.nodes.find((n) => n.id === edge.source);
            const targetNode = doc.nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const sourceX = sourceNode.position.x + 160;
            const sourceY = sourceNode.position.y + 30;
            const targetX = targetNode.position.x;
            const targetY = targetNode.position.y + 30;

            const midX = (sourceX + targetX) / 2;
            const edgeLabel = edge.data.label != null ? String(edge.data.label) : null;

            return (
              <g
                key={edge.id}
                className={classNames('fd-edge', snapshot.selection.activeEdgeId === edge.id && 'fd-edge--selected')}
                onClick={(e) => onEdgeClick(edge.id, e as unknown as React.MouseEvent)}
                onMouseEnter={() => onEdgeHover?.(edge.id)}
                onMouseLeave={() => onEdgeHover?.(null)}
              >
                <path
                  className="fd-edge__path"
                  d={`M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`}
                  markerEnd="url(#flow-designer-example-arrowhead)"
                />
                {edgeLabel && (
                  <text
                    className="fd-edge__label"
                    x={midX}
                    y={(sourceY + targetY) / 2 - 10}
                    textAnchor="middle"
                  >
                    {edgeLabel}
                  </text>
                )}
                {snapshot.selection.activeEdgeId === edge.id && (
                  <g
                    className="fd-edge__action"
                    transform={`translate(${midX + 20}, ${(sourceY + targetY) / 2 + 5})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdgeClick(edge.id, e as unknown as React.MouseEvent);
                    }}
                  >
                    <circle className="fd-edge__action-circle--delete" r={10} />
                    <text className="fd-edge__action-text" textAnchor="middle" dy={4} fontSize={14}>
                      ×
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          <defs>
            <marker
              id="flow-designer-example-arrowhead"
              markerWidth={10}
              markerHeight={7}
              refX={9}
              refY={3.5}
              orient="auto"
            >
              <polygon className="fd-edge__arrow" points="0 0, 10 3.5, 0 7" />
            </marker>
          </defs>
        </svg>
        <div className="fd-canvas__info">
          Nodes: {doc.nodes.length} | Edges: {doc.edges.length}
        </div>
      </div>
    </div>
  );
}
