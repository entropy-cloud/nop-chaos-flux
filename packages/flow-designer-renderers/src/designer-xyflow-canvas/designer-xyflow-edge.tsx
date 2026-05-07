import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { isSchema } from '@nop-chaos/flux-core';
import { RenderNodes } from '@nop-chaos/flux-react/unstable';
import { useEdgeTypeConfig, useDesignerContext } from '../designer-context.js';
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
  const { dispatch } = useDesignerContext();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  });

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
    }),
    [props.id, props.source, props.target, props.data],
  );

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'selectEdge', edgeId: props.id });
  };

  const handleDeleteEdge = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'deleteEdge', edgeId: props.id });
  };

  const appearance = edgeType?.appearance;
  const hasBody = edgeType?.body && isSchemaInput(edgeType.body);
  const lineStyle =
    typeof edgeData?.lineStyle === 'string' ? edgeData.lineStyle : appearance?.strokeStyle;
  const showQuickActions = props.selected || edgeData?.__fdHovered === true;

  const edgeStyle: React.CSSProperties = {
    stroke: edgeData?.__fdBranchFocused
      ? 'var(--primary)'
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
            className={cn(
              'fd-edge-label px-3 py-1.5 rounded-full border border-border text-sm font-medium text-muted-foreground shadow-sm',
              props.selected && 'border-primary text-foreground',
            )}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            onClick={handleLabelClick}
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
            data-slot="designer-edge-actions"
            className="fd-edge-actions inline-flex items-center gap-1.5 p-1 rounded-[10px] border border-border"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 30}px)`,
              pointerEvents: 'all',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center border-0 hover:bg-black/8 dark:hover:bg-white/10"
              aria-label="Select edge"
              onClick={handleLabelClick}
            >
              <DesignerIcon icon="pencil" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center border-0 hover:bg-destructive/15 hover:text-destructive"
              aria-label="Delete edge"
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
