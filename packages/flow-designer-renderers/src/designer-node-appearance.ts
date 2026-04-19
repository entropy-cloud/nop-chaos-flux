import type { NodeTypeConfig } from '@nop-chaos/flow-designer-core';

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

export function resolveNodeTypeAccent(typeId: string, nodeType?: NodeTypeConfig): string | undefined {
  return nodeType?.appearance?.borderColor ?? DEFAULT_NODE_TYPE_COLORS[typeId];
}
