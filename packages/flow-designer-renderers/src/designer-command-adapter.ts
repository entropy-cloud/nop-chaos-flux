import type { DesignerCore } from '@nop-chaos/flow-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import type {
  DesignerCommand,
  DesignerCommandAdapter,
  DesignerCommandReason,
  DesignerCommandResult,
} from './designer-command-types.js';
import { createFailure, createSuccess } from './designer-command-adapter-helpers.js';
import { executeGraphOnlyCommand } from './designer-command-adapter-graph.js';

export type {
  DesignerCommand,
  DesignerCommandAdapter,
  DesignerCommandReason,
  DesignerCommandResult,
};

const TREE_OWNED_COMMANDS: ReadonlySet<string> = new Set([
  'addBranch',
  'deleteNode',
  'deleteBranch',
  'moveBranch',
  'updateBranchData',
  'updateNodeData',
  'insertChainNode',
  'insertChainNodeAtMerge',
  'insertBranchPair',
  'insertBranchChild',
  'deleteSelection',
]);

const GRAPH_ONLY_COMMANDS: ReadonlySet<string> = new Set([
  'addNode',
  'addEdge',
  'deleteEdge',
  'duplicateNode',
  'moveNode',
  'reconnectEdge',
  'updateEdgeData',
  'pasteClipboard',
]);

function deleteGraphSelection(core: DesignerCore): DesignerCommandResult {
  const snapshot = core.getSnapshot();
  const selectedNodeIds = [...snapshot.selection.selectedNodeIds];
  const selectedEdgeIds = [...snapshot.selection.selectedEdgeIds];

  if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
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

  const txId = core.beginTransaction('delete-selection');
  try {
    for (const edgeId of selectedEdgeIds) {
      core.deleteEdge(edgeId);
    }
    for (const nodeId of selectedNodeIds) {
      core.deleteNode(nodeId);
    }
    core.commitTransaction(txId);
    return createSuccess(core);
  } catch (error) {
    core.rollbackTransaction(txId);
    throw error;
  }
}

export function createDesignerCommandAdapter(core: DesignerCore): DesignerCommandAdapter {
  const isTreeMode = core.getConfig().documentMode === 'tree';

  // ux-r12 tft1：插入类命令的 data 是菜单层的硬编码兜底（'CC'/'Please set'），
  // 必须与节点类型 defaults 合并（键冲突时兜底胜、defaults 补缺；'CC' 兜底名另由
  // defaults 派生名接管）——否则 tf-* 等 body 模板绑定
  // defaults 字段（如 step.common.name）的节点画布渲染空标签、名字与类型无关。
  // dt-* 家族 defaults 为空对象 → 合并后兜底值原样保留。
  function withNodeTypeDefaults(
    nodeType: string,
    data: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    const rawNodeTypes: unknown = core.getConfig().nodeTypes;
    const definition = (
      rawNodeTypes instanceof Map
        ? rawNodeTypes.get(nodeType)
        : (rawNodeTypes as Array<{ id: string }>).find((entry) => entry.id === nodeType)
    ) as { defaults?: Record<string, unknown> } | undefined;
    const defaults = definition?.defaults;
    const fallback = data ?? {};
    if (!defaults || typeof defaults !== 'object' || Object.keys(defaults).length === 0) {
      return fallback;
    }
    const merged: Record<string, unknown> = {
      ...structuredClone(defaults),
      ...fallback,
    };
    // 兜底 label（'CC'）与类型无关——defaults 派生名存在时以它为准，
    // 让 inspector「当前选中」与新节点画布标签显示类型相关名字。
    const defaultName = (defaults as Record<string, any>)?.step?.common?.name;
    if (typeof defaultName === 'string' && defaultName.length > 0 && fallback.label === 'CC') {
      merged.label = defaultName;
    }
    return merged;
  }

  function mapTreeCommand(result: { ok: boolean; reason?: string; error?: unknown }): DesignerCommandResult {
    if (result.ok) {
      return createSuccess(core);
    }
    return createFailure(
      core,
      result.error ?? t('flux.flowDesigner.command.treeCommandFailed'),
      result.reason === 'missing-node' || result.reason === 'unknown-node-type' || result.reason === 'constraint'
        ? (result.reason as DesignerCommandReason)
        : 'unavailable',
    );
  }

  function isTreeOwned(command: DesignerCommand): boolean {
    return TREE_OWNED_COMMANDS.has(command.type);
  }

  function isGraphOnly(command: DesignerCommand): boolean {
    return GRAPH_ONLY_COMMANDS.has(command.type);
  }

  function executeTreeCommand(command: DesignerCommand): DesignerCommandResult | undefined {
    if (!isTreeMode || !isTreeOwned(command)) {
      return undefined;
    }

    switch (command.type) {
      case 'addBranch': {
        const result = core.addBranch(
          command.nodeId,
          command.branchData,
          command.childType,
          command.childData,
        );
        return mapTreeCommand(result);
      }
      case 'deleteNode': {
        const result = core.deleteTreeNode(command.nodeId);
        return mapTreeCommand(result);
      }
      case 'deleteBranch': {
        const result = core.deleteBranch(command.nodeId, command.branchId);
        return mapTreeCommand(result);
      }
      case 'deleteSelection': {
        const snapshot = core.getSnapshot();
        const selectedNodeIds = [...snapshot.selection.selectedNodeIds];
        const selectedEdgeIds = [...snapshot.selection.selectedEdgeIds];
        if (selectedEdgeIds.length > 0) {
          return createFailure(
            core,
            t('flux.flowDesigner.command.edgeDeletionUnavailableInTreeMode'),
            'unavailable',
          );
        }
        if (selectedNodeIds.length === 0) {
          if (snapshot.activeNode?.id) {
            const result = core.deleteTreeNode(snapshot.activeNode.id);
            return mapTreeCommand(result);
          }
          return createSuccess(core, { reason: 'unchanged' });
        }
        const txId = core.beginTransaction('delete-selection');
        try {
          for (const nodeId of selectedNodeIds) {
            const result = core.deleteTreeNode(nodeId);
            if (!result.ok) {
              core.rollbackTransaction(txId);
              return mapTreeCommand(result);
            }
          }
          core.commitTransaction(txId);
          return createSuccess(core);
        } catch (error) {
          core.rollbackTransaction(txId);
          throw error;
        }
      }
      case 'moveBranch': {
        const result = core.moveBranch(command.nodeId, command.branchId, command.direction);
        return mapTreeCommand(result);
      }
      case 'updateBranchData': {
        const result = core.updateBranchData(command.nodeId, command.branchId, command.data);
        return mapTreeCommand(result);
      }
      case 'updateNodeData': {
        const result = core.updateTreeNodeData(command.nodeId, command.data);
        return mapTreeCommand(result);
      }
      case 'insertChainNode': {
        const result = core.insertChainNode(
          command.sourceId,
          command.nodeType,
          withNodeTypeDefaults(command.nodeType, command.data),
        );
        return mapTreeCommand(result);
      }
      case 'insertChainNodeAtMerge': {
        const result = core.insertChainNodeAtMerge(
          command.targetId,
          command.nodeType,
          withNodeTypeDefaults(command.nodeType, command.data),
        );
        return mapTreeCommand(result);
      }
      case 'insertBranchPair': {
        const result = core.insertBranchPair(
          command.sourceId,
          command.condNodeType,
          withNodeTypeDefaults(command.condNodeType, command.condData),
        );
        return mapTreeCommand(result);
      }
      case 'insertBranchChild': {
        const result = core.insertBranchChild(
          command.ownerId,
          command.branchId,
          command.nodeType,
          withNodeTypeDefaults(command.nodeType, command.data),
        );
        return mapTreeCommand(result);
      }
      default:
        return undefined;
    }
  }

  function execute(command: DesignerCommand): DesignerCommandResult {
    if (isTreeMode && isGraphOnly(command)) {
      return createFailure(
        core,
        t('flux.flowDesigner.command.commandUnavailableInTreeMode', { command: command.type }),
        'unavailable',
      );
    }

    const treeResult = executeTreeCommand(command);
    if (treeResult) {
      return treeResult;
    }

    const graphResult = executeGraphOnlyCommand(core, command);
    if (graphResult) {
      return graphResult;
    }

    switch (command.type) {
      case 'clearSelection':
        core.clearSelection();
        return createSuccess(core);
      case 'deleteSelection': {
        if (!isTreeMode) {
          return deleteGraphSelection(core);
        }
        return createFailure(
          core,
          t('flux.flowDesigner.command.deleteSelectionUnavailableInTreeMode'),
          'unavailable',
        );
      }
      case 'copySelection':
        core.copySelection();
        return createSuccess(core);
      case 'pasteClipboard':
        core.pasteClipboard();
        return createSuccess(core);
      case 'duplicateNode': {
        const node = core.duplicateNode(command.nodeId);
        if (!node) {
          return createFailure(
            core,
            t('flux.flowDesigner.command.unknownNode', { nodeId: command.nodeId }),
            'missing-node',
          );
        }
        return createSuccess(core, { data: node });
      }
      case 'export': {
        const exported = core.exportDocument();
        return createSuccess(core, { data: exported, exported });
      }
      case 'redo':
        if (!core.canRedo()) {
          return createFailure(core, t('flux.flowDesigner.command.redoNotAvailable'), 'unavailable');
        }
        core.redo();
        return createSuccess(core);
      case 'relayoutTree':
        return mapTreeCommand(core.relayoutTree());
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
      case 'setSelection':
        core.setSelection(command.nodeIds, command.edgeIds);
        return createSuccess(core);
      case 'toggleGrid':
        core.toggleGrid();
        return createSuccess(core);
      case 'setPanelWidths':
        if (command.paletteWidth !== undefined && !Number.isFinite(command.paletteWidth)) {
          return createFailure(core, t('flux.flowDesigner.command.invalidPaletteWidth'), 'invalid-width');
        }
        if (command.inspectorWidth !== undefined && !Number.isFinite(command.inspectorWidth)) {
          return createFailure(
            core,
            t('flux.flowDesigner.command.invalidInspectorWidth'),
            'invalid-width',
          );
        }
        if (command.paletteWidth !== undefined) {
          core.setPaletteWidth(command.paletteWidth);
        }
        if (command.inspectorWidth !== undefined) {
          core.setInspectorWidth(command.inspectorWidth);
        }
        return createSuccess(core);
      case 'togglePalette':
        core.togglePalette();
        return createSuccess(core);
      case 'toggleInspector':
        core.toggleInspector();
        return createSuccess(core);
      case 'undo':
        if (!core.canUndo()) {
          return createFailure(core, t('flux.flowDesigner.command.undoNotAvailable'), 'unavailable');
        }
        core.undo();
        return createSuccess(core);
      default:
        return createFailure(
          core,
          t('flux.flowDesigner.command.unsupportedCommand', {
            command: (command as { type: string }).type,
          }),
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
