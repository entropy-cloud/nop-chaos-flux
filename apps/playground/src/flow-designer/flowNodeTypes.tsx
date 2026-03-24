import { Handle, Position, type NodeProps, type EdgeProps } from '@xyflow/react';

export function createFlowNodeTypes(onSelect: (nodeId: string | null) => void) {
  return {
    default: function FlowNode({ id, data, selected }: NodeProps) {
      const label = data?.label ?? id;
      return (
        <div
          className={`flow-node ${selected ? 'flow-node--selected' : ''}`}
          onClick={() => onSelect(id)}
        >
          <Handle type="target" position={Position.Top} className="flow-node__handle" />
          <div className="flow-node__content">
            <div className="flow-node__label">{String(label)}</div>
          </div>
          <Handle type="source" position={Position.Bottom} className="flow-node__handle" />
        </div>
      );
    }
  };
}

export function createFlowEdgeTypes() {
  return {
    default: function FlowEdge({ id, sourceX, sourceY, targetX, targetY, selected }: EdgeProps) {
      const midX = (sourceX + targetX) / 2;
      const midY = (sourceY + targetY) / 2;
      
      return (
        <g className={`flow-edge ${selected ? 'flow-edge--selected' : ''}`}>
          <path
            className="flow-edge__path"
            d={`M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`}
          />
        </g>
      );
    }
  };
}
