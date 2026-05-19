import type { FluxValueShape, HostProjectionContract } from '@nop-chaos/flux-core';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';

const positionShape: FluxValueShape = {
  kind: 'object',
  fields: {
    x: { kind: 'number' },
    y: { kind: 'number' },
  },
};

const viewportShape: FluxValueShape = {
  kind: 'object',
  fields: {
    x: { kind: 'number' },
    y: { kind: 'number' },
    zoom: { kind: 'number' },
  },
};

const nodeDataShape: FluxValueShape = {
  kind: 'object',
  fields: {},
  description: 'Arbitrary node data',
};

const edgeDataShape: FluxValueShape = {
  kind: 'object',
  fields: {},
  description: 'Arbitrary edge data',
};

const nodeIdArrayShape: FluxValueShape = {
  kind: 'array',
  item: { kind: 'string' },
};

const edgeIdArrayShape: FluxValueShape = {
  kind: 'array',
  item: { kind: 'string' },
};

const nodeSummaryShape: FluxValueShape = {
  kind: 'object',
  fields: {
    id: { kind: 'string' },
    type: { kind: 'string' },
    position: positionShape,
  },
  description: 'Node summary for domain export',
};

const nodesArrayShape: FluxValueShape = {
  kind: 'array',
  item: nodeSummaryShape,
};

const edgeSummaryShape: FluxValueShape = {
  kind: 'object',
  fields: {
    id: { kind: 'string' },
    source: { kind: 'string' },
    target: { kind: 'string' },
    sourcePort: { kind: 'string' },
    taskflowEdgeKind: { kind: 'string' },
  },
  optional: ['sourcePort', 'taskflowEdgeKind'],
  description: 'Edge summary for domain export',
};

const edgesArrayShape: FluxValueShape = {
  kind: 'array',
  item: edgeSummaryShape,
};

export const DESIGNER_HOST_PROJECTION_FIELDS: HostProjectionContract['fields'] = {
  doc: {
    schema: {
      kind: 'object',
      fields: {
        id: { kind: 'string' },
        kind: { kind: 'string' },
        name: { kind: 'string' },
        version: { kind: 'string' },
        viewport: viewportShape,
        nodeCount: { kind: 'number' },
        edgeCount: { kind: 'number' },
        nodes: nodesArrayShape,
        edges: edgesArrayShape,
      },
    },
    description: 'Current graph document summary with nodes/edges for domain export',
  },
  selection: {
    schema: {
      kind: 'object',
      fields: {
        kind: { kind: 'string' },
        count: { kind: 'number' },
        nodeIds: nodeIdArrayShape,
        edgeIds: edgeIdArrayShape,
        selectedNodeIds: nodeIdArrayShape,
        selectedEdgeIds: edgeIdArrayShape,
        activeNodeId: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
        activeEdgeId: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
        activeBranchId: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
      },
    },
    description: 'Current selection state',
  },
  activeNode: {
    schema: {
      kind: 'union',
      anyOf: [
        { kind: 'null' },
        {
          kind: 'object',
          fields: {
            id: { kind: 'string' },
            type: { kind: 'string' },
            position: positionShape,
            data: nodeDataShape,
          },
        },
      ],
    },
    description: 'Currently active node (single selection)',
  },
  activeEdge: {
    schema: {
      kind: 'union',
      anyOf: [
        { kind: 'null' },
        {
          kind: 'object',
          fields: {
            id: { kind: 'string' },
            type: { kind: 'string' },
            source: { kind: 'string' },
            target: { kind: 'string' },
            sourcePort: { kind: 'string' },
            targetPort: { kind: 'string' },
            data: edgeDataShape,
          },
          optional: ['sourcePort', 'targetPort'],
        },
      ],
    },
    description: 'Currently active edge (single selection)',
  },
  activeBranch: {
    schema: {
      kind: 'union',
      anyOf: [
        { kind: 'null' },
        {
          kind: 'object',
          fields: {
            id: { kind: 'string' },
            childId: { kind: 'string' },
            label: { kind: 'string' },
          },
          optional: ['label'],
        },
      ],
    },
    description: 'Currently active branch in tree mode',
  },
  runtime: {
    schema: {
      kind: 'object',
      fields: {
        dirty: { kind: 'boolean' },
        canUndo: { kind: 'boolean' },
        canRedo: { kind: 'boolean' },
        gridEnabled: { kind: 'boolean' },
        zoom: { kind: 'number' },
        viewport: viewportShape,
      },
    },
    description: 'Readonly runtime state summary',
  },
};

export const DESIGNER_HOST_PROJECTION: HostProjectionContract = {
  fields: DESIGNER_HOST_PROJECTION_FIELDS,
};

export function buildDesignerHostProjection(input: { snapshot: DesignerSnapshot }) {
  const { snapshot } = input;
  const nodeIds = snapshot.selection.selectedNodeIds;
  const edgeIds = snapshot.selection.selectedEdgeIds;
  const selectionKind = snapshot.activeBranch
    ? 'branch'
    : snapshot.activeNode
      ? 'node'
      : snapshot.activeEdge
        ? 'edge'
        : 'none';

  const nodes = snapshot.doc.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: n.position.x, y: n.position.y },
  }));

  const edges = snapshot.doc.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourcePort: e.sourcePort,
    taskflowEdgeKind: (e.data?.taskflowEdgeKind as string | undefined),
  }));

  return {
    doc: {
      id: snapshot.doc.id,
      kind: snapshot.doc.kind,
      name: snapshot.doc.name,
      version: snapshot.doc.version,
      viewport: snapshot.doc.viewport,
      nodeCount: snapshot.doc.nodes.length,
      edgeCount: snapshot.doc.edges.length,
      nodes,
      edges,
    },
    selection: {
      kind: selectionKind,
      count: nodeIds.length + edgeIds.length,
      nodeIds,
      edgeIds,
      selectedNodeIds: nodeIds,
      selectedEdgeIds: edgeIds,
      activeNodeId: snapshot.selection.activeNodeId,
      activeEdgeId: snapshot.selection.activeEdgeId,
      activeBranchId: snapshot.selection.activeBranchId,
    },
    activeNode: snapshot.activeNode,
    activeEdge: snapshot.activeEdge,
    activeBranch: snapshot.activeBranch,
    runtime: {
      canUndo: snapshot.canUndo,
      canRedo: snapshot.canRedo,
      dirty: snapshot.isDirty,
      gridEnabled: snapshot.gridEnabled,
      zoom: snapshot.viewport.zoom,
      viewport: snapshot.viewport,
    },
  };
}
