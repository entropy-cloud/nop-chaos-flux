import { describe, it, expect } from 'vitest';
import type { TreeDocument, NormalizedDesignerConfig } from './types';
import { projectTree, resetProjectionState } from './tree-projection';
import { layoutTreeWithElk } from './tree-layout';
import { normalizeConfig } from './core/config';

function makeActionFlowConfig(): NormalizedDesignerConfig {
  return normalizeConfig({
    version: '1.0.0',
    kind: 'action-flow',
    documentMode: 'tree',
    treeConfig: {
      layout: { direction: 'TB', nodeSpacing: 40, layerSpacing: 80 },
      showGatewayNodes: false,
      showMergeNodes: false,
      autoLayout: true,
      chainEdgeType: 'action-chain',
      branchEdgeType: 'action-branch',
    },
    nodeTypes: [
      { id: 'action-entry', label: '入口', body: { type: 'text' }, tree: { allowChild: true, allowBranches: false } },
      { id: 'action-step', label: '动作', body: { type: 'text' }, tree: { allowChild: true, allowBranches: true, maxBranches: 3 } },
      { id: 'action-end', label: '结束', body: { type: 'text' }, tree: { allowChild: false, allowBranches: false, isTerminal: true } },
    ],
    edgeTypes: [
      { id: 'action-chain', appearance: { stroke: '#64748b', strokeWidth: 2 } },
      { id: 'action-branch', appearance: { stroke: '#3b82f6', strokeWidth: 1.5 } },
    ],
  });
}

function makeActionFlowTree(): TreeDocument {
  return {
    id: 'user-save-flow',
    kind: 'action-flow',
    name: '用户保存流程',
    version: '1.0.0',
    root: {
      id: 'entry', type: 'action-entry',
      data: { label: '入口' },
      child: {
        id: 'precheck', type: 'action-step',
        data: { label: '预检查', action: 'setValue', when: '${userId != null}' },
        branches: [
          {
            id: 'then-precheck',
            data: { branchType: 'then', label: '成功' },
            child: {
              id: 'fetch-user', type: 'action-step',
              data: { label: '加载用户数据', action: 'ajax', timeout: 5000 },
              branches: [
                {
                  id: 'then-fetch',
                  data: { branchType: 'then', label: '成功' },
                  child: {
                    id: 'save-form', type: 'action-step',
                    data: { label: '保存表单', action: 'component:submit' },
                    branches: [
                      {
                        id: 'then-save',
                        data: { branchType: 'then', label: '成功' },
                        child: { id: 'refresh-list', type: 'action-step', data: { label: '刷新列表', action: 'component:refresh' } },
                      },
                      {
                        id: 'onerror-save',
                        data: { branchType: 'onError', label: '失败' },
                        child: { id: 'show-save-error', type: 'action-step', data: { label: '显示错误', action: 'showToast' } },
                      },
                    ],
                  },
                },
                {
                  id: 'onerror-fetch',
                  data: { branchType: 'onError', label: '失败' },
                  child: { id: 'retry-fetch', type: 'action-step', data: { label: '重试加载', action: 'ajax' } },
                },
              ],
            },
          },
          {
            id: 'onerror-precheck',
            data: { branchType: 'onError', label: '失败' },
            child: { id: 'show-precheck-error', type: 'action-step', data: { label: '提示选择用户', action: 'showToast' } },
          },
        ],
        child: { id: 'end', type: 'action-end', data: { label: '结束' } },
      },
    },
  };
}

describe('Action Flow Tree Projection', () => {
  it('projects correct node count', () => {
    resetProjectionState();
    const tree = makeActionFlowTree();
    const config = makeActionFlowConfig();
    const { nodes } = projectTree(tree, config);

    expect(nodes).toHaveLength(9);
    const ids = nodes.map((n) => n.id);
    expect(ids).toContain('entry');
    expect(ids).toContain('precheck');
    expect(ids).toContain('fetch-user');
    expect(ids).toContain('save-form');
    expect(ids).toContain('refresh-list');
    expect(ids).toContain('show-save-error');
    expect(ids).toContain('retry-fetch');
    expect(ids).toContain('show-precheck-error');
    expect(ids).toContain('end');
  });

  it('projects correct edge count', () => {
    resetProjectionState();
    const tree = makeActionFlowTree();
    const config = makeActionFlowConfig();
    const { edges } = projectTree(tree, config);

    expect(edges).toHaveLength(11);
  });

  it('creates chain edge from entry to precheck', () => {
    resetProjectionState();
    const tree = makeActionFlowTree();
    const config = makeActionFlowConfig();
    const { edges } = projectTree(tree, config);

    const chainEdges = edges.filter((e) => e.type === 'action-chain');
    expect(chainEdges).toHaveLength(1);
    expect(chainEdges[0].source).toBe('entry');
    expect(chainEdges[0].target).toBe('precheck');
  });

  it('creates branch edges with branchType data from precheck', () => {
    resetProjectionState();
    const tree = makeActionFlowTree();
    const config = makeActionFlowConfig();
    const { edges } = projectTree(tree, config);

    const branchFromPrecheck = edges.filter(
      (e) => e.source === 'precheck' && e.type === 'action-branch',
    );
    expect(branchFromPrecheck).toHaveLength(2);

    const targets = branchFromPrecheck.map((e) => e.target).sort();
    expect(targets).toEqual(['fetch-user', 'show-precheck-error']);

    const thenEdge = branchFromPrecheck.find((e) => e.target === 'fetch-user');
    expect(thenEdge?.data.branchType).toBe('then');

    const errorEdge = branchFromPrecheck.find((e) => e.target === 'show-precheck-error');
    expect(errorEdge?.data.branchType).toBe('onError');
  });

  it('creates branch edges from fetch-user', () => {
    resetProjectionState();
    const tree = makeActionFlowTree();
    const config = makeActionFlowConfig();
    const { edges } = projectTree(tree, config);

    const branchFromFetch = edges.filter(
      (e) => e.source === 'fetch-user' && e.type === 'action-branch',
    );
    expect(branchFromFetch).toHaveLength(2);

    const targets = branchFromFetch.map((e) => e.target).sort();
    expect(targets).toEqual(['retry-fetch', 'save-form']);

    const thenEdge = branchFromFetch.find((e) => e.target === 'save-form');
    expect(thenEdge?.data.branchType).toBe('then');

    const errorEdge = branchFromFetch.find((e) => e.target === 'retry-fetch');
    expect(errorEdge?.data.branchType).toBe('onError');
  });

  it('creates branch edges from save-form', () => {
    resetProjectionState();
    const tree = makeActionFlowTree();
    const config = makeActionFlowConfig();
    const { edges } = projectTree(tree, config);

    const branchFromSave = edges.filter(
      (e) => e.source === 'save-form' && e.type === 'action-branch',
    );
    expect(branchFromSave).toHaveLength(2);

    const targets = branchFromSave.map((e) => e.target).sort();
    expect(targets).toEqual(['refresh-list', 'show-save-error']);

    const thenEdge = branchFromSave.find((e) => e.target === 'refresh-list');
    expect(thenEdge?.data.branchType).toBe('then');

    const errorEdge = branchFromSave.find((e) => e.target === 'show-save-error');
    expect(errorEdge?.data.branchType).toBe('onError');
  });

  it('creates merge edges converging at end', () => {
    resetProjectionState();
    const tree = makeActionFlowTree();
    const config = makeActionFlowConfig();
    const { edges } = projectTree(tree, config);

    const mergeToEnd = edges.filter((e) => e.target === 'end');
    expect(mergeToEnd).toHaveLength(4);

    const sources = mergeToEnd.map((e) => e.source).sort();
    expect(sources).toEqual(['refresh-list', 'retry-fetch', 'show-precheck-error', 'show-save-error']);
  });

  it('preserves node data through projection', () => {
    resetProjectionState();
    const tree = makeActionFlowTree();
    const config = makeActionFlowConfig();
    const { nodes } = projectTree(tree, config);

    const precheck = nodes.find((n) => n.id === 'precheck');
    expect(precheck?.data).toEqual({
      label: '预检查',
      action: 'setValue',
      when: '${userId != null}',
      branches: [
        {
          id: 'then-precheck',
          data: { branchType: 'then', label: '成功' },
          childId: 'fetch-user',
          childType: 'action-step',
          childLabel: '加载用户数据'
        },
        {
          id: 'onerror-precheck',
          data: { branchType: 'onError', label: '失败' },
          childId: 'show-precheck-error',
          childType: 'action-step',
          childLabel: '提示选择用户'
        }
      ]
    });

    const fetchUser = nodes.find((n) => n.id === 'fetch-user');
    expect(fetchUser?.data).toEqual({
      label: '加载用户数据',
      action: 'ajax',
      timeout: 5000,
    });
  });

  it('lays out all nodes with non-negative positions', async () => {
    resetProjectionState();
    const tree = makeActionFlowTree();
    const config = makeActionFlowConfig();
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
    const tree = makeActionFlowTree();
    const config = makeActionFlowConfig();
    const { nodes, edges } = projectTree(tree, config);

    const laidOut = await layoutTreeWithElk(
      nodes,
      edges,
      config.treeConfig!,
      config.nodeTypes,
    );

    const nodeMap = new Map(laidOut.map((n) => [n.id, n]));
    const yEntry = nodeMap.get('entry')!.position.y;
    const yPrecheck = nodeMap.get('precheck')!.position.y;
    const yEnd = nodeMap.get('end')!.position.y;

    expect(yPrecheck).toBeGreaterThanOrEqual(yEntry);
    expect(yEnd).toBeGreaterThanOrEqual(yPrecheck);
  });
});
