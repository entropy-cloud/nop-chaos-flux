import { memo } from 'react';
import type { EdgeProps } from '@xyflow/react';
import { BaseEdge } from '@xyflow/react';
import type { TreeEdgeRuntimeGeometry } from '@nop-chaos/flow-designer-core';
import { useEdgeTypeConfig } from '../designer-context.js';

import { CONNECTOR_COLOR, MAX_RENDERED_STROKE, MIN_RENDERED_STROKE } from './dingflow-constants.js';

function getTreeGeometry(data: unknown): TreeEdgeRuntimeGeometry | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  return (data as Record<string, unknown>).__fdTree as TreeEdgeRuntimeGeometry | undefined;
}

function resolveStrokeWidth(configured: number | undefined, focused: boolean): number {
  const base = configured ?? 2;
  const next = focused ? Math.max(base + 1, 3) : base;
  return Math.min(Math.max(next, MIN_RENDERED_STROKE), MAX_RENDERED_STROKE);
}

function DingFlowEdgeInner({ sourceX, sourceY, targetX, targetY, data, type }: EdgeProps) {
  const sx = Math.round(sourceX);
  const sy = Math.round(sourceY);
  const tx = Math.round(targetX);
  const ty = Math.round(targetY);

  const edgeData = (data as Record<string, unknown> | undefined) ?? {};
  const typeId: string = (edgeData.typeId as string | undefined) ?? type ?? 'default';
  const edgeType = useEdgeTypeConfig(typeId);
  const appearance = edgeType?.appearance;
  const focused = edgeData.__fdBranchFocused === true;
  const geometry = getTreeGeometry(data);

  const strokeWidth = resolveStrokeWidth(appearance?.strokeWidth as number | undefined, focused);
  const edgeStyle: Record<string, string | number> = {
    stroke: focused
      ? 'hsl(var(--primary))'
      : (appearance?.stroke ?? CONNECTOR_COLOR),
    strokeWidth,
    strokeLinecap: 'butt',
    strokeLinejoin: 'round',
  };

  const strokeStyle = appearance?.strokeStyle as string | undefined;
  if (strokeStyle === 'dashed') {
    edgeStyle.strokeDasharray = '6,4';
  } else if (strokeStyle === 'dotted') {
    edgeStyle.strokeDasharray = '2,4';
  }

  let path: string;

  if (geometry?.kind === 'split' || geometry?.kind === 'merge') {
    const isTB = geometry.direction !== 'LR';
    const lineMain = geometry.lineMain;
    const ownerCross = isTB ? sx : sy;
    const targetCross = isTB ? tx : ty;
    const ownerMain = isTB ? sy : sx;
    const targetMain = isTB ? ty : tx;
    if (lineMain === undefined) {
      path = `M${sx} ${sy}L${tx} ${ty}`;
    } else if (isTB) {
      path = `M${ownerCross} ${ownerMain}L${ownerCross} ${lineMain}L${targetCross} ${lineMain}L${targetCross} ${targetMain}`;
    } else {
      path = `M${ownerMain} ${ownerCross}L${lineMain} ${ownerCross}L${lineMain} ${targetCross}L${targetMain} ${targetCross}`;
    }
  } else {
    path = `M${sx} ${sy}L${tx} ${ty}`;
  }

  return (
    <BaseEdge
      path={path}
      style={edgeStyle}
      markerEnd={undefined}
    />
  );
}

export const DingFlowEdge = memo(DingFlowEdgeInner);
