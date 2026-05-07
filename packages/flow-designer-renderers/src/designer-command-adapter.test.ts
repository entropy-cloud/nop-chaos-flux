import { describe, expect, it } from 'vitest';
import {
  createDesignerCore,
  layoutStructuredTree,
  projectTree,
  normalizeConfig,
} from '@nop-chaos/flow-designer-core';
import type {
  DesignerConfig,
  GraphDocument,
  TreeDocument,
} from '@nop-chaos/flow-designer-core';
import { createDesignerCommandAdapter } from './designer-command-adapter';

function createTestDesignerConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      {
        id: 'start',
        label: 'Start',
        defaults: { label: 'Start' },
        constraints: { maxInstances: 1 },
      },
      {
        id: 'task',
        label: 'Task',
        defaults: { label: 'Task' },
      },
      {
        id: 'end',
        label: 'End',
        defaults: { label: 'End' },
      },
    ],
    edgeTypes: [{ id: 'default', label: 'Flow', defaults: {} }],
    palette: {
      groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['start', 'task', 'end'] }],
    },
  };
}

function createDocumentWithEdgeChain(): GraphDocument {
  return {
    id: 'doc-1',
    kind: 'flow',
    name: 'Example',
    version: '1.0.0',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
      { id: 'task-1', type: 'task', position: { x: 100, y: 0 }, data: { label: 'Task' } },
      { id: 'end-1', type: 'end', position: { x: 200, y: 0 }, data: { label: 'End' } },
    ],
    edges: [
      { id: 'edge-1', type: 'default', source: 'start-1', target: 'task-1', data: {} },
      { id: 'edge-2', type: 'default', source: 'task-1', target: 'end-1', data: {} },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

describe('createDesignerCommandAdapter', () => {
  it('normalizes shared command results for reconnect success and rejection', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const success = adapter.execute({
      type: 'reconnectEdge',
      edgeId: 'edge-1',
      source: 'start-1',
      target: 'end-1',
    });

    expect(success).toMatchObject({
      ok: true,
      data: expect.objectContaining({ id: 'edge-1', target: 'end-1' }),
    });
    expect(success.snapshot.doc.edges.find((edge) => edge.id === 'edge-1')).toMatchObject({
      source: 'start-1',
      target: 'end-1',
    });

    const failure = adapter.execute({
      type: 'reconnectEdge',
      edgeId: 'edge-2',
      source: 'start-1',
      target: 'end-1',
    });

    expect(failure).toMatchObject({
      ok: false,
      reason: 'duplicate-edge',
      error: 'Duplicate edges are not supported in the playground example.',
    });
  });

  it('preserves port ids when adding and reconnecting edges', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const added = adapter.execute({
      type: 'addEdge',
      source: 'start-1',
      target: 'end-1',
      sourcePort: 'out-1',
      targetPort: 'in-1',
    });

    expect(added).toMatchObject({
      ok: true,
      data: expect.objectContaining({ sourcePort: 'out-1', targetPort: 'in-1' }),
    });

    const reconnect = adapter.execute({
      type: 'reconnectEdge',
      edgeId: 'edge-1',
      source: 'start-1',
      target: 'task-1',
      sourcePort: 'out-2',
      targetPort: 'in-2',
    });

    expect(reconnect).toMatchObject({
      ok: true,
      data: expect.objectContaining({ sourcePort: 'out-2', targetPort: 'in-2' }),
    });
  });

  it('marks unchanged viewport updates without creating a failure result', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const result = adapter.execute({
      type: 'setViewport',
      viewport: { x: 0.004, y: 0.004, zoom: 1.0004 },
    });

    expect(result).toMatchObject({ ok: true, reason: 'unchanged' });
    expect(result.snapshot.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('moves nodes through the shared adapter result surface', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const moved = adapter.execute({
      type: 'moveNode',
      nodeId: 'task-1',
      position: { x: 144, y: 24 },
    });

    expect(moved).toMatchObject({
      ok: true,
      data: expect.objectContaining({ id: 'task-1', position: { x: 144, y: 24 } }),
    });

    const unchanged = adapter.execute({
      type: 'moveNode',
      nodeId: 'task-1',
      position: { x: 144, y: 24 },
    });

    expect(unchanged).toMatchObject({ ok: true, reason: 'unchanged' });
  });

  it('toggles palette collapsed state', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const result = adapter.execute({ type: 'togglePalette' });

    expect(result).toMatchObject({ ok: true });
    expect(result.snapshot.paletteCollapsed).toBe(true);
    expect(result.snapshot.inspectorCollapsed).toBe(false);
  });

  it('toggles palette back to expanded state', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    adapter.execute({ type: 'togglePalette' });
    const result = adapter.execute({ type: 'togglePalette' });

    expect(result).toMatchObject({ ok: true });
    expect(result.snapshot.paletteCollapsed).toBe(false);
    expect(result.snapshot.inspectorCollapsed).toBe(false);
  });

  it('toggles inspector collapsed state', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const result = adapter.execute({ type: 'toggleInspector' });

    expect(result).toMatchObject({ ok: true });
    expect(result.snapshot.inspectorCollapsed).toBe(true);
    expect(result.snapshot.paletteCollapsed).toBe(false);
  });

  it('toggles inspector back to expanded state', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    adapter.execute({ type: 'toggleInspector' });
    const result = adapter.execute({ type: 'toggleInspector' });

    expect(result).toMatchObject({ ok: true });
    expect(result.snapshot.inspectorCollapsed).toBe(false);
    expect(result.snapshot.paletteCollapsed).toBe(false);
  });

  it('palette toggle does not affect inspector state', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const paletteResult = adapter.execute({ type: 'togglePalette' });

    expect(paletteResult).toMatchObject({ ok: true });
    expect(paletteResult.snapshot.paletteCollapsed).toBe(true);
    expect(paletteResult.snapshot.inspectorCollapsed).toBe(false);

    const inspectorResult = adapter.execute({ type: 'toggleInspector' });

    expect(inspectorResult).toMatchObject({ ok: true });
    expect(inspectorResult.snapshot.paletteCollapsed).toBe(true);
    expect(inspectorResult.snapshot.inspectorCollapsed).toBe(true);
  });

  it('toggle commands return fresh snapshot', () => {
    const core = createDesignerCore(createDocumentWithEdgeChain(), createTestDesignerConfig());
    const adapter = createDesignerCommandAdapter(core);

    const firstResult = adapter.execute({ type: 'togglePalette' });
    const secondResult = adapter.execute({ type: 'toggleInspector' });

    expect(firstResult.snapshot.paletteCollapsed).toBe(true);
    expect(firstResult.snapshot.inspectorCollapsed).toBe(false);
    expect(secondResult.snapshot.paletteCollapsed).toBe(true);
    expect(secondResult.snapshot.inspectorCollapsed).toBe(true);
  });
});

// ─── Tree mode insertChainNode tests ─────────────────────────────────────

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

describe('insertChainNode in tree mode', () => {
  it('should add a node between source and downstream', () => {
    const config = createDingFlowConfig();
    const doc = projectTreeToDoc(createSimpleTreeDocument(), config);
    const core = createDesignerCore(doc, config);
    const adapter = createDesignerCommandAdapter(core);

    // Verify initial state
    const initialSnapshot = core.getSnapshot();
    expect(initialSnapshot.doc.nodes.length).toBe(3);
    expect(initialSnapshot.doc.edges.length).toBe(2);

    // Insert a new approval node after n1 (the initiator)
    const result = adapter.execute({
      type: 'insertChainNode',
      sourceId: 'n1',
      nodeType: 'dt-approval',
      data: { label: 'New Approver', desc: 'Please set' },
    });

    // Command should succeed
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify snapshot has more nodes
    const afterSnapshot = core.getSnapshot();
    expect(afterSnapshot.doc.nodes.length).toBe(4);
    expect(result.snapshot.doc.nodes.length).toBe(4);

    // Verify edges: n1 → newNode, newNode → n2, n2 → n3
    expect(afterSnapshot.doc.edges.length).toBe(3);

    // Verify n1's outgoing goes to new node
    const n1Outgoing = afterSnapshot.doc.edges.filter((e) => e.source === 'n1');
    expect(n1Outgoing.length).toBe(1);
    const newId = n1Outgoing[0].target;
    expect(newId).not.toBe('n2');

    // Verify new node's outgoing goes to n2
    const newOutgoing = afterSnapshot.doc.edges.filter((e) => e.source === newId);
    expect(newOutgoing.length).toBe(1);
    expect(newOutgoing[0].target).toBe('n2');
  });

  it('should add a node after a leaf node (no downstream)', () => {
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

  it('should track snapshot identity correctly for useSyncExternalStore', () => {
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

    // Snapshot doc should be a different reference
    expect(after.doc).not.toBe(beforeDocRef);
    // Snapshot itself should be a different reference
    expect(after).not.toBe(before);
    // Node count should differ
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
});
