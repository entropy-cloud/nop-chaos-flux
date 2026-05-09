import { describe, expect, it, vi } from 'vitest';
import {
  createDesignerCore,
  layoutStructuredTree,
  normalizeConfig,
  projectTree,
} from '@nop-chaos/flow-designer-core';
import type {
  DesignerConfig,
  GraphDocument,
  TreeDocument,
} from '@nop-chaos/flow-designer-core';
import { createDesignerCommandAdapter } from './designer-command-adapter.js';

function createDingFlowConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'dingtalk-workflow',
    documentMode: 'tree',
    treeConfig: {
      layout: { direction: 'TB', nodeSpacing: 60, layerSpacing: 100 },
      showGatewayNodes: false,
      showMergeNodes: false,
      autoLayout: true,
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
      { id: 'dt-chain', label: '流程连线' },
      { id: 'dt-branch', label: '分支连线' },
      { id: 'dt-merge', label: '汇合连线' },
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

function projectTreeToDoc(treeDoc: TreeDocument, config: DesignerConfig): GraphDocument {
  const normalizedConfig = normalizeConfig(config);
  const projected = projectTree(treeDoc, normalizedConfig);
  const treeConfig = normalizedConfig.treeConfig!;
  const nodes = layoutStructuredTree(treeDoc, projected.nodes, treeConfig, normalizedConfig.nodeTypes);
  return {
    id: treeDoc.id,
    kind: treeDoc.kind,
    name: treeDoc.name,
    version: treeDoc.version,
    nodes,
    edges: projected.edges,
  };
}

describe('createDesignerCommandAdapter tree mode', () => {
  it('adds a node between source and downstream', () => {
    const config = createDingFlowConfig();
    const doc = projectTreeToDoc(createSimpleTreeDocument(), config);
    const core = createDesignerCore(doc, config);
    const adapter = createDesignerCommandAdapter(core);

    const initialSnapshot = core.getSnapshot();
    expect(initialSnapshot.doc.nodes.length).toBe(3);
    expect(initialSnapshot.doc.edges.length).toBe(2);

    const result = adapter.execute({
      type: 'insertChainNode',
      sourceId: 'n1',
      nodeType: 'dt-approval',
      data: { label: 'New Approver', desc: 'Please set' },
    });

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();

    const afterSnapshot = core.getSnapshot();
    expect(afterSnapshot.doc.nodes.length).toBe(4);
    expect(result.snapshot.doc.nodes.length).toBe(4);
    expect(afterSnapshot.doc.edges.length).toBe(3);

    const n1Outgoing = afterSnapshot.doc.edges.filter((e) => e.source === 'n1');
    expect(n1Outgoing.length).toBe(1);
    const newId = n1Outgoing[0].target;
    expect(newId).not.toBe('n2');

    const newOutgoing = afterSnapshot.doc.edges.filter((e) => e.source === newId);
    expect(newOutgoing.length).toBe(1);
    expect(newOutgoing[0].target).toBe('n2');
  });

  it('adds a node after a leaf node with no downstream', () => {
    const config = createDingFlowConfig();
    const doc = projectTreeToDoc(createSimpleTreeDocument(), config);
    const core = createDesignerCore(doc, config);
    const adapter = createDesignerCommandAdapter(core);

    const result = adapter.execute({
      type: 'insertChainNode',
      sourceId: 'n2',
      nodeType: 'dt-cc',
      data: { label: 'CC', desc: 'Please set' },
    });

    expect(result.ok).toBe(true);
    const afterSnapshot = core.getSnapshot();
    expect(afterSnapshot.doc.nodes.length).toBe(4);
    expect(afterSnapshot.doc.edges.length).toBe(3);

    const n2Outgoing = afterSnapshot.doc.edges.filter((e) => e.source === 'n2');
    expect(n2Outgoing.length).toBe(1);
    const newId = n2Outgoing[0].target;
    const newOutgoing = afterSnapshot.doc.edges.filter((e) => e.source === newId);
    expect(newOutgoing.length).toBe(1);
    expect(newOutgoing[0].target).toBe('n3');
  });

  it('tracks snapshot identity correctly for useSyncExternalStore', () => {
    const config = createDingFlowConfig();
    const doc = projectTreeToDoc(createSimpleTreeDocument(), config);
    const core = createDesignerCore(doc, config);
    const adapter = createDesignerCommandAdapter(core);

    const before = core.getSnapshot();
    const beforeDocRef = before.doc;

    adapter.execute({
      type: 'insertChainNode',
      sourceId: 'n1',
      nodeType: 'dt-approval',
      data: { label: 'New', desc: '' },
    });

    const after = core.getSnapshot();
    expect(after.doc).not.toBe(beforeDocRef);
    expect(after).not.toBe(before);
    expect(after.doc.nodes.length).not.toBe(beforeDocRef.nodes.length);
  });

  it('updates the source TreeDocument when a tree owner is provided', () => {
    const config = createDingFlowConfig();
    const initialTree = createSimpleTreeDocument();
    let ownedTree = structuredClone(initialTree);
    const doc = projectTreeToDoc(ownedTree, config);
    const core = createDesignerCore(doc, config);
    const adapter = createDesignerCommandAdapter(core, {
      getTreeDocument: () => ownedTree,
      setTreeDocument: (next) => {
        ownedTree = next;
      },
      config,
    });

    const result = adapter.execute({
      type: 'insertChainNode',
      sourceId: 'n1',
      nodeType: 'dt-approval',
      data: { label: 'Tree Owned Approver' },
    });

    expect(result.ok).toBe(true);
    expect(ownedTree.root.child?.id).not.toBe('n2');
    expect(ownedTree.root.child?.type).toBe('dt-approval');
    expect(ownedTree.root.child?.data.label).toBe('Tree Owned Approver');
    expect(ownedTree.root.child?.child?.id).toBe('n2');
    expect(core.getSnapshot().doc.nodes).toHaveLength(4);
  });

  it('updates node data through the owned TreeDocument when a tree owner is provided', () => {
    const config = createDingFlowConfig();
    let ownedTree = structuredClone(createSimpleTreeDocument());
    const core = createDesignerCore(projectTreeToDoc(ownedTree, config), config);
    const adapter = createDesignerCommandAdapter(core, {
      getTreeDocument: () => ownedTree,
      setTreeDocument: (next) => {
        ownedTree = next;
      },
      config,
    });

    const result = adapter.execute({
      type: 'updateNodeData',
      nodeId: 'n2',
      data: { label: 'Updated Approver' },
    });

    expect(result.ok).toBe(true);
    expect(ownedTree.root.child?.data.label).toBe('Updated Approver');
    expect(core.getSnapshot().doc.nodes.find((node) => node.id === 'n2')?.data.label).toBe(
      'Updated Approver',
    );
  });

  it('deletes a chain node through the owned TreeDocument and reconnects its child', () => {
    const config = createDingFlowConfig();
    let ownedTree = structuredClone(createSimpleTreeDocument());
    const core = createDesignerCore(projectTreeToDoc(ownedTree, config), config);
    const adapter = createDesignerCommandAdapter(core, {
      getTreeDocument: () => ownedTree,
      setTreeDocument: (next) => {
        ownedTree = next;
      },
      config,
    });

    const result = adapter.execute({
      type: 'deleteNode',
      nodeId: 'n2',
    });

    expect(result.ok).toBe(true);
    expect(ownedTree.root.child?.id).toBe('n3');
    expect(core.getSnapshot().doc.nodes.map((node) => node.id)).toEqual(['n1', 'n3']);
  });

  it('adds a branch through the owned TreeDocument', () => {
    const config = createDingFlowConfig();
    let ownedTree = structuredClone(createBranchingTreeDocument());
    const core = createDesignerCore(projectTreeToDoc(ownedTree, config), config);
    const adapter = createDesignerCommandAdapter(core, {
      getTreeDocument: () => ownedTree,
      setTreeDocument: (next) => {
        ownedTree = next;
      },
      config,
    });

    const result = adapter.execute({
      type: 'addBranch',
      nodeId: 'n2',
      branchData: { label: '条件3' },
      childType: 'dt-approval',
      childData: { label: '分支C审批' },
    });

    expect(result.ok).toBe(true);
    expect(ownedTree.root.child?.branches).toHaveLength(3);
    expect(ownedTree.root.child?.branches?.[2]?.data.priority).toBe(3);
    expect(ownedTree.root.child?.branches?.[2]?.child?.data.label).toBe('分支C审批');
  });

  it('keeps continuation below all branches after adding a branch', () => {
    const config = createDingFlowConfig();
    let ownedTree = structuredClone(createBranchingTreeDocument());
    const core = createDesignerCore(projectTreeToDoc(ownedTree, config), config);
    const adapter = createDesignerCommandAdapter(core, {
      getTreeDocument: () => ownedTree,
      setTreeDocument: (next) => {
        ownedTree = next;
      },
      config,
    });

    const result = adapter.execute({
      type: 'addBranch',
      nodeId: 'n2',
      branchData: { label: '条件3' },
      childType: 'dt-approval',
      childData: { label: '分支C审批' },
    });

    expect(result.ok).toBe(true);

    const nodeMap = new Map(core.getSnapshot().doc.nodes.map((node) => [node.id, node]));
    const continuation = nodeMap.get('n5');
    const branchLeaves = ['n3', 'n4', ownedTree.root.child?.branches?.[2]?.child?.id].filter(
      (id): id is string => Boolean(id),
    );

    expect(continuation).toBeDefined();
    for (const leafId of branchLeaves) {
      expect(continuation!.position.y).toBeGreaterThan(nodeMap.get(leafId)!.position.y);
    }
  });

  it('moves a branch through the owned TreeDocument', () => {
    const config = createDingFlowConfig();
    let ownedTree = structuredClone(createBranchingTreeDocument());
    const core = createDesignerCore(projectTreeToDoc(ownedTree, config), config);
    const adapter = createDesignerCommandAdapter(core, {
      getTreeDocument: () => ownedTree,
      setTreeDocument: (next) => {
        ownedTree = next;
      },
      config,
    });

    const result = adapter.execute({
      type: 'moveBranch',
      nodeId: 'n2',
      branchId: 'b2',
      direction: 'left',
    });

    expect(result.ok).toBe(true);
    expect(ownedTree.root.child?.branches?.map((branch) => branch.id)).toEqual(['b2', 'b1']);
    expect(ownedTree.root.child?.branches?.map((branch) => branch.data.priority)).toEqual([1, 2]);
  });

  it('deletes a branch through the owned TreeDocument while preserving minimum branch count', () => {
    const config = createDingFlowConfig();
    let ownedTree = structuredClone(createBranchingTreeDocument());
    ownedTree.root.child!.branches!.push({
      id: 'b3',
      data: { label: '条件3', priority: 3 },
      child: { id: 'n6', type: 'dt-approval', data: { label: '分支C审批' } },
    });
    const core = createDesignerCore(projectTreeToDoc(ownedTree, config), config);
    const adapter = createDesignerCommandAdapter(core, {
      getTreeDocument: () => ownedTree,
      setTreeDocument: (next) => {
        ownedTree = next;
      },
      config,
    });

    const result = adapter.execute({
      type: 'deleteBranch',
      nodeId: 'n2',
      branchId: 'b2',
    });

    expect(result.ok).toBe(true);
    expect(ownedTree.root.child?.branches?.map((branch) => branch.id)).toEqual(['b1', 'b3']);
    expect(ownedTree.root.child?.branches?.map((branch) => branch.data.priority)).toEqual([1, 2]);
  });

  it('keeps owner tree undo and redo coherent with the projected graph', () => {
    const config = createDingFlowConfig();
    let ownedTree = structuredClone(createSimpleTreeDocument());
    const core = createDesignerCore(projectTreeToDoc(ownedTree, config), config);
    const adapter = createDesignerCommandAdapter(core, {
      getTreeDocument: () => ownedTree,
      setTreeDocument: (next) => {
        ownedTree = next;
      },
      config,
    });

    const inserted = adapter.execute({
      type: 'insertChainNode',
      sourceId: 'n1',
      nodeType: 'dt-approval',
      data: { label: 'Undoable approver' },
    });

    expect(inserted.ok).toBe(true);
    expect(ownedTree.root.child?.data.label).toBe('Undoable approver');
    expect(core.getSnapshot().doc.nodes).toHaveLength(4);

    adapter.execute({ type: 'undo' });

    expect(ownedTree.root.child?.id).toBe('n2');
    expect(core.getSnapshot().doc.nodes).toHaveLength(3);

    adapter.execute({ type: 'redo' });

    expect(ownedTree.root.child?.data.label).toBe('Undoable approver');
    expect(core.getSnapshot().doc.nodes).toHaveLength(4);
  });

  it('rolls back graph transaction when relayout throws during insertChainNode', () => {
    const config = createDingFlowConfig();
    const doc = projectTreeToDoc(createSimpleTreeDocument(), config);
    const core = createDesignerCore(doc, config);
    const adapter = createDesignerCommandAdapter(core);
    const before = core.getSnapshot();

    const beginSpy = vi.spyOn(core, 'beginTransaction');
    const commitSpy = vi.spyOn(core, 'commitTransaction');
    const rollbackSpy = vi.spyOn(core, 'rollbackTransaction');
    vi.spyOn(core, 'layoutNodes').mockImplementation(() => {
      throw new Error('relayout failed');
    });

    expect(() =>
      adapter.execute({
        type: 'insertChainNode',
        sourceId: 'n1',
        nodeType: 'dt-approval',
        data: { label: 'Will rollback' },
      }),
    ).toThrow('relayout failed');

    expect(beginSpy).toHaveBeenCalledWith('insert-chain-node');
    expect(commitSpy).not.toHaveBeenCalled();
    expect(rollbackSpy).toHaveBeenCalledOnce();
    expect(core.getSnapshot().doc).toEqual(before.doc);
  });
});
