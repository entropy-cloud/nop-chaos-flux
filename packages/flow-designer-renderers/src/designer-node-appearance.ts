import type { NodeTypeConfig, TreeNodeTypeConfig } from '@nop-chaos/flow-designer-core';
import { t } from '@nop-chaos/flux-i18n';

const DEFAULT_NODE_TYPE_META: Record<string, { labelKey: string; icon?: string }> = {
  'dt-initiator': { labelKey: 'flux.flowDesigner.nodeType.dtInitiator', icon: 'user' },
  'dt-approval': { labelKey: 'flux.flowDesigner.nodeType.dtApproval', icon: 'user-check' },
  'dt-cc': { labelKey: 'flux.flowDesigner.nodeType.dtCc', icon: 'mail' },
  'dt-condition': { labelKey: 'flux.flowDesigner.nodeType.dtCondition', icon: 'git-branch' },
  'dt-parallel': { labelKey: 'flux.flowDesigner.nodeType.dtParallel', icon: 'git-merge' },
  'dt-subprocess': { labelKey: 'flux.flowDesigner.nodeType.dtSubprocess', icon: 'layers' },
  'dt-end': { labelKey: 'flux.flowDesigner.nodeType.dtEnd', icon: 'square' },
  'action-entry': { labelKey: 'flux.flowDesigner.nodeType.actionEntry', icon: 'play' },
  'action-step': { labelKey: 'flux.flowDesigner.nodeType.actionStep', icon: 'zap' },
  'action-end': { labelKey: 'flux.flowDesigner.nodeType.actionEnd', icon: 'square' },
  start: { labelKey: 'flux.flowDesigner.nodeType.start', icon: 'play' },
  end: { labelKey: 'flux.flowDesigner.nodeType.end', icon: 'square' },
  task: { labelKey: 'flux.flowDesigner.nodeType.task', icon: 'clipboard-list' },
  condition: { labelKey: 'flux.flowDesigner.nodeType.condition', icon: 'git-branch' },
  parallel: { labelKey: 'flux.flowDesigner.nodeType.parallel', icon: 'git-merge' },
  loop: { labelKey: 'flux.flowDesigner.nodeType.loop', icon: 'repeat' },
};

// plan 475 Phase 3：accent 身份色走 --fd-node-accent-* 令牌（.nop-designer 作用域定义，
// light 值与 dingtalk demo parity 的 e2e hex 合同一致；身份色不随 dark 翻转）。
// fallback 保留 hex 供裸宿主兜底。dt-* 与同义通用键色值不同（如 dt-condition 绿 vs
// condition 琥珀），各持独立令牌，不得合并。
const DEFAULT_NODE_TYPE_COLORS: Record<string, string> = {
  'dt-initiator': 'var(--fd-node-accent-dt-initiator, #576a95)',
  'dt-approval': 'var(--fd-node-accent-dt-approval, #ff943e)',
  'dt-cc': 'var(--fd-node-accent-dt-cc, #3296fa)',
  'dt-condition': 'var(--fd-node-accent-dt-condition, #15bc83)',
  'dt-parallel': 'var(--fd-node-accent-dt-parallel, #6366f1)',
  'dt-subprocess': 'var(--fd-node-accent-dt-subprocess, #8b5cf6)',
  'dt-end': 'var(--fd-node-accent-dt-end, #94a3b8)',
  'action-entry': 'var(--fd-node-accent-action-entry, #10b981)',
  'action-step': 'var(--fd-node-accent-action-step, #3b82f6)',
  'action-end': 'var(--fd-node-accent-action-end, #94a3b8)',
  start: 'var(--fd-node-accent-start, #10b981)',
  end: 'var(--fd-node-accent-end, #ef4444)',
  task: 'var(--fd-node-accent-task, #3b82f6)',
  condition: 'var(--fd-node-accent-condition, #f59e0b)',
  parallel: 'var(--fd-node-accent-parallel, #8b5cf6)',
  loop: 'var(--fd-node-accent-loop, #ec4899)',
};

const DEFAULT_TREE_MENU_PRIORITY: Record<string, number> = {
  'dt-approval': 10,
  'dt-cc': 20,
  'dt-condition': 30,
  'dt-parallel': 40,
  'dt-subprocess': 50,
  'action-step': 10,
};

export function resolveNodeTypeAccent(
  typeId: string,
  nodeType?: NodeTypeConfig,
): string | undefined {
  return nodeType?.appearance?.borderColor ?? DEFAULT_NODE_TYPE_COLORS[typeId];
}

export function resolveNodeTypeMeta(typeId: string, nodeType?: NodeTypeConfig) {
  const fallback = DEFAULT_NODE_TYPE_META[typeId];
  return {
    label: nodeType?.label ?? (fallback ? t(fallback.labelKey) : typeId),
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
  return Boolean(
    tree?.allowChild || tree?.allowBranches || DEFAULT_TREE_MENU_PRIORITY[nodeType.id] != null,
  );
}

export function compareTreeMenuNodeTypes(a: NodeTypeConfig, b: NodeTypeConfig): number {
  const priorityA = DEFAULT_TREE_MENU_PRIORITY[a.id] ?? Number.MAX_SAFE_INTEGER;
  const priorityB = DEFAULT_TREE_MENU_PRIORITY[b.id] ?? Number.MAX_SAFE_INTEGER;
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  return a.label.localeCompare(b.label);
}
