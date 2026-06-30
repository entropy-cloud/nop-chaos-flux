import { getIn } from '@nop-chaos/flux-core';

export interface TreeNodeRecord {
  [key: string]: unknown;
}

export const DEFAULT_CHILDREN_KEY = 'children';
export const DEFAULT_LABEL_FIELD = 'label';
export const DEFAULT_KEY_FIELD = 'id';

export function createTreeNodeRepeatedTemplateId(ownerId: string): string {
  return `tree-node:${ownerId}`;
}

export function isTreeNodeRecord(value: unknown): value is TreeNodeRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function toTreeNodes(value: unknown): TreeNodeRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isTreeNodeRecord);
}

export function toNodeKey(node: TreeNodeRecord, keyField: string, index: number): string {
  const explicitKey = getIn(node, keyField);

  if (explicitKey !== undefined && explicitKey !== null && explicitKey !== '') {
    return String(explicitKey);
  }

  return `node:${index}`;
}

export function shouldExpandInitially(initiallyExpanded: unknown, depth: number): boolean {
  if (typeof initiallyExpanded === 'number') {
    return depth < initiallyExpanded;
  }

  return initiallyExpanded === true;
}

export function createTreeNodeId(parentTreeNodeId: string | undefined, nodeKey: string): string {
  return parentTreeNodeId ? `${parentTreeNodeId}/${nodeKey}` : nodeKey;
}
