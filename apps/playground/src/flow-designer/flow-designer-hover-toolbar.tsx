import React from 'react';
import { Button } from '@nop-chaos/ui';

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
  onDeleteEdge,
}: FlowDesignerHoverToolbarProps) {
  if (!nodeId && !edgeId) {
    return null;
  }

  return (
    <div data-slot="flow-designer-hover-toolbar">
      {nodeId && (
        <div data-slot="flow-designer-hover-toolbar-group">
          <Button variant="ghost" size="icon" onClick={() => onEditNode(nodeId)} title="Edit node">
            ✏️
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDuplicateNode(nodeId)}
            title="Duplicate node"
          >
            ⧉
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => onDeleteNode(nodeId)}
            title="Delete node"
          >
            ×
          </Button>
        </div>
      )}
      {edgeId && (
        <div data-slot="flow-designer-hover-toolbar-group">
          <Button variant="ghost" size="icon" onClick={() => onEditEdge(edgeId)} title="Edit edge">
            ✏️
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => onDeleteEdge(edgeId)}
            title="Delete edge"
          >
            ×
          </Button>
        </div>
      )}
    </div>
  );
}
