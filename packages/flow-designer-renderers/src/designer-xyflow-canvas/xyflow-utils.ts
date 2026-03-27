import type { Edge, Node } from '@xyflow/react';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';
import type {
  DesignerFlowEdgeData,
  DesignerFlowNodeData,
  DesignerXyflowControlledViewport,
  XyflowViewportChange
} from './types';

const VIEWPORT_EPSILON = 0.01;

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number') {
    return undefined;
  }

  return Number.isFinite(value) ? value : undefined;
}

function resolveNodeSize(
  node: DesignerSnapshot['doc']['nodes'][number],
  nodeTypeSize: { minWidth?: number; minHeight?: number } | undefined
) {
  const data = (node.data ?? {}) as Record<string, unknown>;
  const size = (data.size ?? {}) as Record<string, unknown>;

  const width =
    toFiniteNumber(data.width) ??
    toFiniteNumber(data.nodeWidth) ??
    toFiniteNumber(size.width) ??
    toFiniteNumber(nodeTypeSize?.minWidth) ??
    192;

  const height =
    toFiniteNumber(data.height) ??
    toFiniteNumber(data.nodeHeight) ??
    toFiniteNumber(size.height) ??
    toFiniteNumber(nodeTypeSize?.minHeight) ??
    110;

  return { width, height };
}

export function createXyflowNodes(
  snapshot: DesignerSnapshot,
  nodeTypeSizeMap?: Map<string, { minWidth?: number; minHeight?: number }>
): Node[] {
  return snapshot.doc.nodes.map((node) => ({
    ...(() => {
      const resolved = resolveNodeSize(node, nodeTypeSizeMap?.get(node.type));
      return {
        width: resolved.width,
        height: resolved.height,
        measured: { width: resolved.width, height: resolved.height }
      };
    })(),
    id: node.id,
    type: 'designerNode',
    position: { ...node.position },
    selected: snapshot.selection.activeNodeId === node.id,
    data: {
      ...(node.data ?? {}),
      label: String(node.data.label ?? node.id),
      typeLabel: node.type,
      typeId: node.type
    } satisfies DesignerFlowNodeData
  }));
}

export function createXyflowEdges(snapshot: DesignerSnapshot): Edge[] {
  return snapshot.doc.edges.map((edge) => ({
    id: edge.id,
    type: 'designerEdge',
    source: edge.source,
    target: edge.target,
    label: String(edge.data.label ?? edge.id),
    data: {
      ...(edge.data ?? {}),
      label: String(edge.data.label ?? edge.id),
      typeId: edge.type
    } satisfies DesignerFlowEdgeData,
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
