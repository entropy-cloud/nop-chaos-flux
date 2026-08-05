import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { cn } from '@nop-chaos/ui';
import type { GraphNode } from './schemas.js';

export interface GraphNodeViewData {
  node: GraphNode;
  nodeId: string;
  index: number;
  selected: boolean;
  semanticLevel?: string;
  matching: boolean;
  content?: React.ReactNode;
  [key: string]: unknown;
}

/**
 * xyflow 节点视图（design §4.3 / §10）：
 * - 根 marker `data-slot="graph-node"` + `data-level`（语义级，levelMap 未命中不发布）
 * - 选中 `data-selected`（renderer 经 node data 下发，单选模型）、搜索命中 `data-matching`
 * - 内容优先 node region 编译产物（`content`），未提供时回退 label 文本（`data-slot="graph-node-label"`）
 */
export const GraphNodeView = memo(function GraphNodeView({ data }: NodeProps) {
  const viewData = data as unknown as GraphNodeViewData;
  const { semanticLevel, matching, selected, content, node } = viewData;
  const label = typeof node.label === 'string' ? node.label : node.id;
  return (
    <div
      data-slot="graph-node"
      data-level={semanticLevel ?? undefined}
      data-selected={selected ? 'true' : undefined}
      data-matching={matching ? 'true' : undefined}
      className={cn('nop-graph-node', semanticLevel ? `nop-graph-level-${semanticLevel}` : undefined)}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />
      {content ?? <div data-slot="graph-node-label">{label}</div>}
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
});
