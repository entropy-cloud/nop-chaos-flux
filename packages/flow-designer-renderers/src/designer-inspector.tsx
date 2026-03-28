import React from 'react';
import { Button, Input } from '@nop-chaos/ui';
import { useDesignerContext } from './designer-context';

export function DefaultInspector() {
  const { dispatch, snapshot } = useDesignerContext();
  const { activeNode, activeEdge } = snapshot;

  if (activeNode) {
    return (
      <div className="p-4 text-foreground">
        <h3 className="m-0 mb-4 text-sm font-semibold text-foreground">Node Properties</h3>
        <div className="mb-3">
          <label className="block mb-1 text-xs font-medium text-muted-foreground">Type</label>
          <div className="py-1.5 text-[13px] text-foreground">{activeNode.type}</div>
        </div>
        <div className="mb-3">
          <label className="block mb-1 text-xs font-medium text-muted-foreground">Label</label>
          <Input
            type="text"
            value={String(activeNode.data.label ?? '')}
            onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { label: e.target.value } })}
          />
        </div>
        {Object.entries(activeNode.data).map(([key, value]) => {
          if (key === 'label') return null;
          return (
            <div key={key} className="mb-3">
              <label className="block mb-1 text-xs font-medium text-muted-foreground">{key}</label>
              <Input
                type="text"
                value={String(value ?? '')}
                onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { [key]: e.target.value } })}
              />
            </div>
          );
        })}
        <div className="mt-4 pt-4 border-t border-border">
          <Button
            className="w-full min-h-8"
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
      <div className="p-4 text-foreground">
        <h3 className="m-0 mb-4 text-sm font-semibold text-foreground">Edge Properties</h3>
        <div className="mb-3">
          <label className="block mb-1 text-xs font-medium text-muted-foreground">Label</label>
          <Input
            type="text"
            value={String(activeEdge.data.label ?? '')}
            onChange={(e) => dispatch({ type: 'updateEdgeData', edgeId: activeEdge.id, data: { label: e.target.value } })}
          />
        </div>
        {Object.entries(activeEdge.data).map(([key, value]) => {
          if (key === 'label') return null;
          return (
            <div key={key} className="mb-3">
              <label className="block mb-1 text-xs font-medium text-muted-foreground">{key}</label>
              <Input
                type="text"
                value={String(value ?? '')}
                onChange={(e) => dispatch({ type: 'updateEdgeData', edgeId: activeEdge.id, data: { [key]: e.target.value } })}
              />
            </div>
          );
        })}
        <div className="mt-4 pt-4 border-t border-border">
          <Button
            className="w-full min-h-8"
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
    <div className="flex items-center justify-center min-h-[200px] p-4">
      <p className="text-[13px] text-muted-foreground text-center">Select a node or edge to edit its properties</p>
    </div>
  );
}
