import { memo } from 'react';
import type { EdgeProps } from '@xyflow/react';
import { BaseEdge, EdgeLabelRenderer } from '@xyflow/react';

import {
  BRANCH_SHORT_LEG,
  MERGE_SHORT_LEG,
  CONNECTOR_COLOR,
} from './dingflow-constants';
import type { EdgeLeg } from './dingflow-constants';
import { DINGFLOW_EDGE_LABEL_STYLE } from './dingflow-theme';

function DingFlowEdgeInner({
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  data,
}: EdgeProps) {
  const sx = Math.round(sourceX);
  const sy = Math.round(sourceY);
  const tx = Math.round(targetX);
  const ty = Math.round(targetY);

  let path: string;
  let labelX: number;
  let labelY: number;

  if (sx === tx) {
    path = `M${sx} ${sy}L${tx} ${ty}`;
    labelX = sx;
    labelY = Math.round((sy + ty) / 2);
  } else {
    const leg = (data as { leg?: EdgeLeg } | undefined)?.leg ?? 'near-target';
    const midY =
      leg === 'near-target'
        ? Math.round(ty - BRANCH_SHORT_LEG)
        : Math.round(sy + MERGE_SHORT_LEG);
    path = `M${sx} ${sy}L${sx} ${midY}L${tx} ${midY}L${tx} ${ty}`;
    labelX = Math.round((sx + tx) / 2);
    labelY = midY;
  }

  const label =
    (data as { label?: string } | undefined)?.label;

  return (
    <>
      <BaseEdge
        path={path}
        style={{ stroke: CONNECTOR_COLOR, strokeWidth: 2 }}
        markerEnd={markerEnd}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              ...DINGFLOW_EDGE_LABEL_STYLE,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DingFlowEdge = memo(DingFlowEdgeInner);
