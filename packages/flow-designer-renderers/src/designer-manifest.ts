/**
 * Flow Designer Host Capability Projection Manifest
 *
 * Declares the static contract for the `designer` host family.
 * Used by the compiler for action validation and by tooling for discovery.
 *
 * See: docs/architecture/capability-projection-manifest.md
 * See: docs/architecture/flow-designer/design.md
 */

import type {
  HostCapabilityProjectionManifest,
  HostCapabilityContract,
  FluxValueShape,
  RendererHostContract,
  CapabilityPublicationAttribution,
} from '@nop-chaos/flux-core';
import { DESIGNER_HOST_PROJECTION } from './designer-host-projection.js';

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

const nodeResultShape: FluxValueShape = {
  kind: 'object',
  fields: { nodeId: { kind: 'string' } },
};

const edgeResultShape: FluxValueShape = {
  kind: 'object',
  fields: { edgeId: { kind: 'string' } },
};

const designerCapabilities: HostCapabilityContract = {
  namespace: 'designer',
  methods: {
    addNode: {
      args: {
        kind: 'object',
        fields: {
          nodeType: { kind: 'string' },
          position: positionShape,
          data: nodeDataShape,
        },
        optional: ['position', 'data'],
      },
      result: nodeResultShape,
      description: 'Add a new node to the graph',
    },
    addBranch: {
      args: {
        kind: 'object',
        fields: {
          nodeId: { kind: 'string' },
          branchData: nodeDataShape,
          childType: { kind: 'string' },
          childData: nodeDataShape,
        },
        optional: ['branchData', 'childType', 'childData'],
      },
      description: 'Add a branch to a tree-mode branch group',
    },
    addEdge: {
      args: {
        kind: 'object',
        fields: {
          source: { kind: 'string' },
          target: { kind: 'string' },
          sourcePort: { kind: 'string' },
          targetPort: { kind: 'string' },
          data: edgeDataShape,
        },
        optional: ['sourcePort', 'targetPort', 'data'],
      },
      result: edgeResultShape,
      description: 'Add a new edge between nodes',
    },
    clearSelection: {
      description: 'Clear current selection',
      idempotent: true,
    },
    selectNode: {
      args: {
        kind: 'object',
        fields: {
          nodeId: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
        },
      },
      description: 'Select a single node',
    },
    selectBranch: {
      args: {
        kind: 'object',
        fields: {
          nodeId: { kind: 'string' },
          branchId: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
        },
      },
      description: 'Select a single branch within a tree-mode branch group',
    },
    selectEdge: {
      args: {
        kind: 'object',
        fields: {
          edgeId: { kind: 'union', anyOf: [{ kind: 'string' }, { kind: 'null' }] },
        },
      },
      description: 'Select a single edge',
    },
    deleteNode: {
      args: {
        kind: 'object',
        fields: {
          nodeId: { kind: 'string' },
        },
      },
      description: 'Delete a node from the graph',
    },
    deleteBranch: {
      args: {
        kind: 'object',
        fields: {
          nodeId: { kind: 'string' },
          branchId: { kind: 'string' },
        },
      },
      description: 'Delete a branch from a tree-mode branch group',
    },
    deleteEdge: {
      args: {
        kind: 'object',
        fields: {
          edgeId: { kind: 'string' },
        },
      },
      description: 'Delete an edge from the graph',
    },
    deleteSelection: {
      description: 'Delete the current selected nodes and edges',
    },
    duplicateNode: {
      args: {
        kind: 'object',
        fields: {
          nodeId: { kind: 'string' },
        },
      },
      result: nodeResultShape,
      description: 'Duplicate a node',
    },
    moveNode: {
      args: {
        kind: 'object',
        fields: {
          nodeId: { kind: 'string' },
          position: positionShape,
        },
      },
      description: 'Move a node to a new position',
    },
    moveBranch: {
      args: {
        kind: 'object',
        fields: {
          nodeId: { kind: 'string' },
          branchId: { kind: 'string' },
          direction: { kind: 'string', description: 'left or right' },
        },
      },
      description: 'Move a branch left or right within a tree-mode branch group',
    },
    updateBranchData: {
      args: {
        kind: 'object',
        fields: {
          nodeId: { kind: 'string' },
          branchId: { kind: 'string' },
          data: nodeDataShape,
        },
      },
      description: 'Update branch header data in a tree-mode branch group',
    },
    reconnectEdge: {
      args: {
        kind: 'object',
        fields: {
          edgeId: { kind: 'string' },
          source: { kind: 'string' },
          target: { kind: 'string' },
          sourcePort: { kind: 'string' },
          targetPort: { kind: 'string' },
        },
        optional: ['sourcePort', 'targetPort'],
      },
      description: 'Reconnect an edge to new source/target',
    },
    updateNodeData: {
      args: {
        kind: 'object',
        fields: {
          nodeId: { kind: 'string' },
          data: nodeDataShape,
        },
      },
      description: 'Update node data (partial merge)',
    },
    updateEdgeData: {
      args: {
        kind: 'object',
        fields: {
          edgeId: { kind: 'string' },
          data: edgeDataShape,
        },
      },
      description: 'Update edge data (partial merge)',
    },
    export: {
      result: { kind: 'string' },
      description: 'Export document as JSON string',
      idempotent: true,
    },
    undo: {
      description: 'Undo last operation',
    },
    redo: {
      description: 'Redo last undone operation',
    },
    toggleGrid: {
      description: 'Toggle grid visibility',
    },
    togglePalette: {
      description: 'Toggle palette panel visibility',
    },
    toggleInspector: {
      description: 'Toggle inspector panel visibility',
    },
    setViewport: {
      args: {
        kind: 'object',
        fields: {
          viewport: viewportShape,
        },
      },
      description: 'Set canvas viewport',
    },
    save: {
      description: 'Save current document state',
    },
    restore: {
      description: 'Restore last saved document state',
    },
    copySelection: {
      description: 'Copy the current selection into the designer clipboard.',
    },
    pasteClipboard: {
      description: 'Paste the current designer clipboard contents.',
    },
    beginTransaction: {
      args: {
        kind: 'object',
        fields: {
          label: { kind: 'string' },
          transactionId: { kind: 'string' },
        },
        optional: ['label', 'transactionId'],
      },
      result: { kind: 'string', description: 'Transaction ID' },
      description: 'Begin a batched transaction',
    },
    commitTransaction: {
      args: {
        kind: 'object',
        fields: {
          transactionId: { kind: 'string' },
        },
        optional: ['transactionId'],
      },
      description: 'Commit current transaction',
    },
    rollbackTransaction: {
      args: {
        kind: 'object',
        fields: {
          transactionId: { kind: 'string' },
        },
        optional: ['transactionId'],
      },
      description: 'Rollback current transaction',
    },
    toggleNodeSelection: {
      args: {
        kind: 'object',
        fields: {
          nodeId: { kind: 'string' },
        },
      },
      description: 'Toggle node selection state',
    },
    toggleEdgeSelection: {
      args: {
        kind: 'object',
        fields: {
          edgeId: { kind: 'string' },
        },
      },
      description: 'Toggle edge selection state',
    },
    selectAllNodes: {
      description: 'Select all nodes',
      idempotent: true,
    },
    setSelection: {
      args: {
        kind: 'object',
        fields: {
          nodeIds: nodeIdArrayShape,
          edgeIds: edgeIdArrayShape,
        },
        optional: ['nodeIds', 'edgeIds'],
      },
      description: 'Set selection to specific nodes and edges',
    },
    moveNodes: {
      args: {
        kind: 'object',
        fields: {
          deltas: {
            kind: 'object',
            fields: {},
            description: 'Map of nodeId to {dx, dy} deltas',
          },
        },
      },
      description: 'Move multiple nodes by deltas',
    },
    updateMultipleNodes: {
      args: {
        kind: 'object',
        fields: {
          updates: {
            kind: 'array',
            item: {
              kind: 'object',
              fields: {
                nodeId: { kind: 'string' },
                data: nodeDataShape,
              },
            },
          },
        },
      },
      description: 'Update multiple nodes in batch',
    },
  },
};

export const FLOW_DESIGNER_MANIFEST_V1: HostCapabilityProjectionManifest = {
  family: 'designer',
  version: '1.0',
  projection: DESIGNER_HOST_PROJECTION,
  capabilities: designerCapabilities,
  metadata: {
    title: 'Flow Designer',
    description: 'Graph-based flow designer host family',
    docsPath: 'docs/architecture/flow-designer/design.md',
  },
};

export const FLOW_DESIGNER_HOST_METHOD_CONTRACTS = designerCapabilities.methods;

const manifestVersions: ReadonlyMap<string, HostCapabilityProjectionManifest> = new Map([
  ['1.0', FLOW_DESIGNER_MANIFEST_V1],
  ['1', FLOW_DESIGNER_MANIFEST_V1],
  ['latest', FLOW_DESIGNER_MANIFEST_V1],
]);

export function resolveDesignerManifest(
  versionSelector: string,
): HostCapabilityProjectionManifest | undefined {
  return manifestVersions.get(versionSelector);
}

export const DESIGNER_CAPABILITY_PUBLICATION: CapabilityPublicationAttribution = {
  mode: 'region-scoped',
  capableRegions: ['toolbar', 'inspector', 'dialogs'],
  transitiveInheritance: true,
};

export const designerHostContract: RendererHostContract = {
  family: 'designer',
  defaultVersion: '1.0',
  resolveManifest: resolveDesignerManifest,
  capabilityPublication: DESIGNER_CAPABILITY_PUBLICATION,
};
