import type { NodeTypeConfig, TreeNodeTypeConfig } from '@nop-chaos/flow-designer-core';

const DEFAULT_NODE_TYPE_META: Record<string, { label: string; icon?: string }> = {
  'dt-initiator': { label: '发起人', icon: 'user' },
  'dt-approval': { label: '审批节点', icon: 'user-check' },
  'dt-cc': { label: '抄送人', icon: 'mail' },
  'dt-condition': { label: '条件分支', icon: 'git-branch' },
  'dt-parallel': { label: '并行分支', icon: 'git-merge' },
  'dt-subprocess': { label: '子流程', icon: 'layers' },
  'dt-end': { label: '结束', icon: 'square' },
  'action-entry': { label: '入口', icon: 'play' },
  'action-step': { label: '动作', icon: 'zap' },
  'action-end': { label: '结束', icon: 'square' },
  start: { label: '开始节点', icon: 'play' },
  end: { label: '结束节点', icon: 'square' },
  task: { label: '任务节点', icon: 'clipboard-list' },
  condition: { label: '条件分支', icon: 'git-branch' },
  parallel: { label: '并行网关', icon: 'git-merge' },
  loop: { label: '循环节点', icon: 'repeat' },
};

const DEFAULT_NODE_TYPE_COLORS: Record<string, string> = {
  'dt-initiator': '#576a95',
  'dt-approval': '#ff943e',
  'dt-cc': '#3296fa',
  'dt-condition': '#15bc83',
  'dt-parallel': '#6366f1',
  'dt-subprocess': '#8b5cf6',
  'dt-end': '#94a3b8',
  'action-entry': '#10b981',
  'action-step': '#3b82f6',
  'action-end': '#94a3b8',
  start: '#10b981',
  end: '#ef4444',
  task: '#3b82f6',
  condition: '#f59e0b',
  parallel: '#8b5cf6',
  loop: '#ec4899',
};

const DEFAULT_TREE_MENU_PRIORITY: Record<string, number> = {
  'dt-approval': 10,
  'dt-cc': 20,
  'dt-condition': 30,
  'dt-parallel': 40,
  'dt-subprocess': 50,
  'action-step': 10,
};

export function resolveNodeTypeAccent(typeId: string, nodeType?: NodeTypeConfig): string | undefined {
  return nodeType?.appearance?.borderColor ?? DEFAULT_NODE_TYPE_COLORS[typeId];
}

export function resolveNodeTypeMeta(typeId: string, nodeType?: NodeTypeConfig) {
  const fallback = DEFAULT_NODE_TYPE_META[typeId];
  return {
    label: nodeType?.label ?? fallback?.label ?? typeId,
    icon: nodeType?.icon ?? fallback?.icon,
  };
}

function isTreeNodeTypeConfig(nodeType: NodeTypeConfig): nodeType is TreeNodeTypeConfig {
  return 'tree' in nodeType;
}

export function shouldIncludeInTreeAddMenu(nodeType: NodeTypeConfig): boolean {
  const tree = isTreeNodeTypeConfig(nodeType) ? nodeType.tree : undefined;
  if (tree?.isTerminal) {
    return false;
  }
  if (nodeType.id === 'dt-initiator' || nodeType.id === 'action-entry' || nodeType.id === 'start') {
    return false;
  }
  return Boolean(tree?.allowChild || tree?.allowBranches || DEFAULT_TREE_MENU_PRIORITY[nodeType.id] != null);
}

export function compareTreeMenuNodeTypes(a: NodeTypeConfig, b: NodeTypeConfig): number {
  const priorityA = DEFAULT_TREE_MENU_PRIORITY[a.id] ?? Number.MAX_SAFE_INTEGER;
  const priorityB = DEFAULT_TREE_MENU_PRIORITY[b.id] ?? Number.MAX_SAFE_INTEGER;
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  return a.label.localeCompare(b.label);
}
