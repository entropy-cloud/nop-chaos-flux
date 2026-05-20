import { memo } from 'react';
import type { EdgeProps } from '@xyflow/react';
import { BaseEdge, EdgeLabelRenderer } from '@xyflow/react';
import { isSchema } from '@nop-chaos/flux-core';
import { RenderNodes } from '@nop-chaos/flux-react/unstable';
import { useEdgeTypeConfig } from '../designer-context.js';

import { BRANCH_SHORT_LEG, MERGE_SHORT_LEG, CONNECTOR_COLOR } from './dingflow-constants.js';
import type { EdgeLeg } from './dingflow-constants.js';

function DingFlowEdgeInner({ sourceX, sourceY, targetX, targetY, markerEnd, data, id, type }: EdgeProps) {
  const sx = Math.round(sourceX);
  const sy = Math.round(sourceY);
  const tx = Math.round(targetX);
  const ty = Math.round(targetY);

  const edgeData = (data as Record<string, unknown> | undefined) ?? {};
  const typeId: string = (edgeData.typeId as string | undefined) ?? type ?? 'default';
  const edgeType = useEdgeTypeConfig(typeId);
  const appearance = edgeType?.appearance;

  const edgeStyle: Record<string, string | number> = {
    stroke: edgeData.__fdBranchFocused
      ? 'var(--primary)'
      : (appearance?.stroke ?? CONNECTOR_COLOR),
    strokeWidth: edgeData.__fdBranchFocused
      ? Math.max((appearance?.strokeWidth as number ?? 2) + 1, 3)
      : (appearance?.strokeWidth ?? 2),
  };

  const strokeStyle = appearance?.strokeStyle as string | undefined;
  if (strokeStyle === 'dashed') {
    edgeStyle.strokeDasharray = '6,4';
  } else if (strokeStyle === 'dotted') {
    edgeStyle.strokeDasharray = '2,4';
  }

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
      leg === 'near-target' ? Math.round(ty - BRANCH_SHORT_LEG) : Math.round(sy + MERGE_SHORT_LEG);
    path = `M${sx} ${sy}L${sx} ${midY}L${tx} ${midY}L${tx} ${ty}`;
    labelX = Math.round((sx + tx) / 2);
    labelY = midY;
  }

  const label = (data as { label?: string } | undefined)?.label;
  const hasBody = edgeType?.body && isSchema(edgeType.body);

  return (
    <>
      <BaseEdge
        path={path}
        style={edgeStyle}
        markerEnd={
          appearance?.markerEnd && appearance.markerEnd !== 'none'
            ? `url(#${appearance.markerEnd})`
            : markerEnd
        }
      />
      {(label || hasBody) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: 12,
              background: 'var(--fd-panel-bg, var(--nop-surface, #fff))',
              border: '1px solid var(--fd-border, var(--nop-border, #e0e0e0))',
              borderRadius: 9999,
              padding: '2px 8px',
              pointerEvents: 'all',
            }}
          >
            {hasBody ? (
              <RenderNodes
                input={edgeType.body}
                options={{
                  bindings: { data: edgeData, ...edgeData },
                  scopeKey: `edge:${id}`,
                  pathSuffix: 'edge',
                }}
              />
            ) : (
              label
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DingFlowEdge = memo(DingFlowEdgeInner);
