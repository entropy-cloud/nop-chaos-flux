import { describe, expect, it } from 'vitest';
import { createTreeDesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, TreeDocument } from '@nop-chaos/flow-designer-core';
import { createDesignerCommandAdapter } from './designer-command-adapter.js';

function createDingFlowConfig(): DesignerConfig {
  return {
    version: '1.1.0',
    kind: 'dingtalk-workflow',
    documentMode: 'tree',
    treeConfig: {
      layout: { direction: 'TB', nodeSpacing: 60, layerSpacing: 100 },
      showGatewayNodes: false,
      showMergeNodes: false,
      chainEdgeType: 'dt-chain',
      branchEdgeType: 'dt-branch',
      mergeEdgeType: 'dt-merge',
    },
    nodeTypes: [
      {
        id: 'dt-initiator',
        label: '发起人',
        icon: 'user',
        appearance: { minWidth: 200, minHeight: 80 },
        tree: { allowChild: true, allowBranches: false, isTerminal: false },
      },
      {
        id: 'dt-approval',
        label: '审批人',
        icon: 'user-check',
        appearance: { minWidth: 220, minHeight: 80 },
        tree: { allowChild: true, allowBranches: false, isTerminal: false },
      },
      {
        id: 'dt-cc',
        label: '抄送人',
        icon: 'mail',
        appearance: { minWidth: 200, minHeight: 80 },
        tree: { allowChild: true, allowBranches: false, isTerminal: false },
      },
      {
        id: 'dt-end',
        label: '结束',
        icon: 'square',
        appearance: { minWidth: 120, minHeight: 40 },
        tree: { allowChild: false, allowBranches: false, isTerminal: true },
      },
    ],
    edgeTypes: [
      { id: 'dt-chain', label: '流程连线', appearance: { strokeWidth: 2 } },
      { id: 'dt-branch', label: '分支连线', appearance: { strokeWidth: 2 } },
      { id: 'dt-merge', label: '汇合连线', appearance: { strokeWidth: 2 } },
    ],
    features: { undo: true, redo: true, history: true },
  };
}

function createSimpleTreeDocument(): TreeDocument {
  return {
    id: 'test-flow',
    kind: 'dingtalk-workflow',
    name: '测试流程',
    version: '1.0.0',
    root: {
      id: 'n1',
      type: 'dt-initiator',
      data: { label: '发起人' },
      child: {
        id: 'n2',
        type: 'dt-approval',
        data: { label: '主管审批' },
        child: {
          id: 'n3',
          type: 'dt-end',
          data: { label: '结束' },
        },
      },
    },
  };
}

function createBranchingTreeDocument(): TreeDocument {
  return {
    id: 'branching-flow',
    kind: 'dingtalk-workflow',
    name: '分支流程',
    version: '1.0.0',
    root: {
      id: 'n1',
      type: 'dt-initiator',
      data: { label: '发起人' },
      child: {
        id: 'n2',
        type: 'dt-approval',
        data: { label: '主管审批' },
        branches: [
          {
            id: 'b1',
            data: { label: '条件1', priority: 1 },
            child: { id: 'n3', type: 'dt-approval', data: { label: '分支A审批' } },
          },
          {
            id: 'b2',
            data: { label: '条件2', priority: 2 },
            child: { id: 'n4', type: 'dt-approval', data: { label: '分支B审批' } },
          },
        ],
        child: {
          id: 'n5',
          type: 'dt-end',
          data: { label: '结束' },
        },
      },
    },
  };
}

function createAdapter(tree: TreeDocument, config: DesignerConfig) {
  const creation = createTreeDesignerCore(tree, config);
  if (!creation.ok) {
    throw new Error(`tree core creation failed: ${creation.error.code} ${creation.error.message}`);
  }
  const core = creation.core;
  const adapter = createDesignerCommandAdapter(core);
  return { core, adapter };
}

describe('createDesignerCommandAdapter tree mode', () => {
  it('adds a node between source and downstream', () => {
    const config = createDingFlowConfig();
    const { core, adapter } = createAdapter(createSimpleTreeDocument(), config);

    const result = adapter.execute({
      type: 'insertChainNode',
      sourceId: 'n1',
      nodeType: 'dt-approval',
      data: { label: '新增审批' },
    });

    expect(result.ok).toBe(true);
    expect(core.getDocument().nodes).toHaveLength(4);
    expect(core.getDocument().edges).toHaveLength(3);
    const tree = core.getTreeDocument()!;
    expect(tree.root.child!.data.label).toBe('新增审批');
    expect(tree.root.child!.child!.id).toBe('n2');
  });

  it('adds a node after a leaf node with no downstream', () => {
    const config = createDingFlowConfig();
    const { core, adapter } = createAdapter(createSimpleTreeDocument(), config);

    const result = adapter.execute({
      type: 'insertChainNode',
      sourceId: 'n3',
      nodeType: 'dt-cc',
      data: { label: '抄送' },
    });

    expect(result.ok).toBe(true);
    expect(core.getDocument().nodes).toHaveLength(4);
    expect(core.getTreeDocument()?.root.child!.child!.child!.data.label).toBe('抄送');
  });

  it('tracks snapshot identity correctly for useSyncExternalStore', () => {
    const config = createDingFlowConfig();
    const { adapter } = createAdapter(createSimpleTreeDocument(), config);
    const before = adapter.getSnapshot();

    adapter.execute({
      type: 'insertChainNode',
      sourceId: 'n1',
      nodeType: 'dt-approval',
    });

    const after = adapter.getSnapshot();
    expect(after.doc).not.toBe(before.doc);
    expect(after).not.toBe(before);
  });

  it('commits tree changes through the core session draft', () => {
    const config = createDingFlowConfig();
    const { core, adapter } = createAdapter(createSimpleTreeDocument(), config);

    adapter.execute({
      type: 'insertChainNode',
      sourceId: 'n1',
      nodeType: 'dt-approval',
      data: { label: '新增审批' },
    });

    expect(core.getTreeDocument()?.root.child!.data.label).toBe('新增审批');
  });

  it('updates node data through the tree session', () => {
    const config = createDingFlowConfig();
    const { core, adapter } = createAdapter(createSimpleTreeDocument(), config);

    const result = adapter.execute({
      type: 'updateNodeData',
      nodeId: 'n2',
      data: { label: '更新后的审批' },
    });

    expect(result.ok).toBe(true);
    expect(core.getTreeDocument()?.root.child!.data.label).toBe('更新后的审批');
  });

  it('deletes a chain node through the tree session and reconnects its child', () => {
    const config = createDingFlowConfig();
    const { core, adapter } = createAdapter(createSimpleTreeDocument(), config);

    const result = adapter.execute({ type: 'deleteNode', nodeId: 'n2' });

    expect(result.ok).toBe(true);
    const tree = core.getTreeDocument()!;
    expect(tree.root.child!.id).toBe('n3');
    expect(core.getDocument().nodes.map((node) => node.id)).toEqual(['n1', 'n3']);
  });

  it('adds a branch through the tree session', () => {
    const config = createDingFlowConfig();
    const { core, adapter } = createAdapter(createBranchingTreeDocument(), config);

    const result = adapter.execute({
      type: 'addBranch',
      nodeId: 'n2',
      childType: 'dt-approval',
      childData: { label: '分支C审批' },
    });

    expect(result.ok).toBe(true);
    const tree = core.getTreeDocument()!;
    expect(tree.root.child!.branches).toHaveLength(3);
    expect(tree.root.child!.branches![2].data.priority).toBe(3);
  });

  it('keeps continuation below all branches after adding a branch', () => {
    const config = createDingFlowConfig();
    const { core, adapter } = createAdapter(createBranchingTreeDocument(), config);

    adapter.execute({
      type: 'addBranch',
      nodeId: 'n2',
      childType: 'dt-approval',
      childData: { label: '分支C审批' },
    });

    const nodes = core.getDocument().nodes;
    const continuation = nodes.find((node) => node.id === 'n5')!;
    const leaves = nodes.filter((node) => ['n3', 'n4'].includes(node.id));
    for (const leaf of leaves) {
      expect(continuation.position.y).toBeGreaterThan(leaf.position.y);
    }
  });

  it('moves a branch through the tree session', () => {
    const config = createDingFlowConfig();
    const { core, adapter } = createAdapter(createBranchingTreeDocument(), config);

    const result = adapter.execute({
      type: 'moveBranch',
      nodeId: 'n2',
      branchId: 'b2',
      direction: 'left',
    });

    expect(result.ok).toBe(true);
    const tree = core.getTreeDocument()!;
    expect(tree.root.child!.branches!.map((branch) => branch.id)).toEqual(['b2', 'b1']);
    expect(tree.root.child!.branches!.map((branch) => branch.data.priority)).toEqual([1, 2]);
  });

  it('deletes a branch through the tree session while preserving minimum branch count', () => {
    const config = createDingFlowConfig();
    const { core, adapter } = createAdapter(createBranchingTreeDocument(), config);

    adapter.execute({
      type: 'addBranch',
      nodeId: 'n2',
      childType: 'dt-approval',
    });

    const before = core.getTreeDocument()!.root.child!.branches!.map((branch) => branch.id);
    expect(before).toHaveLength(3);
    const addedBranchId = before.find((id) => id !== 'b1' && id !== 'b2')!;

    const result = adapter.execute({ type: 'deleteBranch', nodeId: 'n2', branchId: 'b2' });

    expect(result.ok).toBe(true);
    const tree = core.getTreeDocument()!;
    expect(tree.root.child!.branches!.map((branch) => branch.id)).toEqual(['b1', addedBranchId]);
    expect(tree.root.child!.branches!.map((branch) => branch.data.priority)).toEqual([1, 2]);
  });

  it('keeps tree undo and redo coherent with the projected graph', () => {
    const config = createDingFlowConfig();
    const { core, adapter } = createAdapter(createSimpleTreeDocument(), config);

    adapter.execute({
      type: 'insertChainNode',
      sourceId: 'n1',
      nodeType: 'dt-approval',
    });
    expect(core.getDocument().nodes).toHaveLength(4);

    adapter.execute({ type: 'undo' });
    expect(core.getTreeDocument()?.root.child!.child!.id).toBe('n3');
    expect(core.getDocument().nodes).toHaveLength(3);

    adapter.execute({ type: 'redo' });
    expect(core.getDocument().nodes).toHaveLength(4);
  });

  it('rolls back the tree change when the transaction is rolled back', () => {
    const config = createDingFlowConfig();
    const { core, adapter } = createAdapter(createSimpleTreeDocument(), config);

    const txId = core.beginTransaction('insert-chain-node');
    const result = adapter.execute({
      type: 'insertChainNode',
      sourceId: 'n1',
      nodeType: 'dt-approval',
    });
    expect(result.ok).toBe(true);

    core.rollbackTransaction(txId);

    expect(core.getTreeDocument()?.root.child!.child!.id).toBe('n3');
    expect(core.getDocument().nodes).toHaveLength(3);
  });

  it('rejects graph-only commands with unavailable', () => {
    const config = createDingFlowConfig();
    const { core, adapter } = createAdapter(createSimpleTreeDocument(), config);
    const beforeDoc = core.getDocument();

    const addNode = adapter.execute({ type: 'addNode', nodeType: 'dt-approval' });
    expect(addNode).toMatchObject({ ok: false, reason: 'unavailable' });

    const addEdge = adapter.execute({ type: 'addEdge', source: 'n1', target: 'n2' });
    expect(addEdge).toMatchObject({ ok: false, reason: 'unavailable' });

    const duplicate = adapter.execute({ type: 'duplicateNode', nodeId: 'n2' });
    expect(duplicate).toMatchObject({ ok: false, reason: 'unavailable' });

    const paste = adapter.execute({ type: 'pasteClipboard' });
    expect(paste).toMatchObject({ ok: false, reason: 'unavailable' });

    expect(core.getDocument()).toBe(beforeDoc);
    expect(core.canUndo()).toBe(false);
  });

  it('exports the TreeDocument JSON from the export command', () => {
    const config = createDingFlowConfig();
    const { adapter } = createAdapter(createBranchingTreeDocument(), config);

    const result = adapter.execute({ type: 'export' });

    expect(result.ok).toBe(true);
    const parsed = JSON.parse(String(result.exported));
    expect(parsed.root.id).toBe('n1');
    expect(String(result.exported)).not.toContain('__fdTree');
    expect(String(result.exported)).not.toContain('__fd_internal__');
  });
});
