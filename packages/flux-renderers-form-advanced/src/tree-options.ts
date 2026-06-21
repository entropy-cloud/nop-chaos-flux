import { getIn } from '@nop-chaos/flux-core';

export interface TreeOptionRecord {
  [key: string]: unknown;
}

export interface TreeOptionMeta {
  node: TreeOptionRecord;
  label: string;
  value: unknown;
  valueKey: string;
  depth: number;
  pathLabel: string;
  parentNode?: TreeOptionRecord;
  children: TreeOptionMeta[];
  /**
   * Node declares it has children that have not been loaded yet. When true,
   * the renderer treats the node as expandable; expanding it triggers a
   * `childrenSource` fetch (if declared) to load the actual children. After
   * loading, this flag is cleared and `children` is populated.
   */
  deferChildren?: boolean;
}

export interface TreeOptionConfig {
  childrenKey?: string;
  labelField?: string;
  valueField?: string;
  onlyLeaf?: boolean;
  showPathLabel?: boolean;
}

const DEFAULT_CHILDREN_KEY = 'children';
const DEFAULT_LABEL_FIELD = 'label';
const DEFAULT_VALUE_FIELD = 'value';

function isTreeOptionRecord(value: unknown): value is TreeOptionRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toTreeOptionArray(value: unknown): TreeOptionRecord[] {
  return Array.isArray(value) ? value.filter(isTreeOptionRecord) : [];
}

export function getTreeOptionConfig(config?: TreeOptionConfig) {
  return {
    childrenKey: config?.childrenKey || DEFAULT_CHILDREN_KEY,
    labelField: config?.labelField || DEFAULT_LABEL_FIELD,
    valueField: config?.valueField || DEFAULT_VALUE_FIELD,
    onlyLeaf: config?.onlyLeaf === true,
    showPathLabel: config?.showPathLabel === true,
  };
}

function buildTreeOptionMeta(input: {
  node: TreeOptionRecord;
  index: number;
  depth: number;
  parentNode?: TreeOptionRecord;
  parentPathLabel?: string;
  config: ReturnType<typeof getTreeOptionConfig>;
}): TreeOptionMeta {
  const labelValue = getIn(input.node, input.config.labelField);
  const label = String(labelValue ?? `Node ${input.index + 1}`);
  const value = getIn(input.node, input.config.valueField);
  const valueKey =
    value !== undefined && value !== null && value !== ''
      ? String(value)
      : `${label}:${input.index}`;
  const pathLabel = input.parentPathLabel ? `${input.parentPathLabel} / ${label}` : label;
  const rawChildren = toTreeOptionArray(getIn(input.node, input.config.childrenKey));
  const hasRawChildren = rawChildren.length > 0;
  const deferFlag = input.node.deferChildren === true && !hasRawChildren;
  const children = hasRawChildren
    ? rawChildren.map((childNode, childIndex) =>
        buildTreeOptionMeta({
          node: childNode,
          index: childIndex,
          depth: input.depth + 1,
          parentNode: input.node,
          parentPathLabel: pathLabel,
          config: input.config,
        }),
      )
    : [];

  return {
    node: input.node,
    label,
    value,
    valueKey,
    depth: input.depth,
    pathLabel,
    parentNode: input.parentNode,
    children,
    deferChildren: deferFlag || undefined,
  };
}

export function buildTreeOptionMetaList(
  options: unknown,
  config?: TreeOptionConfig,
): TreeOptionMeta[] {
  const resolvedConfig = getTreeOptionConfig(config);

  return toTreeOptionArray(options).map((node, index) =>
    buildTreeOptionMeta({
      node,
      index,
      depth: 0,
      config: resolvedConfig,
    }),
  );
}

export function flattenTreeOptions(
  options: TreeOptionMeta[],
  config?: TreeOptionConfig,
): TreeOptionMeta[] {
  const resolvedConfig = getTreeOptionConfig(config);
  const flattened: TreeOptionMeta[] = [];

  function walk(entries: TreeOptionMeta[]) {
    for (const entry of entries) {
      const include = !resolvedConfig.onlyLeaf || entry.children.length === 0;

      if (include) {
        flattened.push(entry);
      }

      if (entry.children.length > 0) {
        walk(entry.children);
      }
    }
  }

  walk(options);
  return flattened;
}

export function isTreeSelectionChecked(
  value: unknown,
  candidate: unknown,
  multiple: boolean,
): boolean {
  if (multiple) {
    return Array.isArray(value) && value.some((entry) => Object.is(entry, candidate));
  }

  return Object.is(value, candidate);
}

export function toggleTreeSelection(
  value: unknown,
  candidate: unknown,
  multiple: boolean,
): unknown {
  if (!multiple) {
    return candidate;
  }

  const current = Array.isArray(value) ? value : [];
  const exists = current.some((entry) => Object.is(entry, candidate));

  return exists ? current.filter((entry) => !Object.is(entry, candidate)) : [...current, candidate];
}

export interface TreeCheckedState {
  checked: boolean;
  indeterminate: boolean;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function includesValue(values: unknown[], candidate: unknown): boolean {
  return values.some((entry) => Object.is(entry, candidate));
}

function collectAllDescendantValues(option: TreeOptionMeta): unknown[] {
  const collected: unknown[] = [];
  for (const child of option.children) {
    collected.push(child.value);
    if (child.children.length > 0) {
      collected.push(...collectAllDescendantValues(child));
    }
  }
  return collected;
}

function collectLeafDescendantValues(option: TreeOptionMeta): unknown[] {
  const collected: unknown[] = [];
  for (const child of option.children) {
    if (child.children.length === 0) {
      collected.push(child.value);
    } else {
      collected.push(...collectLeafDescendantValues(child));
    }
  }
  return collected;
}

function collectSelectableDescendantValues(
  option: TreeOptionMeta,
  onlyLeaf: boolean,
): unknown[] {
  return onlyLeaf ? collectLeafDescendantValues(option) : collectAllDescendantValues(option);
}

function collectCascadeGroupValues(
  option: TreeOptionMeta,
  onlyLeaf: boolean,
): unknown[] {
  if (option.children.length === 0) {
    return [option.value];
  }
  const descendants = collectSelectableDescendantValues(option, onlyLeaf);
  return onlyLeaf ? descendants : [option.value, ...descendants];
}

export function cascadeSelectParent(
  values: unknown[],
  parent: TreeOptionMeta,
  onlyLeaf: boolean,
): unknown[] {
  const current = toArray(values);
  const group = collectCascadeGroupValues(parent, onlyLeaf);
  const next = [...current];
  for (const candidate of group) {
    if (!includesValue(next, candidate)) {
      next.push(candidate);
    }
  }
  return next;
}

export function cascadeDeselectParent(
  values: unknown[],
  parent: TreeOptionMeta,
  onlyLeaf: boolean,
): unknown[] {
  const current = toArray(values);
  const group = collectCascadeGroupValues(parent, onlyLeaf);
  return current.filter((entry) => !group.some((candidate) => Object.is(candidate, entry)));
}

export function deriveCheckedState(
  parent: TreeOptionMeta,
  values: unknown[],
  onlyLeaf: boolean,
): TreeCheckedState {
  const current = toArray(values);
  if (parent.children.length === 0) {
    return { checked: includesValue(current, parent.value), indeterminate: false };
  }
  const descendants = collectSelectableDescendantValues(parent, onlyLeaf);
  if (descendants.length === 0) {
    return { checked: false, indeterminate: false };
  }
  const selectedCount = descendants.filter((candidate) =>
    includesValue(current, candidate),
  ).length;
  if (selectedCount === 0) {
    return { checked: false, indeterminate: false };
  }
  if (selectedCount === descendants.length) {
    return { checked: true, indeterminate: false };
  }
  return { checked: false, indeterminate: true };
}

/**
 * Find a tree option by its `valueKey`, searching the entire tree depth-first.
 * Returns `undefined` if not found.
 */
export function findOptionByValueKey(
  options: readonly TreeOptionMeta[],
  valueKey: string,
): TreeOptionMeta | undefined {
  for (const option of options) {
    if (option.valueKey === valueKey) {
      return option;
    }
    if (option.children.length > 0) {
      const found = findOptionByValueKey(option.children, valueKey);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/**
 * Merge fetched child nodes into a parent option's children, immutably.
 *
 * - Builds child {@link TreeOptionMeta} entries from `childrenData` using the
 *   same config that built the parent.
 * - Replaces the parent's `children` and clears `deferChildren`.
 * - Returns a new options tree (structural sharing: only ancestors of the
 *   target parent are replaced; sibling subtrees retain identity).
 *
 * If `parentValueKey` is not found, the original `options` is returned
 * unchanged.
 */
export function mergeChildOptions(
  options: readonly TreeOptionMeta[],
  parentValueKey: string,
  childrenData: unknown,
  config?: TreeOptionConfig,
): TreeOptionMeta[] {
  const resolvedConfig = getTreeOptionConfig(config);
  const mergeAt = (
    entries: readonly TreeOptionMeta[],
  ): { changed: boolean; result: TreeOptionMeta[] } => {
    let changed = false;
    const result = entries.map((entry) => {
      if (entry.valueKey === parentValueKey) {
        changed = true;
        const childRecords = toTreeOptionArray(childrenData);
        const newChildren = childRecords.map((childNode, childIndex) =>
          buildTreeOptionMeta({
            node: childNode,
            index: childIndex,
            depth: entry.depth + 1,
            parentNode: entry.node,
            parentPathLabel: entry.pathLabel,
            config: resolvedConfig,
          }),
        );
        return { ...entry, children: newChildren, deferChildren: undefined };
      }
      if (entry.children.length > 0) {
        const childResult = mergeAt(entry.children);
        if (childResult.changed) {
          changed = true;
          return { ...entry, children: childResult.result };
        }
      }
      return entry;
    });
    return { changed, result };
  };

  const outcome = mergeAt(options);
  return outcome.changed ? outcome.result : [...options];
}
