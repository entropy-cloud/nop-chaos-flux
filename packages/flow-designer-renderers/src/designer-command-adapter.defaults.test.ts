import { describe, expect, it } from 'vitest';
import { createTreeDesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, TreeDocument } from '@nop-chaos/flow-designer-core';
import { createDesignerCommandAdapter } from './designer-command-adapter.js';

/**
 * ux-r12 tft1：insert 命令须合并节点类型 defaults（designer-command-adapter）。
 * TaskFlow tf-* 节点 body 模板绑定 `${step.common.displayName || step.common.name}`，
 * 而 DingFlow 菜单命令只带硬编码兜底 data（label 'CC' / desc 'Please set'）——
 * 不合并 defaults 时画布新节点渲染空标签、名字与类型无关。
 * 优先级：defaults 覆盖兜底；dt-* 家族（defaults 为空对象）保持现值不变。
 */

function createTaskFlowConfig(): DesignerConfig {
  return {
    version: '1.1.0',
    kind: 'nop-taskflow-dingflow',
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
        id: 'tf-entry',
        label: 'Entry',
        icon: 'log-in',
        tree: { allowChild: true, allowBranches: false, isTerminal: false },
      },
      {
        id: 'tf-delay',
        label: 'Delay',
        icon: 'clock',
        // 与 taskflow-dingflow-schema.json 同构：defaults 带完整 step 字段
        defaults: {
          step: { id: 'delay-x', type: 'delay', common: { name: 'delay', description: '' }, props: { type: 'delay', waitMillis: 1000 } },
        },
        tree: { allowChild: true, allowBranches: false, isTerminal: false },
      },
      {
        id: 'tf-condition',
        label: 'If Condition',
        icon: 'git-branch',
        defaults: {
          step: { id: 'cond-x', type: 'condition', common: { name: 'condition' }, props: { type: 'condition' } },
        },
        tree: { allowChild: true, allowBranches: true, isTerminal: false },
      },
      {
        id: 'dt-approval',
        label: '审批人',
        icon: 'user-check',
        defaults: {},
        tree: { allowChild: true, allowBranches: false, isTerminal: false },
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

function createTaskFlowDocument(): TreeDocument {
  return {
    id: 'tf-flow',
    kind: 'nop-taskflow-dingflow',
    name: 'TaskFlow Demo',
    version: '1.0.0',
    root: {
      id: 'root-1',
      type: 'tf-entry',
      data: {},
      child: {
        id: 'seq-1',
        type: 'tf-delay',
        data: { step: { id: 'seq-1', type: 'delay', common: { name: 'initSequence' }, props: { type: 'delay' } } },
        child: {
          id: 'end-1',
          type: 'tf-entry',
          data: {},
        },
      },
    },
  };
}

function createTaskFlowCore() {
  const creation = createTreeDesignerCore(createTaskFlowDocument(), createTaskFlowConfig());
  if (!creation.ok) {
    throw new Error(`tree core creation failed: ${creation.error.code} ${creation.error.message}`);
  }
  const core = creation.core;
  return { core, adapter: createDesignerCommandAdapter(core) };
}

describe('ux-r12 tft1: insert commands merge node-type defaults', () => {
  function walk(node: any, visit: (n: any) => void) {
    if (!node) return;
    visit(node);
    for (const branch of node.branches ?? []) {
      walk(branch.child, visit);
    }
    walk(node.child, visit);
  }

  it('insertChainNode fills data.step from defaults so the body template renders a label', () => {
    const { core, adapter } = createTaskFlowCore();
    const result = adapter.execute({
      type: 'insertChainNode',
      sourceId: 'root-1',
      nodeType: 'tf-delay',
      // 菜单命令的硬编码兜底 data（真实路径来自 createDingFlowMenuCommand）
      data: { label: 'CC', desc: 'Please set' },
    });
    expect(result.ok).toBe(true);
    const tree = core.getTreeDocument()!;
    let inserted: any;
    walk(tree.root, (n) => {
      if (n.type === 'tf-delay' && n.id !== 'seq-1') inserted = n;
    });
    expect(inserted).toBeTruthy();
    const step = inserted?.data?.step;
    expect(step, 'defaults.step must be merged into inserted node data').toBeTruthy();
    expect(step.common.name).toBe('delay');
  });

  it('overrides the generic CC fallback label with the defaults-derived name', () => {
    const { core, adapter } = createTaskFlowCore();
    adapter.execute({
      type: 'insertChainNode',
      sourceId: 'root-1',
      nodeType: 'tf-delay',
      data: { label: 'CC', desc: 'Please set' },
    });
    const tree = core.getTreeDocument()!;
    let inserted: any;
    walk(tree.root, (n) => {
      if (n.type === 'tf-delay' && n.id !== 'seq-1') inserted = n;
    });
    const label = inserted?.data?.label;
    expect(label, 'label must not stay the generic CC fallback').not.toBe('CC');
    expect(label).toBe('delay');
  });

  it('keeps dt-* fallback values untouched when the node type has empty defaults', () => {
    const { core, adapter } = createTaskFlowCore();
    adapter.execute({
      type: 'insertChainNode',
      sourceId: 'root-1',
      nodeType: 'dt-approval',
      data: { label: 'Approver', desc: 'Please set' },
    });
    const tree = core.getTreeDocument()!;
    let inserted: any;
    walk(tree.root, (n) => {
      if (n.type === 'dt-approval') inserted = n;
    });
    expect(inserted?.data?.label).toBe('Approver');
    expect(inserted?.data?.step).toBeUndefined();
  });

  it('insertBranchPair merges defaults into condData', () => {
    const { core, adapter } = createTaskFlowCore();
    const result = adapter.execute({
      type: 'insertBranchPair',
      sourceId: 'root-1',
      condNodeType: 'tf-condition',
      condData: { title: 'Condition', desc: 'Please set' },
    });
    expect(result.ok).toBe(true);
    const tree = core.getTreeDocument()!;
    let inserted: any;
    walk(tree.root, (n) => {
      if (n.type === 'tf-condition') inserted = n;
    });
    expect(inserted).toBeTruthy();
    expect(inserted?.data?.step?.common?.name).toBe('condition');
  });
});
