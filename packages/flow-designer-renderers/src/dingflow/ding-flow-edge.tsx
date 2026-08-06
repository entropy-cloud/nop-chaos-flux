import { memo } from 'react';
import type { EdgeProps } from '@xyflow/react';
import { BaseEdge, EdgeLabelRenderer } from '@xyflow/react';
import type { TreeEdgeRuntimeGeometry } from '@nop-chaos/flow-designer-core';
import { useEdgeTypeConfig } from '../designer-context.js';

import { CONNECTOR_COLOR, MAX_RENDERED_STROKE, MIN_RENDERED_STROKE } from './dingflow-constants.js';

const BRANCH_LABEL_MAX_WIDTH = 160;

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

  const branchLabel =
    geometry?.kind === 'split' &&
    typeof edgeData.label === 'string' &&
    edgeData.label.trim().length > 0
      ? edgeData.label.trim()
      : undefined;

  let labelX = 0;
  let labelY = 0;
  if (branchLabel && geometry?.lineMain !== undefined) {
    const isTB = geometry.direction !== 'LR';
    labelX = isTB ? Math.round((sx + tx) / 2) : Math.round(geometry.lineMain);
    labelY = isTB ? Math.round(geometry.lineMain) : Math.round((sy + ty) / 2);
  }

  return (
    <>
      <BaseEdge
        path={path}
        style={edgeStyle}
        markerEnd={undefined}
      />
      {branchLabel ? (
        <EdgeLabelRenderer>
          <div
            aria-hidden="true"
            className="pointer-events-none nopan nodrag absolute z-[4] flex max-w-[160px] items-center truncate rounded-full border border-[#15bc83] bg-white px-2.5 py-0.5 text-[11px] leading-4 text-[#15bc83]"
            style={{
              transform: `translate(${labelX}px, ${labelY}px) translate(-50%, -50%)`,
              maxWidth: BRANCH_LABEL_MAX_WIDTH,
            }}
          >
            <span className="truncate">{branchLabel}</span>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const DingFlowEdge = memo(DingFlowEdgeInner);
