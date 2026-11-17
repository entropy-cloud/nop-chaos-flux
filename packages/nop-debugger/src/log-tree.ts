import type { NopDebugEvent } from './types.js';

interface NopDebugEventDisplay {
  id: number;
  parentEventId?: number;
  kind: NopDebugEvent['kind'];
  group: string;
  level: string;
  source: string;
  summary: string;
  timestamp: number;
  nodeId?: string;
  instancePath?: NopDebugEvent['instancePath'];
  interactionId?: string;
  durationMs?: number;
}

export function toDisplayProjection(event: NopDebugEvent): NopDebugEventDisplay {
  return {
    id: event.id,
    ...(event.parentEventId !== undefined ? { parentEventId: event.parentEventId } : {}),
    kind: event.kind,
    group: event.group,
    level: event.level,
    source: event.source,
    summary: event.summary,
    timestamp: event.timestamp,
    ...(event.nodeId !== undefined ? { nodeId: event.nodeId } : {}),
    ...(event.instancePath !== undefined ? { instancePath: event.instancePath } : {}),
    ...(event.interactionId !== undefined ? { interactionId: event.interactionId } : {}),
    ...(event.durationMs !== undefined ? { durationMs: event.durationMs } : {}),
  };
}

export interface NopDebugEventTreeNode {
  event: NopDebugEvent;
  children: NopDebugEventTreeNode[];
}

/**
 * Nested log tree (Cypress command-log semantics): children attach under their
 * parent in pre-order; orphans (missing parent) stay at root level in order.
 * Events arrive newest-first (store prepends), so roots render oldest-first.
 */
export function buildLogTree(events: readonly NopDebugEvent[]): NopDebugEventTreeNode[] {
  const byId = new Map<number, NopDebugEventTreeNode>();
  for (const event of events) {
    byId.set(event.id, { event, children: [] });
  }
  const roots: NopDebugEventTreeNode[] = [];
  for (const node of byId.values()) {
    const parentId = node.event.parentEventId;
    const parent = parentId !== undefined ? byId.get(parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const reverse = (list: NopDebugEventTreeNode[]) => [...list].reverse();
  const sortRecursive = (nodes: NopDebugEventTreeNode[]) => {
    for (const node of nodes) {
      node.children = reverse(node.children);
      sortRecursive(node.children);
    }
  };
  const orderedRoots = reverse(roots);
  sortRecursive(orderedRoots);
  return orderedRoots;
}
