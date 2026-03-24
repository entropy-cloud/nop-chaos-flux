import React from 'react';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';

export interface FlowDesignerInspectorProps {
  snapshot: DesignerSnapshot;
  onUpdateNode: (nodeId: string, data: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  onUpdateEdge: (edgeId: string, data: Record<string, unknown>) => void;
  onDeleteEdge: (edgeId: string) => void;
}

export function FlowDesignerInspector({
  snapshot,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onDeleteEdge
}: FlowDesignerInspectorProps) {
  return (
    <div className="fd-page__inspector">
      {snapshot.activeNode ? (
        <div className="fd-inspector">
          <h3 className="fd-inspector__title">Node Properties</h3>
          <div className="fd-inspector__section">
            <label className="fd-inspector__label">Type</label>
            <div className="fd-inspector__value">{snapshot.activeNode.type}</div>
          </div>
          <div className="fd-inspector__section">
            <label className="fd-inspector__label">Label</label>
            <input
              type="text"
              className="fd-inspector__input"
              value={String(snapshot.activeNode.data.label ?? '')}
              onChange={(e) => onUpdateNode(snapshot.activeNode!.id, { label: e.target.value })}
            />
          </div>
          {Object.entries(snapshot.activeNode.data).map(([key, value]) => {
            if (key === 'label') return null;
            return (
              <div key={key} className="fd-inspector__section">
                <label className="fd-inspector__label">{key}</label>
                <input
                  type="text"
                  className="fd-inspector__input"
                  value={String(value ?? '')}
                  onChange={(e) => onUpdateNode(snapshot.activeNode!.id, { [key]: e.target.value })}
                />
              </div>
            );
          })}
          <div className="fd-inspector__actions">
            <button
              className="fd-inspector__button fd-inspector__button--danger"
              onClick={() => onDeleteNode(snapshot.activeNode!.id)}
              type="button"
            >
              Delete Node
            </button>
          </div>
        </div>
      ) : snapshot.activeEdge ? (
        <div className="fd-inspector">
          <h3 className="fd-inspector__title">Edge Properties</h3>
          <div className="fd-inspector__section">
            <label className="fd-inspector__label">Label</label>
            <input
              type="text"
              className="fd-inspector__input"
              value={String(snapshot.activeEdge.data.label ?? '')}
              onChange={(e) => onUpdateEdge(snapshot.activeEdge!.id, { label: e.target.value })}
            />
          </div>
          {Object.entries(snapshot.activeEdge.data).map(([key, value]) => {
            if (key === 'label') return null;
            return (
              <div key={key} className="fd-inspector__section">
                <label className="fd-inspector__label">{key}</label>
                <input
                  type="text"
                  className="fd-inspector__input"
                  value={String(value ?? '')}
                  onChange={(e) => onUpdateEdge(snapshot.activeEdge!.id, { [key]: e.target.value })}
                />
              </div>
            );
          })}
          <div className="fd-inspector__actions">
            <button
              className="fd-inspector__button fd-inspector__button--danger"
              onClick={() => onDeleteEdge(snapshot.activeEdge!.id)}
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
