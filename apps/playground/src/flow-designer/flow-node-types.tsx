import { Handle, Position, type NodeProps, type EdgeProps } from '@xyflow/react';

export function createFlowNodeTypes(onSelect: (nodeId: string | null) => void) {
  return {
    default: function FlowNode({ id, data, selected }: NodeProps) {
      const label = data?.label ?? id;
      return (
        <div
          data-slot="flow-node"
          data-selected={selected ? '' : undefined}
          onClick={() => onSelect(id)}
        >
          <Handle type="target" position={Position.Top} className="flow-node-handle" data-slot="flow-node-handle" />
          <div data-slot="flow-node-content">
            <div data-slot="flow-node-label">{String(label)}</div>
          </div>
          <Handle type="source" position={Position.Bottom} className="flow-node-handle" data-slot="flow-node-handle" />
        </div>
      );
    }
  };
}

export function createFlowEdgeTypes() {
  return {
    default: function FlowEdge({ sourceX, sourceY, targetX, targetY, selected }: EdgeProps) {
      const midX = (sourceX + targetX) / 2;
      
      return (
        <g data-slot="flow-edge" data-selected={selected ? '' : undefined}>
          <path
            data-slot="flow-edge-path"
            d={`M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`}
          />
        </g>
      );
    }
  };
}
