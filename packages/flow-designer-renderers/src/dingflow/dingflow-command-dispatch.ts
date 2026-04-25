import type { DesignerCommand } from '../designer-command-types';

export function createDingFlowMenuCommand(
  sourceId: string,
  type: string,
  sourceKind: 'node' | 'branch-group' | 'merge' = sourceId.startsWith('merge:') ? 'merge' : 'node'
): DesignerCommand {
  const isMerge = sourceKind === 'merge' || sourceId.startsWith('merge:');
  const effectiveId = isMerge ? sourceId.slice('merge:'.length) : sourceId;

  if (type === 'dt-condition') {
    if (sourceKind === 'branch-group') {
      return {
        type: 'addBranch',
        nodeId: effectiveId,
        branchData: { title: 'Condition', desc: 'Please set' },
        childType: type,
        childData: { title: 'Condition', desc: 'Please set' },
      };
    }

    return {
      type: 'insertBranchPair',
      sourceId: effectiveId,
      condNodeType: type,
      condData: { title: 'Condition', desc: 'Please set' },
    };
  }

  if (isMerge) {
    return {
      type: 'insertChainNodeAtMerge',
      targetId: effectiveId,
      nodeType: type,
      data: { label: type === 'dt-approval' ? 'Approver' : 'CC', desc: 'Please set' },
    };
  }

  return {
    type: 'insertChainNode',
    sourceId: effectiveId,
    nodeType: type,
    data: { label: type === 'dt-approval' ? 'Approver' : 'CC', desc: 'Please set' },
  };
}
