import React from 'react';

export interface FlowDesignerHoverToolbarProps {
  nodeId: string | null;
  edgeId: string | null;
  onEditNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onEditEdge: (edgeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
}

export function FlowDesignerHoverToolbar({
  nodeId,
  edgeId,
  onEditNode,
  onDuplicateNode,
  onDeleteNode,
  onEditEdge,
  onDeleteEdge
}: FlowDesignerHoverToolbarProps) {
  if (!nodeId && !edgeId) {
    return null;
  }

  return (
    <div className="fd-hover-toolbar">
      {nodeId && (
        <div className="fd-hover-toolbar__group">
          <button
            className="fd-hover-toolbar__button"
            onClick={() => onEditNode(nodeId)}
            title="Edit node"
            type="button"
          >
            ✏️
          </button>
          <button
            className="fd-hover-toolbar__button"
            onClick={() => onDuplicateNode(nodeId)}
            title="Duplicate node"
            type="button"
          >
            ⧉
          </button>
          <button
            className="fd-hover-toolbar__button fd-hover-toolbar__button--danger"
            onClick={() => onDeleteNode(nodeId)}
            title="Delete node"
            type="button"
          >
            ×
          </button>
        </div>
      )}
      {edgeId && (
        <div className="fd-hover-toolbar__group">
          <button
            className="fd-hover-toolbar__button"
            onClick={() => onEditEdge(edgeId)}
            title="Edit edge"
            type="button"
          >
            ✏️
          </button>
          <button
            className="fd-hover-toolbar__button fd-hover-toolbar__button--danger"
            onClick={() => onDeleteEdge(edgeId)}
            title="Delete edge"
            type="button"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
