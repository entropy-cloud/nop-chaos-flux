import React from 'react';
import { Button, Input } from '@nop-chaos/ui';
import { useDesignerContext } from './designer-context';

export function DefaultInspector() {
  const { dispatch, snapshot } = useDesignerContext();
  const { activeNode, activeEdge } = snapshot;

  if (activeNode) {
    return (
      <div className="fd-inspector">
        <h3 className="fd-inspector__title">Node Properties</h3>
        <div className="fd-inspector__section">
          <label className="fd-inspector__label">Type</label>
          <div className="fd-inspector__value">{activeNode.type}</div>
        </div>
        <div className="fd-inspector__section">
          <label className="fd-inspector__label">Label</label>
          <Input
            type="text"
            className="fd-inspector__input"
            value={String(activeNode.data.label ?? '')}
            onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { label: e.target.value } })}
          />
        </div>
        {Object.entries(activeNode.data).map(([key, value]) => {
          if (key === 'label') return null;
          return (
            <div key={key} className="fd-inspector__section">
              <label className="fd-inspector__label">{key}</label>
              <Input
                type="text"
                className="fd-inspector__input"
                value={String(value ?? '')}
                onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { [key]: e.target.value } })}
              />
            </div>
          );
        })}
        <div className="fd-inspector__actions">
          <Button
            className="fd-inspector__button fd-inspector__button--danger"
            variant="destructive"
            size="sm"
            onClick={() => dispatch({ type: 'deleteNode', nodeId: activeNode.id })}
          >
            Delete Node
          </Button>
        </div>
      </div>
    );
  }

  if (activeEdge) {
    return (
      <div className="fd-inspector">
        <h3 className="fd-inspector__title">Edge Properties</h3>
        <div className="fd-inspector__section">
          <label className="fd-inspector__label">Label</label>
          <Input
            type="text"
            className="fd-inspector__input"
            value={String(activeEdge.data.label ?? '')}
            onChange={(e) => dispatch({ type: 'updateEdgeData', edgeId: activeEdge.id, data: { label: e.target.value } })}
          />
        </div>
        {Object.entries(activeEdge.data).map(([key, value]) => {
          if (key === 'label') return null;
          return (
            <div key={key} className="fd-inspector__section">
              <label className="fd-inspector__label">{key}</label>
              <Input
                type="text"
                className="fd-inspector__input"
                value={String(value ?? '')}
                onChange={(e) => dispatch({ type: 'updateEdgeData', edgeId: activeEdge.id, data: { [key]: e.target.value } })}
              />
            </div>
          );
        })}
        <div className="fd-inspector__actions">
          <Button
            className="fd-inspector__button fd-inspector__button--danger"
            variant="destructive"
            size="sm"
            onClick={() => dispatch({ type: 'deleteEdge', edgeId: activeEdge.id })}
          >
            Delete Edge
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fd-inspector fd-inspector--empty">
      <p className="fd-inspector__empty-text">Select a node or edge to edit its properties</p>
    </div>
  );
}
