import type {
  DesignerCore,
  DesignerSnapshot,
  GraphDocument,
  GraphEdge,
  GraphNode
} from '@nop-chaos/flow-designer-core';

type DesignerCommandReason =
  | 'constraint'
  | 'duplicate-edge'
  | 'missing-edge'
  | 'missing-node'
  | 'self-loop'
  | 'unchanged'
  | 'unknown-node-type'
  | 'unavailable';

export type DesignerCommand =
  | {
      type: 'addEdge';
      source: string;
      target: string;
      data?: Record<string, unknown>;
    }
  | {
      type: 'addNode';
      nodeType: string;
      position?: { x: number; y: number };
      data?: Record<string, unknown>;
    }
  | {
      type: 'clearSelection';
    }
  | {
      type: 'deleteEdge';
      edgeId: string;
    }
  | {
      type: 'deleteNode';
      nodeId: string;
    }
  | {
      type: 'duplicateNode';
      nodeId: string;
    }
  | {
      type: 'copySelection';
    }
  | {
      type: 'pasteClipboard';
    }
  | {
      type: 'deleteSelection';
    }
  | {
      type: 'export';
    }
  | {
      type: 'moveNode';
      nodeId: string;
      position: { x: number; y: number };
    }
  | {
      type: 'reconnectEdge';
      edgeId: string;
      source: string;
      target: string;
    }
  | {
      type: 'redo';
    }
  | {
      type: 'restore';
    }
  | {
      type: 'save';
    }
  | {
      type: 'selectEdge';
      edgeId: string | null;
    }
  | {
      type: 'selectNode';
      nodeId: string | null;
    }
  | {
      type: 'setViewport';
      viewport: { x: number; y: number; zoom: number };
    }
  | {
      type: 'toggleGrid';
    }
  | {
      type: 'undo';
    }
  | {
      type: 'updateEdgeData';
      edgeId: string;
      data: Record<string, unknown>;
    }
  | {
      type: 'updateNodeData';
      nodeId: string;
      data: Record<string, unknown>;
    };

export interface DesignerCommandResult {
  ok: boolean;
  snapshot: DesignerSnapshot;
  data?: unknown;
  error?: string;
  exported?: string;
  reason?: DesignerCommandReason;
}

export interface DesignerCommandAdapter {
  execute(command: DesignerCommand): DesignerCommandResult;
  getSnapshot(): DesignerSnapshot;
}

const EDGE_SELF_LOOP_ERROR = 'Self-loop edges are not supported in the playground example.';
const EDGE_MISSING_NODE_ERROR = 'Edges must connect existing nodes.';
const EDGE_DUPLICATE_ERROR = 'Duplicate edges are not supported in the playground example.';

function createSuccess(core: DesignerCore, extra?: Omit<DesignerCommandResult, 'ok' | 'snapshot'>): DesignerCommandResult {
  return {
    ok: true,
    snapshot: core.getSnapshot(),
    ...extra
  };
}

function createFailure(
  core: DesignerCore,
  error: string,
  reason?: DesignerCommandReason,
  extra?: Omit<DesignerCommandResult, 'ok' | 'snapshot' | 'error' | 'reason'>
): DesignerCommandResult {
  return {
    ok: false,
    snapshot: core.getSnapshot(),
    error,
    reason,
    ...extra
  };
}

function hasNode(doc: GraphDocument, nodeId: string): boolean {
  return doc.nodes.some((node) => node.id === nodeId);
}

function getNode(doc: GraphDocument, nodeId: string): GraphNode | undefined {
  return doc.nodes.find((node) => node.id === nodeId);
}

function hasEdge(doc: GraphDocument, edgeId: string): boolean {
  return doc.edges.some((edge) => edge.id === edgeId);
}

function hasEdgeConnection(doc: GraphDocument, source: string, target: string, ignoreEdgeId?: string): boolean {
  return doc.edges.some((edge) => edge.id !== ignoreEdgeId && edge.source === source && edge.target === target);
}

function viewportsEqual(
  left: { x: number; y: number; zoom: number },
  right: { x: number; y: number; zoom: number }
): boolean {
  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
}

function validateEdgeMutation(
  core: DesignerCore,
  source: string,
  target: string,
  ignoreEdgeId?: string
): { error?: string; reason?: DesignerCommandReason } {
  const doc = core.getDocument();
  const config = core.getConfig();

  if (!hasNode(doc, source) || !hasNode(doc, target)) {
    return { error: EDGE_MISSING_NODE_ERROR, reason: 'missing-node' };
  }

  if (!config.rules.allowSelfLoop && source === target) {
    return { error: EDGE_SELF_LOOP_ERROR, reason: 'self-loop' };
  }

  if (hasEdgeConnection(doc, source, target, ignoreEdgeId)) {
    return { error: EDGE_DUPLICATE_ERROR, reason: 'duplicate-edge' };
  }

  return {};
}

function inferAddNodeFailure(core: DesignerCore, nodeType: string): { error: string; reason: DesignerCommandReason } {
  if (!core.getConfig().nodeTypes.has(nodeType)) {
    return {
      error: `Unknown node type: ${nodeType}`,
      reason: 'unknown-node-type'
    };
  }

  return {
    error: `Unable to add node: ${nodeType}`,
    reason: 'constraint'
  };
}

export function createDesignerCommandAdapter(core: DesignerCore): DesignerCommandAdapter {
  function execute(command: DesignerCommand): DesignerCommandResult {
    switch (command.type) {
      case 'addEdge': {
        const validation = validateEdgeMutation(core, command.source, command.target);
        if (validation.error) {
          return createFailure(core, validation.error, validation.reason);
        }

        const edge = core.addEdge(command.source, command.target, command.data);
        if (!edge) {
          return createFailure(core, 'Unable to add edge.');
        }

        return createSuccess(core, { data: edge });
      }
      case 'addNode': {
        const node = core.addNode(command.nodeType, command.position ?? { x: 200, y: 120 }, command.data);
        if (!node) {
          const failure = inferAddNodeFailure(core, command.nodeType);
          return createFailure(core, failure.error, failure.reason);
        }

        return createSuccess(core, { data: node });
      }
      case 'clearSelection':
        core.clearSelection();
        return createSuccess(core);
      case 'deleteEdge':
        core.deleteEdge(command.edgeId);
        return createSuccess(core);
      case 'deleteNode':
        core.deleteNode(command.nodeId);
        return createSuccess(core);
      case 'duplicateNode': {
        const node = core.duplicateNode(command.nodeId);
        if (!node) {
          return createFailure(core, `Unknown node: ${command.nodeId}`, 'missing-node');
        }

        return createSuccess(core, { data: node });
      }
      case 'copySelection':
        core.copySelection();
        return createSuccess(core);
      case 'pasteClipboard':
        core.pasteClipboard();
        return createSuccess(core);
      case 'deleteSelection': {
        const snapshot = core.getSnapshot();
        if (snapshot.activeNode?.id) {
          core.deleteNode(snapshot.activeNode.id);
          return createSuccess(core);
        }
        if (snapshot.activeEdge?.id) {
          core.deleteEdge(snapshot.activeEdge.id);
          return createSuccess(core);
        }
        return createSuccess(core, { reason: 'unchanged' });
      }
      case 'export': {
        const exported = core.exportDocument();
        return createSuccess(core, { data: exported, exported });
      }
      case 'moveNode': {
        const node = getNode(core.getDocument(), command.nodeId);
        if (!node) {
          return createFailure(core, `Unknown node: ${command.nodeId}`, 'missing-node');
        }

        if (node.position.x === command.position.x && node.position.y === command.position.y) {
          return createSuccess(core, { data: node, reason: 'unchanged' });
        }

        core.moveNode(command.nodeId, command.position);
        return createSuccess(core, { data: core.getDocument().nodes.find((nextNode) => nextNode.id === command.nodeId) });
      }
      case 'reconnectEdge': {
        if (!hasEdge(core.getDocument(), command.edgeId)) {
          return createFailure(core, `Unknown edge: ${command.edgeId}`, 'missing-edge');
        }

        const validation = validateEdgeMutation(core, command.source, command.target, command.edgeId);
        if (validation.error) {
          return createFailure(core, validation.error, validation.reason);
        }

        const result = core.reconnectEdge(command.edgeId, command.source, command.target);
        if (!result.ok) {
          return createFailure(core, result.error ?? 'Unable to reconnect edge.', (result.reason as DesignerCommandReason | undefined) ?? 'missing-edge');
        }

        return createSuccess(core, {
          data: result.edge,
          reason: result.reason as DesignerCommandReason | undefined
        });
      }
      case 'redo':
        if (!core.canRedo()) {
          return createFailure(core, 'Redo is not available.', 'unavailable');
        }
        core.redo();
        return createSuccess(core);
      case 'restore':
        core.restore();
        return createSuccess(core);
      case 'save':
        core.save();
        return createSuccess(core);
      case 'selectEdge':
        core.selectEdge(command.edgeId);
        return createSuccess(core);
      case 'selectNode':
        core.selectNode(command.nodeId);
        return createSuccess(core);
      case 'setViewport': {
        const previousViewport = core.getSnapshot().viewport;
        core.setViewport(command.viewport);
        const nextSnapshot = core.getSnapshot();
        if (viewportsEqual(previousViewport, nextSnapshot.viewport)) {
          return {
            ok: true,
            snapshot: nextSnapshot,
            reason: 'unchanged'
          };
        }

        return {
          ok: true,
          snapshot: nextSnapshot,
          data: nextSnapshot.viewport
        };
      }
      case 'toggleGrid':
        core.toggleGrid();
        return createSuccess(core);
      case 'undo':
        if (!core.canUndo()) {
          return createFailure(core, 'Undo is not available.', 'unavailable');
        }
        core.undo();
        return createSuccess(core);
      case 'updateEdgeData':
        if (!hasEdge(core.getDocument(), command.edgeId)) {
          return createFailure(core, `Unknown edge: ${command.edgeId}`, 'missing-edge');
        }
        core.updateEdge(command.edgeId, command.data);
        return createSuccess(core);
      case 'updateNodeData':
        if (!hasNode(core.getDocument(), command.nodeId)) {
          return createFailure(core, `Unknown node: ${command.nodeId}`, 'missing-node');
        }
        core.updateNode(command.nodeId, command.data);
        return createSuccess(core);
    }
  }

  return {
    execute,
    getSnapshot() {
      return core.getSnapshot();
    }
  };
}

export type { GraphEdge, GraphNode };
