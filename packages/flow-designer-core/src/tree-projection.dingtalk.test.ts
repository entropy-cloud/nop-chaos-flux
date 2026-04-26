import { describe, it, expect } from 'vitest';
import type { TreeDocument, NormalizedDesignerConfig } from './types';
import { projectTree, resetProjectionState } from './tree-projection';
import { layoutTreeWithElk } from './tree-layout';
import { normalizeConfig } from './core/config';

function makeDingtalkConfig(): NormalizedDesignerConfig {
  return normalizeConfig({
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
      { id: 'dt-initiator', label: '发起人', body: { type: 'text' }, tree: { allowChild: true, allowBranches: false } },
      { id: 'dt-approval', label: '审批人', body: { type: 'text' }, tree: { allowChild: true, allowBranches: false } },
      { id: 'dt-cc', label: '抄送人', body: { type: 'text' }, tree: { allowChild: true, allowBranches: false } },
      { id: 'dt-condition', label: '条件分支', body: { type: 'text' }, tree: { allowChild: true, allowBranches: true, minBranches: 2 } },
      { id: 'dt-parallel', label: '并行分支', body: { type: 'text' }, tree: { allowChild: true, allowBranches: true, minBranches: 2 } },
      { id: 'dt-subprocess', label: '子流程', body: { type: 'text' }, tree: { allowChild: true, allowBranches: false } },
      { id: 'dt-end', label: '结束', body: { type: 'text' }, tree: { allowChild: false, allowBranches: false, isTerminal: true } },
    ],
    edgeTypes: [
      { id: 'dt-chain', appearance: { stroke: '#94a3b8', strokeWidth: 2 } },
      { id: 'dt-branch', appearance: { stroke: '#3b82f6', strokeWidth: 2 } },
      { id: 'dt-merge', appearance: { stroke: '#94a3b8', strokeWidth: 1.5 } },
    ],
  });
}

function makeDingtalkTree(): TreeDocument {
  return {
    id: 'leave-approval',
    kind: 'dingtalk-workflow',
    name: '请假审批',
    version: '1.0.0',
    root: {
      id: 'k001', type: 'dt-initiator',
      data: { label: '发起人', type: 0 },
      child: {
        id: 'k002', type: 'dt-approval',
        data: { label: '主管审批', type: 1, setType: 2, examineMode: 1 },
        child: {
          id: 'k003', type: 'dt-condition',
          data: { label: '条件路由', type: 4, mode: 'exclusive' },
          branches: [
            {
              id: 'b1',
              data: { label: '长期请假', priority: 1 },
              child: {
                id: 'k004', type: 'dt-approval',
                data: { label: 'CEO审批', type: 1, setType: 1, examineMode: 2 },
              },
            },
            {
              id: 'b2',
              data: { label: '短期请假', priority: 2 },
              child: {
                id: 'k004b', type: 'dt-approval',
                data: { label: '直接主管审批', type: 1, setType: 2, examineMode: 1 },
              },
            },
          ],
          child: {
            id: 'k005', type: 'dt-cc',
            data: { label: '抄送HR', type: 2 },
            child: {
              id: 'k006', type: 'dt-parallel',
              data: { label: '并行处理', type: 8, mode: 'parallel' },
              branches: [
                {
                  id: 'b3',
                  data: { label: '并行分支1', priority: 1 },
                  child: {
                    id: 'k007', type: 'dt-approval',
                    data: { label: '人事确认', type: 1 },
                  },
                },
                {
                  id: 'b4',
                  data: { label: '并行分支2', priority: 2 },
                  child: {
                    id: 'k008', type: 'dt-subprocess',
                    data: { label: '工作交接', type: 5, callProcess: 'workHandover' },
                  },
                },
              ],
              child: {
                id: 'k009', type: 'dt-end',
                data: { label: '结束', type: -1 },
              },
            },
          },
        },
      },
    },
  };
}

describe('钉钉审批流 Tree Projection', () => {
  it('projects correct node count', () => {
    resetProjectionState();
    const tree = makeDingtalkTree();
    const config = makeDingtalkConfig();
    const { nodes } = projectTree(tree, config);

    expect(nodes).toHaveLength(10);
    const ids = nodes.map((n) => n.id);
    expect(ids).toEqual(['k001', 'k002', 'k003', 'k004', 'k004b', 'k005', 'k006', 'k007', 'k008', 'k009']);
  });

  it('projects correct edge count', () => {
    resetProjectionState();
    const tree = makeDingtalkTree();
    const config = makeDingtalkConfig();
    const { edges } = projectTree(tree, config);

    expect(edges).toHaveLength(11);
  });

  it('creates chain edges for the main spine', () => {
    resetProjectionState();
    const tree = makeDingtalkTree();
    const config = makeDingtalkConfig();
    const { edges } = projectTree(tree, config);

    const chainEdges = edges.filter((e) => e.type === 'dt-chain');
    expect(chainEdges).toHaveLength(3);

    const chainTargets = chainEdges.map((e) => e.target);
    expect(chainTargets).toContain('k002');
    expect(chainTargets).toContain('k003');
    expect(chainTargets).toContain('k006');
  });

  it('creates branch edges from condition node k003 to both condition approvals', () => {
    resetProjectionState();
    const tree = makeDingtalkTree();
    const config = makeDingtalkConfig();
    const { edges } = projectTree(tree, config);

    const branchEdgesFromK003 = edges.filter(
      (e) => e.source === 'k003' && e.type === 'dt-branch',
    );
    expect(branchEdgesFromK003).toHaveLength(2);
    const targets = branchEdgesFromK003.map((e) => e.target).sort();
    expect(targets).toEqual(['k004', 'k004b']);
  });

  it('creates branch edges from parallel node k006 to k007 and k008', () => {
    resetProjectionState();
    const tree = makeDingtalkTree();
    const config = makeDingtalkConfig();
    const { edges } = projectTree(tree, config);

    const branchEdgesFromK006 = edges.filter(
      (e) => e.source === 'k006' && e.type === 'dt-branch',
    );
    expect(branchEdgesFromK006).toHaveLength(2);
    const targets = branchEdgesFromK006.map((e) => e.target).sort();
    expect(targets).toEqual(['k007', 'k008']);
  });

  it('creates merge edges converging at k005 (condition merge)', () => {
    resetProjectionState();
    const tree = makeDingtalkTree();
    const config = makeDingtalkConfig();
    const { edges } = projectTree(tree, config);

    const mergeToK005 = edges.filter(
      (e) => e.target === 'k005' && e.type === 'dt-merge',
    );
    expect(mergeToK005).toHaveLength(2);
    const sources = mergeToK005.map((e) => e.source).sort();
    expect(sources).toEqual(['k004', 'k004b']);
  });

  it('creates merge edges converging at k009 (parallel merge)', () => {
    resetProjectionState();
    const tree = makeDingtalkTree();
    const config = makeDingtalkConfig();
    const { edges } = projectTree(tree, config);

    const mergeToK009 = edges.filter(
      (e) => e.target === 'k009' && e.type === 'dt-merge',
    );
    expect(mergeToK009).toHaveLength(2);
    const sources = mergeToK009.map((e) => e.source).sort();
    expect(sources).toEqual(['k007', 'k008']);
  });

  it('preserves node data through projection', () => {
    resetProjectionState();
    const tree = makeDingtalkTree();
    const config = makeDingtalkConfig();
    const { nodes } = projectTree(tree, config);

    const k001 = nodes.find((n) => n.id === 'k001');
    expect(k001?.data).toEqual({ label: '发起人', type: 0 });

    const k003 = nodes.find((n) => n.id === 'k003');
    expect(k003?.data).toEqual({
      label: '条件路由',
      type: 4,
      mode: 'exclusive',
      branches: [
        {
          id: 'b1',
          data: { label: '长期请假', priority: 1 },
          childId: 'k004',
          childType: 'dt-approval',
          childLabel: 'CEO审批'
        },
        {
          id: 'b2',
          data: { label: '短期请假', priority: 2 },
          childId: 'k004b',
          childType: 'dt-approval',
          childLabel: '直接主管审批'
        }
      ]
    });

    const k008 = nodes.find((n) => n.id === 'k008');
    expect(k008?.data).toEqual({ label: '工作交接', type: 5, callProcess: 'workHandover' });
  });

  it('lays out all nodes with non-negative positions', async () => {
    resetProjectionState();
    const tree = makeDingtalkTree();
    const config = makeDingtalkConfig();
    const { nodes, edges } = projectTree(tree, config);

    const laidOut = await layoutTreeWithElk(
      nodes,
      edges,
      config.treeConfig!,
      config.nodeTypes,
    );

    for (const node of laidOut) {
      expect(node.position.x).toBeGreaterThanOrEqual(0);
      expect(node.position.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('lays out nodes with y increasing downward', async () => {
    resetProjectionState();
    const tree = makeDingtalkTree();
    const config = makeDingtalkConfig();
    const { nodes, edges } = projectTree(tree, config);

    const laidOut = await layoutTreeWithElk(
      nodes,
      edges,
      config.treeConfig!,
      config.nodeTypes,
    );

    const nodeMap = new Map(laidOut.map((n) => [n.id, n]));
    const yK001 = nodeMap.get('k001')!.position.y;
    const yK002 = nodeMap.get('k002')!.position.y;
    const yK003 = nodeMap.get('k003')!.position.y;
    const yK005 = nodeMap.get('k005')!.position.y;
    const yK006 = nodeMap.get('k006')!.position.y;
    const yK009 = nodeMap.get('k009')!.position.y;

    expect(yK002).toBeGreaterThanOrEqual(yK001);
    expect(yK003).toBeGreaterThanOrEqual(yK002);
    expect(yK005).toBeGreaterThanOrEqual(yK003);
    expect(yK006).toBeGreaterThanOrEqual(yK005);
    expect(yK009).toBeGreaterThanOrEqual(yK006);
  });
});
