import { describe, expect, it } from 'vitest';
import { createDingFlowMenuCommand } from './dingflow-command-dispatch.js';

describe('createDingFlowMenuCommand', () => {
  it('uses addBranch for condition nodes on an existing branch group', () => {
    expect(createDingFlowMenuCommand('gateway-1', 'dt-condition', 'branch-group')).toEqual({
      type: 'addBranch',
      nodeId: 'gateway-1',
      branchData: { title: 'Condition', desc: 'Please set' },
      childType: 'dt-condition',
      childData: { title: 'Condition', desc: 'Please set' },
    });
  });

  it('uses insertBranchPair for condition nodes from a normal node plus button', () => {
    expect(createDingFlowMenuCommand('node-1', 'dt-condition', 'node')).toEqual({
      type: 'insertBranchPair',
      sourceId: 'node-1',
      condNodeType: 'dt-condition',
      condData: { title: 'Condition', desc: 'Please set' },
    });
  });

  it('uses insertChainNodeAtMerge for merge overlays', () => {
    expect(createDingFlowMenuCommand('merge:node-9', 'dt-approval')).toEqual({
      type: 'insertChainNodeAtMerge',
      targetId: 'node-9',
      nodeType: 'dt-approval',
      data: { label: 'Approver', desc: 'Please set' },
    });
  });

  it('uses insertChainNode for non-merge non-condition nodes', () => {
    expect(createDingFlowMenuCommand('node-1', 'dt-cc')).toEqual({
      type: 'insertChainNode',
      sourceId: 'node-1',
      nodeType: 'dt-cc',
      data: { label: 'CC', desc: 'Please set' },
    });
  });
});
