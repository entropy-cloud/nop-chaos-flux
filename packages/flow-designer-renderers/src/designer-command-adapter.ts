import type { DesignerCore, TreeDocument } from '@nop-chaos/flow-designer-core';
import type {
  DesignerCommand,
  DesignerCommandAdapter,
  DesignerCommandReason,
  DesignerCommandResult,
} from './designer-command-types.js';
import {
  createFailure,
  createSuccess,
  getNode,
  hasNode,
  relayoutAfterTreeMutation,
  type TreeCommandOwner,
} from './designer-command-adapter-helpers.js';
import { executeGraphOnlyCommand } from './designer-command-adapter-graph.js';
import {
  addBranchInTreeDocument,
  deleteNodeInTreeDocument,
  deleteBranchInTreeDocument,
  insertBranchPairInTreeDocument,
  insertChainNodeAtMergeInTreeDocument,
  insertChainNodeInTreeDocument,
  moveBranchInTreeDocument,
  projectTreeDocumentToGraph,
  updateBranchDataInTreeDocument,
  updateNodeDataInTreeDocument,
} from './tree-commands.js';

export type {
  DesignerCommand,
  DesignerCommandAdapter,
  DesignerCommandReason,
  DesignerCommandResult,
};

function isTreeOwnedCommand(command: DesignerCommand): boolean {
  switch (command.type) {
    case 'addBranch':
    case 'deleteNode':
    case 'deleteBranch':
    case 'moveBranch':
    case 'updateBranchData':
    case 'updateNodeData':
    case 'insertChainNode':
    case 'insertChainNodeAtMerge':
    case 'insertBranchPair':
      return true;
    default:
      return false;
  }
}

export function createDesignerCommandAdapter(
  core: DesignerCore,
  treeOwner?: TreeCommandOwner,
): DesignerCommandAdapter {
  if (treeOwner) {
    core.setTreeOwner(treeOwner.getTreeDocument, treeOwner.setTreeDocument);
  }

  function applyTreeDocument(nextTree: TreeDocument): void {
    if (!treeOwner) {
      return;
    }
    treeOwner.setTreeDocument(nextTree);
    core.replaceDocument(projectTreeDocumentToGraph(nextTree, core.getConfig()), nextTree);
  }

  function deleteSelectedSet(): DesignerCommandResult {
    const snapshot = core.getSnapshot();
    const selectedNodeIds = [...snapshot.selection.selectedNodeIds];
    const selectedEdgeIds = [...snapshot.selection.selectedEdgeIds];

    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
      if (snapshot.activeNode?.id) {
        return execute({ type: 'deleteNode', nodeId: snapshot.activeNode.id });
      }
      if (snapshot.activeEdge?.id) {
        core.deleteEdge(snapshot.activeEdge.id);
        relayoutAfterTreeMutation(core);
        return createSuccess(core);
      }
      return createSuccess(core, { reason: 'unchanged' });
    }

    const txId = core.beginTransaction('delete-selection');
    try {
      for (const edgeId of selectedEdgeIds) {
        core.deleteEdge(edgeId);
      }
      for (const nodeId of selectedNodeIds) {
        execute({ type: 'deleteNode', nodeId });
      }
      relayoutAfterTreeMutation(core);
      core.commitTransaction(txId);
      return createSuccess(core);
    } catch (error) {
      core.rollbackTransaction(txId);
      throw error;
    }
  }

  function execute(command: DesignerCommand): DesignerCommandResult {
    const graphResult =
      treeOwner?.config.documentMode === 'tree' && isTreeOwnedCommand(command)
        ? undefined
        : executeGraphOnlyCommand(core, command);
    if (graphResult) {
      return graphResult;
    }

    switch (command.type) {
      case 'addBranch': {
        if (treeOwner?.config.documentMode === 'tree') {
          const nextTree = addBranchInTreeDocument(
            treeOwner.getTreeDocument(),
            command.nodeId,
            command.branchData,
            command.childType,
            command.childData,
          );
          if (!nextTree) {
            return createFailure(core, `Unknown node: ${command.nodeId}`, 'missing-node');
          }
          applyTreeDocument(nextTree);
          return createSuccess(core);
        }
        return createFailure(core, 'addBranch is only available in tree mode.', 'unavailable');
      }
      case 'clearSelection':
        core.clearSelection();
        return createSuccess(core);
      case 'deleteNode':
        if (treeOwner?.config.documentMode === 'tree') {
          const nextTree = deleteNodeInTreeDocument(treeOwner.getTreeDocument(), command.nodeId);
          if (!nextTree) {
            return createFailure(core, `Unknown node: ${command.nodeId}`, 'missing-node');
          }
          applyTreeDocument(nextTree);
          return createSuccess(core);
        }
        core.deleteNode(command.nodeId);
        relayoutAfterTreeMutation(core);
        return createSuccess(core);
      case 'deleteBranch': {
        if (treeOwner?.config.documentMode === 'tree') {
          const nextTree = deleteBranchInTreeDocument(
            treeOwner.getTreeDocument(),
            command.nodeId,
            command.branchId,
          );
          if (!nextTree) {
            return createFailure(
              core,
              `Unknown branch owner or branch: ${command.nodeId}/${command.branchId}`,
              'missing-node',
            );
          }
          applyTreeDocument(nextTree);
          return createSuccess(core);
        }
        return createFailure(core, 'deleteBranch is only available in tree mode.', 'unavailable');
      }
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
        return deleteSelectedSet();
      }
      case 'export': {
        const exported = core.exportDocument();
        return createSuccess(core, { data: exported, exported });
      }
      case 'moveBranch': {
        if (treeOwner?.config.documentMode === 'tree') {
          const nextTree = moveBranchInTreeDocument(
            treeOwner.getTreeDocument(),
            command.nodeId,
            command.branchId,
            command.direction,
          );
          if (!nextTree) {
            return createFailure(
              core,
              `Unknown branch owner or branch: ${command.nodeId}/${command.branchId}`,
              'missing-node',
            );
          }
          applyTreeDocument(nextTree);
          return createSuccess(core);
        }
        return createFailure(core, 'moveBranch is only available in tree mode.', 'unavailable');
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
      case 'selectBranch':
        core.selectBranch(command.nodeId, command.branchId);
        return createSuccess(core);
      case 'selectNode':
        core.selectNode(command.nodeId);
        return createSuccess(core);
      case 'toggleGrid':
        core.toggleGrid();
        return createSuccess(core);
      case 'togglePalette':
        core.togglePalette();
        return createSuccess(core);
      case 'toggleInspector':
        core.toggleInspector();
        return createSuccess(core);
      case 'undo':
        if (!core.canUndo()) {
          return createFailure(core, 'Undo is not available.', 'unavailable');
        }
        core.undo();
        return createSuccess(core);
      case 'updateBranchData':
        if (treeOwner?.config.documentMode === 'tree') {
          const nextTree = updateBranchDataInTreeDocument(
            treeOwner.getTreeDocument(),
            command.nodeId,
            command.branchId,
            command.data,
          );
          if (!nextTree) {
            return createFailure(
              core,
              `Unknown branch owner or branch: ${command.nodeId}/${command.branchId}`,
              'missing-node',
            );
          }
          applyTreeDocument(nextTree);
          return createSuccess(core);
        }
        return createFailure(
          core,
          'updateBranchData is only available in tree mode.',
          'unavailable',
        );
      case 'updateNodeData':
        if (treeOwner?.config.documentMode === 'tree') {
          const nextTree = updateNodeDataInTreeDocument(
            treeOwner.getTreeDocument(),
            command.nodeId,
            command.data,
          );
          if (!nextTree) {
            return createFailure(core, `Unknown node: ${command.nodeId}`, 'missing-node');
          }
          applyTreeDocument(nextTree);
          return createSuccess(core);
        }
        if (!hasNode(core.getDocument(), command.nodeId)) {
          return createFailure(core, `Unknown node: ${command.nodeId}`, 'missing-node');
        }
        core.updateNode(command.nodeId, command.data);
        return createSuccess(core);
      case 'insertChainNode': {
        if (treeOwner?.config.documentMode === 'tree') {
          const nextTree = insertChainNodeInTreeDocument(
            treeOwner.getTreeDocument(),
            command.sourceId,
            command.nodeType,
            command.data,
          );
          if (!nextTree) {
            return createFailure(core, `Unknown source node: ${command.sourceId}`, 'missing-node');
          }
          applyTreeDocument(nextTree);
          return createSuccess(core);
        }

        const doc = core.getDocument();
        const sourceNode = getNode(doc, command.sourceId);
        if (!sourceNode) {
          return createFailure(core, `Unknown source node: ${command.sourceId}`, 'missing-node');
        }

        const outgoingEdges = doc.edges.filter((e) => e.source === command.sourceId);
        const downstreamId = outgoingEdges.length > 0 ? outgoingEdges[0].target : null;

        core.beginTransaction('insert-chain-node');
        try {
          const newNode = core.addNode(
            command.nodeType,
            { x: sourceNode.position.x, y: sourceNode.position.y + 100 },
            command.data,
          );
          if (!newNode) {
            core.rollbackTransaction();
            return createFailure(core, 'Unable to add node.', 'constraint');
          }

          const nextEdges = doc.edges.filter((edge) => edge.source !== command.sourceId);
          nextEdges.push({
            id: `${command.sourceId}-${newNode.id}`,
            type: 'default',
            source: command.sourceId,
            target: newNode.id,
            data: {},
          });
          if (downstreamId) {
            nextEdges.push({
              id: `${newNode.id}-${downstreamId}`,
              type: 'default',
              source: newNode.id,
              target: downstreamId,
              data: {},
            });
          }
          core.replaceDocument({ ...core.getDocument(), edges: nextEdges });

          relayoutAfterTreeMutation(core);
          core.commitTransaction();
          return createSuccess(core, { data: newNode });
        } catch (error) {
          core.rollbackTransaction();
          throw error;
        }
      }
      case 'insertChainNodeAtMerge': {
        if (treeOwner?.config.documentMode === 'tree') {
          const nextTree = insertChainNodeAtMergeInTreeDocument(
            treeOwner.getTreeDocument(),
            command.targetId,
            command.nodeType,
            command.data,
          );
          if (!nextTree) {
            return createFailure(core, `Unknown target node: ${command.targetId}`, 'missing-node');
          }
          applyTreeDocument(nextTree);
          return createSuccess(core);
        }

        const doc = core.getDocument();
        const targetNode = getNode(doc, command.targetId);
        if (!targetNode) {
          return createFailure(core, `Unknown target node: ${command.targetId}`, 'missing-node');
        }

        core.beginTransaction('insert-at-merge');
        try {
          const newNode = core.addNode(
            command.nodeType,
            { x: targetNode.position.x, y: targetNode.position.y },
            command.data,
          );
          if (!newNode) {
            core.rollbackTransaction();
            return createFailure(core, 'Unable to add node.', 'constraint');
          }

          const nextEdges = doc.edges.map((edge) =>
            edge.target === command.targetId ? { ...edge, target: newNode.id } : edge,
          );
          nextEdges.push({
            id: `${newNode.id}-${command.targetId}`,
            type: 'default',
            source: newNode.id,
            target: command.targetId,
            data: {},
          });
          core.replaceDocument({ ...core.getDocument(), edges: nextEdges });

          relayoutAfterTreeMutation(core);
          core.commitTransaction();
          return createSuccess(core, { data: newNode });
        } catch (error) {
          core.rollbackTransaction();
          throw error;
        }
      }
      case 'insertBranchPair': {
        if (treeOwner?.config.documentMode === 'tree') {
          const nextTree = insertBranchPairInTreeDocument(
            treeOwner.getTreeDocument(),
            command.sourceId,
            command.condNodeType,
            command.condData,
          );
          if (!nextTree) {
            return createFailure(core, `Unknown source node: ${command.sourceId}`, 'missing-node');
          }
          applyTreeDocument(nextTree);
          return createSuccess(core);
        }

        const doc = core.getDocument();
        const sourceNode = getNode(doc, command.sourceId);
        if (!sourceNode) {
          return createFailure(core, `Unknown source node: ${command.sourceId}`, 'missing-node');
        }

        const outgoingEdges = doc.edges.filter((e) => e.source === command.sourceId);
        const downstreamId = outgoingEdges.length > 0 ? outgoingEdges[0].target : null;

        core.beginTransaction('insert-branch-pair');
        try {
          const existingBranchCount = outgoingEdges.length;

          const leftNode = core.addNode(
            command.condNodeType,
            { x: sourceNode.position.x - 130, y: sourceNode.position.y + 100 },
            { ...(command.condData ?? {}), priority: existingBranchCount + 1 },
          );
          if (!leftNode) {
            core.rollbackTransaction();
            return createFailure(core, 'Unable to create left branch node.', 'constraint');
          }

          const rightNode = core.addNode(
            command.condNodeType,
            { x: sourceNode.position.x + 130, y: sourceNode.position.y + 100 },
            { ...(command.condData ?? {}), priority: existingBranchCount + 2 },
          );
          if (!rightNode) {
            core.rollbackTransaction();
            return createFailure(core, 'Unable to create right branch node.', 'constraint');
          }

          const nextEdges = doc.edges.filter((edge) => edge.source !== command.sourceId);
          nextEdges.push(
            {
              id: `${command.sourceId}-${leftNode.id}`,
              type: 'default',
              source: command.sourceId,
              target: leftNode.id,
              data: { leg: 'near-target' },
            },
            {
              id: `${command.sourceId}-${rightNode.id}`,
              type: 'default',
              source: command.sourceId,
              target: rightNode.id,
              data: { leg: 'near-target' },
            },
          );

          if (downstreamId) {
            nextEdges.push(
              {
                id: `${leftNode.id}-${downstreamId}`,
                type: 'default',
                source: leftNode.id,
                target: downstreamId,
                data: { leg: 'near-source' },
              },
              {
                id: `${rightNode.id}-${downstreamId}`,
                type: 'default',
                source: rightNode.id,
                target: downstreamId,
                data: { leg: 'near-source' },
              },
            );
          }

          core.replaceDocument({ ...core.getDocument(), edges: nextEdges });

          relayoutAfterTreeMutation(core);
          core.commitTransaction();
          return createSuccess(core);
        } catch (error) {
          core.rollbackTransaction();
          throw error;
        }
      }
      default:
        return createFailure(
          core,
          `Unsupported command: ${(command as { type: string }).type}`,
          'unavailable',
        );
    }
  }

  return {
    execute,
    getSnapshot() {
      return core.getSnapshot();
    },
  };
}

export type { GraphNode } from '@nop-chaos/flow-designer-core';
export type { GraphEdge } from './designer-command-types.js';
