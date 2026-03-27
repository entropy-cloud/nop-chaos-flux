import type { Edge, Node } from '@xyflow/react';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';
import type { DesignerFlowNodeData, DesignerXyflowControlledViewport, XyflowViewportChange } from './types';

const VIEWPORT_EPSILON = 0.01;

export function createXyflowNodes(snapshot: DesignerSnapshot): Node[] {
  return snapshot.doc.nodes.map((node) => ({
    id: node.id,
    type: 'designerNode',
    position: { ...node.position },
    selected: snapshot.selection.activeNodeId === node.id,
    data: {
      label: String(node.data.label ?? node.id),
      typeLabel: node.type,
      typeId: node.type
    } satisfies DesignerFlowNodeData,
    width: 180,
    height: 60,
    measured: { width: 180, height: 60 }
  }));
}

export function createXyflowEdges(snapshot: DesignerSnapshot): Edge[] {
  return snapshot.doc.edges.map((edge) => ({
    id: edge.id,
    type: 'designerEdge',
    source: edge.source,
    target: edge.target,
    label: String(edge.data.label ?? edge.id),
    selected: snapshot.selection.activeEdgeId === edge.id
  }));
}

export function normalizeControlledViewport(viewport: { x: number; y: number; zoom: number }): DesignerXyflowControlledViewport {
  return {
    x: Math.round(viewport.x),
    y: Math.round(viewport.y),
    zoom: Number(viewport.zoom.toFixed(1))
  };
}

export function viewportsEqual(left: DesignerXyflowControlledViewport, right: DesignerXyflowControlledViewport) {
  return (
    Math.abs(left.x - right.x) < VIEWPORT_EPSILON &&
    Math.abs(left.y - right.y) < VIEWPORT_EPSILON &&
    Math.abs(left.zoom - right.zoom) < VIEWPORT_EPSILON
  );
}

export function normalizeViewportChange(value: XyflowViewportChange | null | undefined): DesignerXyflowControlledViewport | null {
  if (!value || typeof value.x !== 'number' || typeof value.y !== 'number' || typeof value.zoom !== 'number') {
    return null;
  }

  return normalizeControlledViewport({ x: value.x, y: value.y, zoom: value.zoom });
}

export function normalizePositionSignature(position: { x: number; y: number }) {
  return `${Math.round(position.x)}:${Math.round(position.y)}`;
}
