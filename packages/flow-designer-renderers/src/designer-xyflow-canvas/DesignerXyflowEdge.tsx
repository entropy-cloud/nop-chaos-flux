import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { isSchema } from '@nop-chaos/flux-core';
import { RenderNodes, useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';
import { useEdgeTypeConfig, useDesignerContext } from '../designer-context';
import type { SchemaInput } from '@nop-chaos/flux-core';

function classNames(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(' ');
}

function isSchemaInput(value: unknown): value is SchemaInput {
  return isSchema(value);
}

export function DesignerXyflowEdge(props: EdgeProps) {
  const edgeType = useEdgeTypeConfig(props.type ?? 'default');
  const { dispatch } = useDesignerContext();
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition
  });

  const edgeScope = React.useMemo(() => {
    return runtime.createChildScope(parentScope, {
      edge: {
        id: props.id,
        source: props.source,
        target: props.target,
        data: props.data
      },
      data: props.data
    }, {
      scopeKey: `edge:${props.id}`,
      pathSuffix: 'edge'
    });
  }, [runtime, parentScope, props.id, props.source, props.target, props.data]);

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'selectEdge', edgeId: props.id });
  };

  const appearance = edgeType?.appearance;
  const hasBody = edgeType?.body && isSchemaInput(edgeType.body);

  const edgeStyle: React.CSSProperties = {
    stroke: appearance?.stroke,
    strokeWidth: appearance?.strokeWidth
  };

  if (appearance?.strokeStyle === 'dashed') {
    edgeStyle.strokeDasharray = '5,5';
  } else if (appearance?.strokeStyle === 'dotted') {
    edgeStyle.strokeDasharray = '2,2';
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
            <RenderNodes input={edgeType!.body!} options={{ scope: edgeScope }} />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
