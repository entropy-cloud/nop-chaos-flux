import type { DesignerCommand } from '../designer-command-types.js';

// WA-flowr-009 (plan 573): these fallback labels are a cross-file literal
// contract — designer-command-adapter's defaults merge keys its
// defaults-derived-name override on the exact 'CC' sentinel. Both sides
// import from here so the menu wording and the adapter check cannot drift.
export const DINGFLOW_FALLBACK_LABEL_CC = 'CC';
const DINGFLOW_FALLBACK_LABEL_APPROVAL = 'Approver';
const DINGFLOW_FALLBACK_DESC = 'Please set';

export type DingFlowSourceKind = 'node' | 'branch-group' | 'merge' | 'slot';

export function createDingFlowMenuCommand(
  sourceId: string,
  type: string,
  sourceKind: DingFlowSourceKind = sourceId.startsWith('merge:')
    ? 'merge'
    : sourceId.startsWith('slot:')
      ? 'slot'
      : 'node',
): DesignerCommand {
  if (sourceKind === 'slot') {
    const [ownerId, branchId] = sourceId.slice('slot:'.length).split(':');
    return {
      type: 'insertBranchChild',
      ownerId,
      branchId,
      nodeType: type,
      data: {
        label: type === 'dt-approval'
          ? DINGFLOW_FALLBACK_LABEL_APPROVAL
          : DINGFLOW_FALLBACK_LABEL_CC,
        desc: DINGFLOW_FALLBACK_DESC,
      },
    };
  }

  const isMerge = sourceKind === 'merge' || sourceId.startsWith('merge:');
  const effectiveId = isMerge ? sourceId.slice('merge:'.length) : sourceId;

  if (type === 'dt-condition') {
    if (sourceKind === 'branch-group') {
      return {
        type: 'addBranch',
        nodeId: effectiveId,
        branchData: { title: 'Condition', desc: DINGFLOW_FALLBACK_DESC },
        childType: type,
        childData: { title: 'Condition', desc: DINGFLOW_FALLBACK_DESC },
      };
    }

    return {
      type: 'insertBranchPair',
      sourceId: effectiveId,
      condNodeType: type,
      condData: { title: 'Condition', desc: DINGFLOW_FALLBACK_DESC },
    };
  }

  if (isMerge) {
    return {
      type: 'insertChainNodeAtMerge',
      targetId: effectiveId,
      nodeType: type,
      data: {
        label: type === 'dt-approval'
          ? DINGFLOW_FALLBACK_LABEL_APPROVAL
          : DINGFLOW_FALLBACK_LABEL_CC,
        desc: DINGFLOW_FALLBACK_DESC,
      },
    };
  }

  return {
    type: 'insertChainNode',
    sourceId: effectiveId,
    nodeType: type,
    data: {
        label: type === 'dt-approval'
          ? DINGFLOW_FALLBACK_LABEL_APPROVAL
          : DINGFLOW_FALLBACK_LABEL_CC,
        desc: DINGFLOW_FALLBACK_DESC,
      },
  };
}
