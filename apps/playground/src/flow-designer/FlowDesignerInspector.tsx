import React from 'react';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';

export interface FlowDesignerInspectorProps {
  snapshot: DesignerSnapshot;
  onUpdateNode: (nodeId: string, data: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  onUpdateEdge: (edgeId: string, data: Record<string, unknown>) => void;
  onDeleteEdge: (edgeId: string) => void;
}

function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

function NodeTypeBadge({ type }: { type: string }) {
  const icons: Record<string, string> = {
    start: '▶',
    end: '■',
    task: '⚙',
    condition: '◇',
    parallel: '⫼',
    loop: '↻'
  };
  return (
    <span className={classNames('fd-type-badge', `fd-type-badge--${type}`)}>
      {icons[type] ?? '○'} {type}
    </span>
  );
}

function NodeSpecificFields({
  nodeType,
  data,
  onUpdate
}: {
  nodeType: string;
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}) {
  switch (nodeType) {
    case 'condition':
      return (
        <div className="fd-inspector__section">
          <label className="fd-inspector__label">Condition Expression</label>
          <textarea
            className="fd-inspector__textarea"
            rows={3}
            value={String(data.condition ?? '')}
            onChange={(e) => onUpdate({ condition: e.target.value })}
            placeholder="e.g., status === 'approved'"
          />
        </div>
      );
    case 'loop':
      return (
        <>
          <div className="fd-inspector__section">
            <label className="fd-inspector__label">Collection Expression</label>
            <input
              type="text"
              className="fd-inspector__input"
              value={String(data.collection ?? '')}
              onChange={(e) => onUpdate({ collection: e.target.value })}
              placeholder="e.g., items"
            />
          </div>
          <div className="fd-inspector__section">
            <label className="fd-inspector__label">Variable Name</label>
            <input
              type="text"
              className="fd-inspector__input"
              value={String(data.variable ?? 'item')}
              onChange={(e) => onUpdate({ variable: e.target.value })}
              placeholder="item"
            />
          </div>
        </>
      );
    case 'parallel':
      return (
        <div className="fd-inspector__section">
          <label className="fd-inspector__label">Branch Count</label>
          <input
            type="number"
            className="fd-inspector__input"
            min={2}
            max={10}
            value={Number(data.branchCount ?? 2)}
            onChange={(e) => onUpdate({ branchCount: parseInt(e.target.value, 10) })}
          />
        </div>
      );
    case 'task':
      return (
        <div className="fd-inspector__section">
          <label className="fd-inspector__label">Service Name</label>
          <input
            type="text"
            className="fd-inspector__input"
            value={String(data.serviceName ?? '')}
            onChange={(e) => onUpdate({ serviceName: e.target.value })}
            placeholder="e.g., myService"
          />
        </div>
      );
    case 'start':
    case 'end':
    default:
      return null;
  }
}

export function FlowDesignerInspector({
  snapshot,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge
}: FlowDesignerInspectorProps) {
  const node = snapshot.activeNode;
  const edge = snapshot.activeEdge;

  const handleNodeUpdate = (data: Record<string, unknown>) => {
    if (node) {
      onUpdateNode(node.id, data);
    }
  };

  const handleEdgeUpdate = (data: Record<string, unknown>) => {
    if (edge) {
      onUpdateEdge(edge.id, data);
    }
  };

  return (
    <div className="fd-page__inspector">
      {node ? (
        <div className="fd-inspector">
          <h3 className="fd-inspector__title">Node Properties</h3>
          <div className="fd-inspector__section">
            <NodeTypeBadge type={node.type} />
          </div>
          <div className="fd-inspector__section">
            <label className="fd-inspector__label">Label</label>
            <input
              type="text"
              className="fd-inspector__input"
              value={String(node.data.label ?? '')}
              onChange={(e) => handleNodeUpdate({ label: e.target.value })}
              placeholder="Enter node label"
            />
          </div>
          <div className="fd-inspector__section">
            <label className="fd-inspector__label">Description</label>
            <textarea
              className="fd-inspector__textarea"
              rows={2}
              value={String(node.data.description ?? '')}
              onChange={(e) => handleNodeUpdate({ description: e.target.value })}
              placeholder="Enter description"
            />
          </div>
          <NodeSpecificFields
            nodeType={node.type}
            data={node.data}
            onUpdate={handleNodeUpdate}
          />
          <div className="fd-inspector__actions">
            <button
              className="fd-inspector__button fd-inspector__button--danger"
              onClick={() => onDeleteNode(node.id)}
              type="button"
            >
              Delete Node
            </button>
          </div>
        </div>
      ) : edge ? (
        <div className="fd-inspector">
          <h3 className="fd-inspector__title">Edge Properties</h3>
          <div className="fd-inspector__section">
            <label className="fd-inspector__label">Label</label>
            <input
              type="text"
              className="fd-inspector__input"
              value={String(edge.data.label ?? '')}
              onChange={(e) => handleEdgeUpdate({ label: e.target.value })}
              placeholder="Enter edge label"
            />
          </div>
          <div className="fd-inspector__section">
            <label className="fd-inspector__label">Condition</label>
            <input
              type="text"
              className="fd-inspector__input"
              value={String(edge.data.condition ?? '')}
              onChange={(e) => handleEdgeUpdate({ condition: e.target.value })}
              placeholder="e.g., status === 'approved'"
            />
          </div>
          <div className="fd-inspector__section">
            <label className="fd-inspector__label">Line Style</label>
            <select
              className="fd-inspector__select"
              value={String(edge.data.lineStyle ?? 'solid')}
              onChange={(e) => handleEdgeUpdate({ lineStyle: e.target.value })}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>
          <div className="fd-inspector__actions">
            <button
              className="fd-inspector__button fd-inspector__button--danger"
              onClick={() => onDeleteEdge(edge.id)}
              type="button"
            >
              Delete Edge
            </button>
          </div>
        </div>
      ) : (
        <div className="fd-inspector fd-inspector--empty">
          <p className="fd-inspector__empty-text">Select a node or edge to edit its properties</p>
        </div>
      )}
    </div>
  );
}
