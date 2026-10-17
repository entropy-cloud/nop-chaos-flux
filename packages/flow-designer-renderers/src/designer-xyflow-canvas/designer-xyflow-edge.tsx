import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { isSchema } from '@nop-chaos/flux-core';
import { RenderNodes } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { useEdgeTypeConfig, useDesignerContext } from '../designer-context.js';
import { focusDesignerCanvasSurface } from '../designer-canvas-focus.js';
import type { SchemaInput } from '@nop-chaos/flux-core';
import type { DesignerFlowEdgeData } from './types.js';
import { DesignerIcon } from '../designer-icon.js';
import { Button, cn } from '@nop-chaos/ui';

function isSchemaInput(value: unknown): value is SchemaInput {
  return isSchema(value);
}

export function DesignerXyflowEdge(props: EdgeProps) {
  const edgeData = (props.data as DesignerFlowEdgeData | undefined) ?? undefined;
  const edgeType = useEdgeTypeConfig(edgeData?.typeId ?? props.type ?? 'default');
  const { dispatch, core } = useDesignerContext();

  // plan 640 UR-13: routed (loopback) edges render an explicit waypoint
  // polyline around the node field; bundled edges shift their shared-handle
  // lane; forward edges keep the original bezier byte-for-byte.
  const route = (props.data as { __fdRoute?: { kind: string; waypoints?: Array<{ x: number; y: number }>; axis?: 'x' | 'y'; centerOffset?: number; offset?: number } } | undefined)?.__fdRoute;

  const [edgePath, labelX, labelY] = (() => {
    if (route?.kind === 'routed' && route.waypoints && route.waypoints.length >= 2) {
      const pts = route.waypoints;
      const r = 10;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length - 1; i += 1) {
        const prev = pts[i - 1];
        const cur = pts[i];
        const next = pts[i + 1];
        const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y);
        const outLen = Math.hypot(next.x - cur.x, next.y - cur.y);
        const rr = Math.min(r, inLen / 2, outLen / 2);
        d += ` L ${cur.x - (cur.x - prev.x) / (inLen || 1) * rr} ${cur.y - (cur.y - prev.y) / (inLen || 1) * rr}`;
        d += ` Q ${cur.x} ${cur.y} ${cur.x + (next.x - cur.x) / (outLen || 1) * rr} ${cur.y + (next.y - cur.y) / (outLen || 1) * rr}`;
      }
      const last = pts[pts.length - 1];
      d += ` L ${last.x} ${last.y}`;
      const mid = pts[Math.floor(pts.length / 2)];
      return [d, mid.x, mid.y] as const;
    }
    if (route?.kind === 'bundled') {
      const [path, lx, ly] = getSmoothStepPath({
        sourceX: props.sourceX,
        sourceY: props.sourceY,
        targetX: props.targetX,
        targetY: props.targetY,
        sourcePosition: props.sourcePosition,
        targetPosition: props.targetPosition,
        ...(route.axis === 'x'
          ? { centerX: (props.sourceX + props.targetX) / 2 + (route.centerOffset ?? 0) }
          : { centerY: (props.sourceY + props.targetY) / 2 + (route.centerOffset ?? 0) }),
        offset: route.offset ?? 20,
      });
      return [path, lx, ly] as const;
    }
    return getBezierPath({
      sourceX: props.sourceX,
      sourceY: props.sourceY,
      targetX: props.targetX,
      targetY: props.targetY,
      sourcePosition: props.sourcePosition,
      targetPosition: props.targetPosition,
    });
  })();

  const edgeRenderData = React.useMemo(
    () => ({
      edge: {
        id: props.id,
        source: props.source,
        target: props.target,
        data: props.data,
      },
      data: props.data,
      ...(typeof props.data === 'object' && props.data !== null
        ? (props.data as Record<string, unknown>)
        : {}),
      condition:
        typeof props.data === 'object' && props.data !== null
          ? (props.data as Record<string, unknown>).condition
          : undefined,
    }),
    [props.id, props.source, props.target, props.data],
  );

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'selectEdge', edgeId: props.id });
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dispatch({ type: 'selectEdge', edgeId: props.id });
    }
  };

  const handleDeleteEdge = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'deleteEdge', edgeId: props.id });
    focusDesignerCanvasSurface(core);
  };

  const appearance = edgeType?.appearance;
  const hasBody = edgeType?.body && isSchemaInput(edgeType.body);
  const lineStyle =
    typeof edgeData?.lineStyle === 'string' ? edgeData.lineStyle : appearance?.strokeStyle;
  const showQuickActions = props.selected || edgeData?.__fdHovered === true;
  const edgeLabelValue =
    typeof edgeData?.label === 'string' && edgeData.label.trim().length > 0
      ? edgeData.label
      : undefined;

  const edgeStyle: React.CSSProperties = {
    stroke: edgeData?.__fdBranchFocused
      ? 'hsl(var(--primary))'
      : (appearance?.stroke ?? 'var(--fd-edge-stroke)'),
    strokeWidth: edgeData?.__fdBranchFocused
      ? Math.max((appearance?.strokeWidth ?? 2) + 1, 3)
      : (appearance?.strokeWidth ?? 2),
  };

  if (lineStyle === 'dashed') {
    edgeStyle.strokeDasharray = '6,4';
  } else if (lineStyle === 'dotted') {
    edgeStyle.strokeDasharray = '2,4';
  }
  const edgeLabel = edgeLabelValue ?? `${props.source} to ${props.target}`;
  const edgeAriaLabel = `${props.selected ? 'Selected ' : ''}Edge ${edgeLabel}`;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={edgeStyle}
        markerEnd={
          appearance?.markerEnd && appearance.markerEnd !== 'none'
            ? `url(#${appearance.markerEnd})`
            : undefined
        }
        className={cn(appearance?.animated && 'react-flow__edge-animated')}
      />

      {hasBody && (
        <EdgeLabelRenderer>
          <div
            role="button"
            tabIndex={0}
            aria-label={edgeAriaLabel}
            aria-pressed={props.selected}
            className={cn(
              'fd-edge-label px-3 py-1.5 rounded-full border border-border text-sm font-semibold text-foreground shadow-sm',
              props.selected && 'border-primary text-foreground',
            )}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            onClick={handleLabelClick}
            onKeyDown={handleLabelKeyDown}
          >
            <RenderNodes
              input={edgeType!.body!}
              options={{
                bindings: edgeRenderData,
                scopeKey: `edge:${props.id}`,
                pathSuffix: 'edge',
              }}
            />
          </div>
        </EdgeLabelRenderer>
      )}

      {showQuickActions && (
        <EdgeLabelRenderer>
          <div
            role="toolbar"
            tabIndex={0}
            aria-label={`Edge actions for ${edgeLabel}`}
            data-slot="designer-edge-actions"
            className="fd-edge-actions inline-flex items-center gap-1.5 p-1 rounded-[10px] border border-border"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 30}px)`,
              pointerEvents: 'all',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                dispatch({ type: 'selectEdge', edgeId: props.id });
              }
            }}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center border-0 hover:bg-black/8 dark:hover:bg-white/10"
              aria-label={t('flux.flowDesigner.selectEdge')}
              onClick={handleLabelClick}
            >
              <DesignerIcon icon="pencil" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              data-testid="designer-edge-delete"
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center border-0 hover:bg-destructive/15 hover:text-destructive"
              aria-label={t('flux.flowDesigner.deleteEdge')}
              onClick={handleDeleteEdge}
            >
              <DesignerIcon icon="trash-2" />
            </Button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
