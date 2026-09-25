import type { SchemaObject, SchemaValue } from '@nop-chaos/flux-core';
import type { OrgNode, OrgNodePage } from '../../schemas-org.js';

export type { OrgNode, OrgNodePage };

const ORG_NODE_KEYS = new Set([
  'id',
  'value',
  'name',
  'label',
  'type',
  'disabled',
  'disabledTip',
  'leaf',
  'children',
  'extra',
]);

/**
 * Protocol §3.1 tolerant parsing: label/value aliases, missing-field
 * fallbacks, strict `disabled === true`, unknown fields collapse into
 * `extra`, recursive children. Non-object entries are dropped.
 */
export function normalizeOrgNode(input: unknown): OrgNode | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }
  const entry = input as Record<string, unknown>;
  const rawId = entry.id ?? entry.value;
  const rawName = entry.name ?? entry.label;
  if (rawId == null && rawName == null) {
    return null;
  }
  const id = rawId != null ? String(rawId) : String(rawName);
  const name = rawName != null ? String(rawName) : rawId != null ? String(rawId) : id;
  const node: OrgNode = {
    id,
    name,
  };
  if (typeof entry.type === 'string' && entry.type) {
    node.type = entry.type;
  }
  if (entry.disabled === true) {
    node.disabled = true;
  }
  if (typeof entry.disabledTip === 'string' && entry.disabledTip) {
    node.disabledTip = entry.disabledTip;
  }
  if (typeof entry.leaf === 'boolean') {
    node.leaf = entry.leaf;
  }
  if (Array.isArray(entry.children)) {
    const children = entry.children
      .map((child) => normalizeOrgNode(child))
      .filter((child): child is OrgNode => child != null);
    if (children.length > 0) {
      node.children = children;
    }
  }
  const extra: Record<string, SchemaValue> = {};
  if (entry.extra && typeof entry.extra === 'object' && !Array.isArray(entry.extra)) {
    Object.assign(extra, entry.extra as SchemaObject);
  }
  for (const key of Object.keys(entry)) {
    if (!ORG_NODE_KEYS.has(key)) {
      extra[key] = entry[key] as SchemaValue;
    }
  }
  if (Object.keys(extra).length > 0) {
    node.extra = extra;
  }
  return node;
}

export function normalizeOrgNodes(input: unknown): OrgNode[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .map((entry) => normalizeOrgNode(entry))
    .filter((node): node is OrgNode => node != null);
}

/**
 * Protocol §4.2 envelope: bare arrays are tolerated as `{ nodes }`;
 * `{ nodes }` present but non-array (and any other shape) is an empty
 * result — never a throw.
 */
export function parseOrgNodePage(data: unknown): OrgNodePage {
  if (Array.isArray(data)) {
    return { nodes: normalizeOrgNodes(data) };
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.nodes)) {
      return {
        nodes: normalizeOrgNodes(record.nodes),
        total: typeof record.total === 'number' ? record.total : undefined,
        hasMore: typeof record.hasMore === 'boolean' ? record.hasMore : undefined,
      };
    }
  }
  return { nodes: [] };
}

/**
 * Protocol §5 termination rules, evaluated in order — exactly one verdict
 * per response: explicit hasMore=false, total reached, empty page, or a
 * fully-duplicated page (guard against servers that never send
 * hasMore/total).
 */
export function shouldStopPaging(input: {
  page: OrgNodePage;
  loadedCount: number;
  knownIds: ReadonlySet<string>;
}): boolean {
  const { page, loadedCount, knownIds } = input;
  if (page.hasMore === false) {
    return true;
  }
  if (page.hasMore == null && page.total != null && loadedCount >= page.total) {
    return true;
  }
  if (page.nodes.length === 0) {
    return true;
  }
  return page.nodes.every((node) => knownIds.has(node.id));
}

/** Protocol §7: local case-insensitive `name` contains match when `sourceSearch` is absent. */
export function filterLocalOptions(options: OrgNode[], query: string): OrgNode[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return options;
  }
  return options.filter((option) => option.name.toLowerCase().includes(trimmed));
}

/** Protocol §4/§7 merge: incoming nodes override existing ones sharing the same id. */
export function mergeNodesById(existing: OrgNode[], incoming: OrgNode[]): OrgNode[] {
  const byId = new Map(existing.map((node) => [node.id, node]));
  for (const node of incoming) {
    byId.set(node.id, node);
  }
  return [...byId.values()];
}

/**
 * Protocol §3 mixed-tree rule: nodes outside the renderer's selectable
 * types stay visible and navigable but cannot be selected. An empty
 * `selectableTypes` means every node is selectable; untyped nodes are
 * generic and always selectable (untagged providers keep both pickers
 * usable).
 */
export function isNodeTypeSelectable(node: OrgNode, selectableTypes: readonly string[]): boolean {
  if (selectableTypes.length === 0) {
    return true;
  }
  return node.type == null ? true : selectableTypes.includes(node.type);
}

/** Type-selectable AND not individually disabled. */
export function isNodeSelectable(node: OrgNode, selectableTypes: readonly string[]): boolean {
  return node.disabled !== true && isNodeTypeSelectable(node, selectableTypes);
}

/**
 * Protocol §6: string values are expressions evaluated against the
 * renderer's own form scope at dispatch time; non-strings pass through.
 */
export function resolveExtraParams(
  extraParams: Record<string, SchemaValue> | undefined,
  evaluate: (target: unknown) => unknown,
): Record<string, unknown> {
  if (!extraParams) {
    return {};
  }
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extraParams)) {
    resolved[key] = typeof value === 'string' ? evaluate(value) : value;
  }
  return resolved;
}
