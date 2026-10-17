import { BaseEdge, type EdgeProps, getSmoothStepPath, useReactFlow } from '@xyflow/react';
import React from 'react';

/**
 * GR-2 (plan 640): edges sharing a source or target handle render through
 * this component — the shared handle lane shifts each edge apart (source-side
 * fan-out and target-side convergence both get a per-edge vertical offset)
 * so adjacent edges no longer overlap into a small loop at the handle.
 */
export function GraphBundleEdge(props: EdgeProps) {
  const { getInternalNode } = useReactFlow();
  const bundle = (props.data as { __bundle?: { sourceOffset: number; targetOffset: number } } | undefined)
    ?.__bundle ?? { sourceOffset: 0, targetOffset: 0 };

  const sourceNode = getInternalNode(props.source);
  const targetNode = getInternalNode(props.target);
  const sourceY = sourceNode
    ? sourceNode.internals.positionAbsolute.y + (sourceNode.measured.height ?? 80) / 2 + bundle.sourceOffset
    : props.sourceY;
  const targetY = targetNode
    ? targetNode.internals.positionAbsolute.y + (targetNode.measured.height ?? 80) / 2 + bundle.targetOffset
    : props.targetY;

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY,
    targetX: props.targetX,
    targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  });

  return (
    <BaseEdge
      id={props.id}
      path={path}
      labelX={labelX}
      labelY={labelY}
      label={props.label}
      style={props.style}
      interactionWidth={props.interactionWidth}
    />
  );
}
