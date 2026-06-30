import type { ReactNode } from 'react';
import { getIn } from '@nop-chaos/flux-core';
import {
  createTreeNodeId,
  toNodeKey,
  toTreeNodes,
  type TreeNodeRecord,
} from './tree-node-helpers.js';

export interface TreeSearchState {
  query: string;
  active: boolean;
  visibleNodeIds: Set<string>;
  forcedOpenNodeIds: Set<string>;
}

export const EMPTY_TREE_SEARCH: TreeSearchState = {
  query: '',
  active: false,
  visibleNodeIds: new Set<string>(),
  forcedOpenNodeIds: new Set<string>(),
};

function collectTreeNodeIdsInto(
  nodes: readonly TreeNodeRecord[],
  nodeIds: Set<string>,
  childrenKey: string,
  keyField: string,
  parentTreeNodeId?: string,
) {
  nodes.forEach((node, index) => {
    const nodeKey = toNodeKey(node, keyField, index);
    const treeNodeId = createTreeNodeId(parentTreeNodeId, nodeKey);
    nodeIds.add(treeNodeId);

    collectTreeNodeIdsInto(
      toTreeNodes(getIn(node, childrenKey)),
      nodeIds,
      childrenKey,
      keyField,
      treeNodeId,
    );
  });
}

export function collectTreeNodeIds(
  nodes: readonly TreeNodeRecord[],
  childrenKey: string,
  keyField: string,
  parentTreeNodeId?: string,
): Set<string> {
  const nodeIds = new Set<string>();
  collectTreeNodeIdsInto(nodes, nodeIds, childrenKey, keyField, parentTreeNodeId);
  return nodeIds;
}

export function computeTreeSearch(
  nodes: readonly TreeNodeRecord[],
  rawQuery: string,
  childrenKey: string,
  labelField: string,
  keyField: string,
): TreeSearchState {
  const query = rawQuery.trim();
  const normalizedQuery = query.toLowerCase();
  if (!normalizedQuery) {
    return { ...EMPTY_TREE_SEARCH, visibleNodeIds: new Set(), forcedOpenNodeIds: new Set() };
  }

  const matchedNodeIds = new Set<string>();
  const forcedOpenNodeIds = new Set<string>();

  const walk = (
    nodesList: readonly TreeNodeRecord[],
    parentTreeNodeId: string | undefined,
    ancestorIds: readonly string[],
  ): boolean => {
    let subtreeHasMatch = false;
    nodesList.forEach((node, index) => {
      const nodeKey = toNodeKey(node, keyField, index);
      const treeNodeId = createTreeNodeId(parentTreeNodeId, nodeKey);
      const labelValue = getIn(node, labelField);
      const labelStr = String(labelValue ?? '').toLowerCase();
      const isMatch = labelStr.includes(normalizedQuery);
      const childNodes = toTreeNodes(getIn(node, childrenKey));
      const childAncestors = [...ancestorIds, treeNodeId];
      const childHasMatch = walk(childNodes, treeNodeId, childAncestors);

      if (isMatch) {
        matchedNodeIds.add(treeNodeId);
        ancestorIds.forEach((aid) => forcedOpenNodeIds.add(aid));
        subtreeHasMatch = true;
      }

      if (childHasMatch) {
        forcedOpenNodeIds.add(treeNodeId);
        ancestorIds.forEach((aid) => forcedOpenNodeIds.add(aid));
        subtreeHasMatch = true;
      }
    });
    return subtreeHasMatch;
  };

  walk(nodes, undefined, []);

  const visibleNodeIds = new Set<string>(matchedNodeIds);
  forcedOpenNodeIds.forEach((id) => visibleNodeIds.add(id));

  return { query, active: true, visibleNodeIds, forcedOpenNodeIds };
}

export function renderHighlightedLabel(label: string, query: string): ReactNode {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return <span>{label}</span>;
  }

  const lower = label.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  let idx = lower.indexOf(normalizedQuery, cursor);

  while (idx !== -1) {
    if (idx > cursor) {
      parts.push(label.slice(cursor, idx));
    }
    parts.push(
      <mark
        key={`hl-${key}`}
        data-slot="tree-search-highlight"
        className="rounded-sm bg-warning/30 px-0.5 text-inherit"
      >
        {label.slice(idx, idx + normalizedQuery.length)}
      </mark>,
    );
    key += 1;
    cursor = idx + normalizedQuery.length;
    idx = lower.indexOf(normalizedQuery, cursor);
  }

  if (cursor < label.length) {
    parts.push(label.slice(cursor));
  }

  return <span>{parts}</span>;
}
