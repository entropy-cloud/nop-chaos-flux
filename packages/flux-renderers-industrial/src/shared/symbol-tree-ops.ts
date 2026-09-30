import type { ScadaSymbolNode } from '../serialization/config-types.js';

/**
 * Single-source SCADA symbol-tree operations (cq-4 Phase 3) — previously
 * verbatim copies across config-adapter / editor-engine / compute-inverse.
 */

/** Depth-first lookup by node id. */
export function findNodeById(nodes: ScadaSymbolNode[], id: string): ScadaSymbolNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Immutable subtree removal of every node whose id is in `removed`. */
export function removeNodes(symbols: ScadaSymbolNode[], removed: Set<string>): ScadaSymbolNode[] {
  const out: ScadaSymbolNode[] = [];
  for (const node of symbols) {
    if (removed.has(node.id)) continue;
    if (node.children) {
      const filteredChildren = removeNodes(node.children, removed);
      out.push({ ...node, children: filteredChildren });
    } else {
      out.push({ ...node });
    }
  }
  return out;
}

/** Immutable id-keyed patch application across the tree (clones visited nodes). */
export function applyUpdates(
  symbols: ScadaSymbolNode[],
  updates: Array<{ id: string; patch: Partial<ScadaSymbolNode> }>,
): ScadaSymbolNode[] {
  const patchById = new Map(updates.map((u) => [u.id, u.patch]));
  const apply = (nodes: ScadaSymbolNode[]): ScadaSymbolNode[] =>
    nodes.map((node) => {
      const patch = patchById.get(node.id);
      if (patch) {
        return { ...node, ...patch };
      }
      if (node.children) {
        return { ...node, children: apply(node.children) };
      }
      return { ...node };
    });
  return apply(symbols);
}
