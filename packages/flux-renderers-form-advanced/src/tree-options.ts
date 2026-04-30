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
  const children = toTreeOptionArray(getIn(input.node, input.config.childrenKey)).map(
    (childNode, childIndex) =>
      buildTreeOptionMeta({
        node: childNode,
        index: childIndex,
        depth: input.depth + 1,
        parentNode: input.node,
        parentPathLabel: pathLabel,
        config: input.config,
      }),
  );

  return {
    node: input.node,
    label,
    value,
    valueKey,
    depth: input.depth,
    pathLabel,
    parentNode: input.parentNode,
    children,
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
