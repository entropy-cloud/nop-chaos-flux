import { memo } from 'react';
import { BaseEdge, MarkerType, type EdgeProps, type DefaultEdgeOptions } from '@xyflow/react';
import { type EdgeLeg, BRANCH_SHORT_LEG, CONNECTOR_COLOR, MERGE_SHORT_LEG } from './types.js';

function DingTalkEdgeInner({ sourceX, sourceY, targetX, targetY, markerEnd, data }: EdgeProps) {
  const sx = Math.round(sourceX);
  const sy = Math.round(sourceY);
  const tx = Math.round(targetX);
  const ty = Math.round(targetY);

  let path: string;
  if (sx === tx) {
    path = `M${sx} ${sy}L${tx} ${ty}`;
  } else {
    const leg = (data as { leg?: EdgeLeg } | undefined)?.leg ?? 'near-target';
    const midY =
      leg === 'near-target' ? Math.round(ty - BRANCH_SHORT_LEG) : Math.round(sy + MERGE_SHORT_LEG);
    path = `M${sx} ${sy}L${sx} ${midY}L${tx} ${midY}L${tx} ${ty}`;
  }

  return (
    <BaseEdge
      path={path}
      style={{ stroke: CONNECTOR_COLOR, strokeWidth: 2 }}
      markerEnd={markerEnd}
    />
  );
}

export const DingTalkEdge = memo(DingTalkEdgeInner);

export const defaultEdgeOptions: DefaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed, color: CONNECTOR_COLOR },
};
