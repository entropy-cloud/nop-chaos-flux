import type { NodeTypeConfig } from '@nop-chaos/flow-designer-core';

interface PaletteGroupInput {
  id: string;
  label: string;
  nodeTypes: string[];
}

export function matchesPaletteQuery(nodeType: NodeTypeConfig | undefined, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (!nodeType) return false;
  return (
    nodeType.label.toLowerCase().includes(q) ||
    nodeType.id.toLowerCase().includes(q) ||
    (nodeType.description ?? '').toLowerCase().includes(q)
  );
}

export function filterPaletteGroups(
  groups: PaletteGroupInput[],
  nodeTypesById: Map<string, NodeTypeConfig>,
  query: string,
): PaletteGroupInput[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return groups.filter((group) => group.nodeTypes.length > 0);
  }
  return groups
    .map((group) => ({
      ...group,
      nodeTypes: group.nodeTypes.filter((id) => matchesPaletteQuery(nodeTypesById.get(id), q)),
    }))
    .filter((group) => group.nodeTypes.length > 0);
}
