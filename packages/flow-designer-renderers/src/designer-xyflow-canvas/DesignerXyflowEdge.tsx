import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { isSchema } from '@nop-chaos/flux-core';
import { RenderNodes } from '@nop-chaos/flux-react';
import { useEdgeTypeConfig, useDesignerContext } from '../designer-context';
import type { SchemaInput } from '@nop-chaos/flux-core';
import type { DesignerFlowEdgeData } from './types';
import { DesignerIcon } from '../designer-icon';
import { Button } from '@nop-chaos/ui';

function classNames(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(' ');
}

function isSchemaInput(value: unknown): value is SchemaInput {
  return isSchema(value);
}

export function DesignerXyflowEdge(props: EdgeProps) {
  const edgeData = (props.data as DesignerFlowEdgeData | undefined) ?? undefined;
  const edgeType = useEdgeTypeConfig(edgeData?.typeId ?? props.type ?? 'default');
  const { dispatch } = useDesignerContext();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition
  });

  const edgeRenderData = React.useMemo(() => ({
    edge: {
      id: props.id,
      source: props.source,
      target: props.target,
      data: props.data
    },
    data: props.data
  }), [props.id, props.source, props.target, props.data]);

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
  const lineStyle = typeof edgeData?.lineStyle === 'string' ? edgeData.lineStyle : appearance?.strokeStyle;
  const showQuickActions = props.selected || edgeData?.__fdHovered === true;

  const edgeStyle: React.CSSProperties = {
    stroke: appearance?.stroke,
    strokeWidth: appearance?.strokeWidth
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
        markerEnd={appearance?.markerEnd && appearance.markerEnd !== 'none' ? `url(#${appearance.markerEnd})` : undefined}
        className={classNames(appearance?.animated && 'fd-edge--animated')}
      />

      {hasBody && (
        <EdgeLabelRenderer>
          <div
            className={classNames('fd-edge__label-wrapper', props.selected && 'fd-edge__label-wrapper--selected')}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all'
            }}
            onClick={handleLabelClick}
          >
            <RenderNodes
              input={edgeType!.body!}
              options={{ data: edgeRenderData, scopeKey: `edge:${props.id}`, pathSuffix: 'edge' }}
            />
          </div>
        </EdgeLabelRenderer>
      )}

      {showQuickActions && (
        <EdgeLabelRenderer>
          <div
            className="fd-edge__quick-actions"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 30}px)`,
              pointerEvents: 'all'
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="fd-edge__quick-action-btn"
              aria-label="Select edge"
              onClick={handleLabelClick}
            >
              <DesignerIcon icon="pencil" className="nop-icon nop-icon--pencil" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              className="fd-edge__quick-action-btn fd-edge__quick-action-btn--danger"
              aria-label="Delete edge"
              onClick={handleDeleteEdge}
            >
              <DesignerIcon icon="trash-2" className="nop-icon nop-icon--trash-2" />
            </Button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
