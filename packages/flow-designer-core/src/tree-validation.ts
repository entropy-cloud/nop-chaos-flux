import type {
  NormalizedDesignerConfig,
  TreeDocument,
  TreeNode,
  TreeNodeBranch,
  TreeProjectionError,
  TreeProjectionErrorCode,
} from './types.js';

export const TREE_INTERNAL_ID_PREFIX = '__fd_internal__/';
export const TREE_EMPTY_SLOT_NODE_TYPE = '__fd-tree-empty-slot';
export const TREE_VIRTUAL_DATA_KEY = '__fdVirtual';
export const DEFAULT_NODE_WIDTH = 220;
export const DEFAULT_NODE_HEIGHT = 80;
export const DEFAULT_EMPTY_BRANCH_SIZE = { width: 220, height: 80 };
function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function collectJsonPayloadErrors(
  value: unknown,
  path: string,
  seen: Set<unknown>,
  errors: string[],
): void {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      errors.push(`${path}: non-finite number`);
    }
    return;
  }
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
    errors.push(`${path}: unsupported type`);
    return;
  }
  if (typeof value === 'bigint') {
    errors.push(`${path}: bigint is not JSON-safe`);
    return;
  }
  if (seen.has(value)) {
    errors.push(`${path}: cyclic reference`);
    return;
  }
  if (Array.isArray(value)) {
    seen.add(value);
    value.forEach((item, index) => collectJsonPayloadErrors(item, `${path}/${index}`, seen, errors));
    seen.delete(value);
    return;
  }
  if (!isPlainJsonObject(value)) {
    errors.push(`${path}: unsupported object instance`);
    return;
  }
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    collectJsonPayloadErrors(child, `${path}/${key}`, seen, errors);
  }
  seen.delete(value);
}

export function isJsonSafeTreePayload(value: unknown): { ok: true } | { ok: false; path: string } {
  const errors: string[] = [];
  collectJsonPayloadErrors(value, '$', new Set(), errors);
  if (errors.length === 0) {
    return { ok: true };
  }
  return { ok: false, path: errors[0] };
}

export function canonicalizeJsonValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '"__fd-non-finite"';
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJsonValue(item)).join(',')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalizeJsonValue(record[key])}`).join(',')}}`;
  }
  return 'null';
}

export function canonicalizeTreeDocument(tree: TreeDocument): string {
  return canonicalizeJsonValue(tree);
}

export function canonicalizeTreeDocumentSnapshot(tree: TreeDocument): TreeDocument {
  return JSON.parse(canonicalizeTreeDocument(tree)) as TreeDocument;
}

interface ValidateContext {
  config: NormalizedDesignerConfig;
  seenIds: Map<string, string>;
}

function makeError(code: TreeProjectionErrorCode, message: string, errorPath?: string): TreeProjectionError {
  return { code, message, path: errorPath };
}

function validateId(id: unknown, errorPath: string): string | null {
  if (typeof id !== 'string' || id.length === 0) {
    return null;
  }
  if (id.startsWith(TREE_INTERNAL_ID_PREFIX)) {
    return 'reserved';
  }
  void errorPath;
  return id;
}

function validateSpacingValue(value: unknown, errorPath: string): TreeProjectionError | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    return makeError('invalid-spacing', `Invalid non-negative integer spacing at ${errorPath}`, errorPath);
  }
  return null;
}

function validateLayoutSize(value: unknown, errorPath: string): TreeProjectionError | null {
  if (!isPlainJsonObject(value)) {
    return makeError('invalid-layout-size', `Missing object layout size at ${errorPath}`, errorPath);
  }
  const { width, height } = value as { width?: unknown; height?: unknown };
  if (
    typeof width !== 'number' ||
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isInteger(width) ||
    typeof height !== 'number' ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isInteger(height)
  ) {
    return makeError('invalid-layout-size', `Invalid positive integer layout size at ${errorPath}`, errorPath);
  }
  return null;
}

export function resolveTreeNodeFootprint(
  type: string,
  config: NormalizedDesignerConfig,
): { width: number; height: number } {
  const nodeType = config.nodeTypes.get(type);
  const treeSize = nodeType?.tree?.layoutSize;
  if (treeSize) {
    return { width: treeSize.width, height: treeSize.height };
  }
  const appearance = nodeType?.appearance;
  return {
    width: appearance?.minWidth ?? DEFAULT_NODE_WIDTH,
    height: appearance?.minHeight ?? DEFAULT_NODE_HEIGHT,
  };
}

export function resolveEmptyBranchSize(config: NormalizedDesignerConfig): { width: number; height: number } {
  const size = config.treeConfig?.emptyBranchSize ?? DEFAULT_EMPTY_BRANCH_SIZE;
  return { width: size.width, height: size.height };
}

function validateTreeNodeRecursive(
  node: TreeNode,
  path: string,
  ctx: ValidateContext,
  parentRefs: Set<TreeNode>,
): TreeProjectionError | null {
  if (!isPlainJsonObject(node)) {
    return makeError('invalid-tree', `TreeNode is not an object at ${path}`, path);
  }

  const idResult = validateId(node.id, `${path}/id`);
  if (idResult === null) {
    return makeError('invalid-tree', `Invalid node id at ${path}/id`, `${path}/id`);
  }
  if (idResult === 'reserved') {
    return makeError('reserved-id', `Node id uses reserved prefix at ${path}/id`, `${path}/id`);
  }
  const existing = ctx.seenIds.get(node.id);
  if (existing) {
    return makeError(
      'duplicate-id',
      `Duplicate node id "${node.id}" at ${path}/id (first used at ${existing})`,
      `${path}/id`,
    );
  }
  ctx.seenIds.set(node.id, path);

  if (typeof node.type !== 'string' || node.type.length === 0) {
    return makeError('invalid-tree', `Node type is not a non-empty string at ${path}/type`, `${path}/type`);
  }
  if (!ctx.config.nodeTypes.has(node.type)) {
    return makeError('unknown-node-type', `Unknown node type "${node.type}" at ${path}/type`, `${path}/type`);
  }
  if (!isPlainJsonObject(node.data)) {
    return makeError('invalid-tree', `Node data is not an object at ${path}/data`, `${path}/data`);
  }
  const payload = isJsonSafeTreePayload(node.data);
  if (!payload.ok) {
    return makeError('invalid-tree-payload', `Node data is not JSON-safe (${payload.path})`, `${path}/data`);
  }

  if (parentRefs.has(node)) {
    return makeError('cyclic-tree', `TreeNode object reference cycle at ${path}`, path);
  }
  if (node.child !== undefined) {
    const nextRefs = new Set(parentRefs);
    nextRefs.add(node);
    const error = validateTreeNodeRecursive(node.child, `${path}/child`, ctx, nextRefs);
    if (error) return error;
  }

  if (node.branches !== undefined && node.branches !== null) {
    if (!Array.isArray(node.branches)) {
      return makeError('invalid-tree', `Node branches is not an array at ${path}/branches`, `${path}/branches`);
    }
    for (let index = 0; index < node.branches.length; index += 1) {
      const branch = node.branches[index];
      const branchPath = `${path}/branches/${index}`;
      if (!isPlainJsonObject(branch)) {
        return makeError('invalid-tree', `Branch is not an object at ${branchPath}`, branchPath);
      }
      const branchIdResult = validateId((branch as TreeNodeBranch).id, `${branchPath}/id`);
      if (branchIdResult === null) {
        return makeError('invalid-tree', `Invalid branch id at ${branchPath}/id`, `${branchPath}/id`);
      }
      if (branchIdResult === 'reserved') {
        return makeError('reserved-id', `Branch id uses reserved prefix at ${branchPath}/id`, `${branchPath}/id`);
      }
      const branchExisting = ctx.seenIds.get((branch as TreeNodeBranch).id);
      if (branchExisting) {
        return makeError(
          'duplicate-id',
          `Duplicate branch id "${(branch as TreeNodeBranch).id}" at ${branchPath}/id`,
          `${branchPath}/id`,
        );
      }
      ctx.seenIds.set((branch as TreeNodeBranch).id, branchPath);

      if (!isPlainJsonObject((branch as TreeNodeBranch).data)) {
        return makeError('invalid-tree', `Branch data is not an object at ${branchPath}/data`, `${branchPath}/data`);
      }
      const branchPayload = isJsonSafeTreePayload((branch as TreeNodeBranch).data);
      if (!branchPayload.ok) {
        return makeError('invalid-tree-payload', `Branch data is not JSON-safe (${branchPayload.path})`, `${branchPath}/data`);
      }
      if ((branch as TreeNodeBranch).child !== undefined) {
        const nextRefs = new Set(parentRefs);
        nextRefs.add(node);
        const error = validateTreeNodeRecursive(
          (branch as TreeNodeBranch).child as TreeNode,
          `${branchPath}/child`,
          ctx,
          nextRefs,
        );
        if (error) return error;
      }
    }
  }

  return null;
}

export function validateTreeDocument(
  tree: TreeDocument,
  config: NormalizedDesignerConfig,
): TreeProjectionError | null {
  if (!isPlainJsonObject(tree)) {
    return makeError('invalid-tree', 'TreeDocument is not an object', '$');
  }
  const docPayload = isJsonSafeTreePayload(tree);
  if (!docPayload.ok) {
    return makeError('invalid-tree-payload', `TreeDocument is not JSON-safe (${docPayload.path})`, docPayload.path);
  }
  if (!isPlainJsonObject((tree as unknown as { root?: unknown }).root)) {
    return makeError('invalid-tree', 'TreeDocument root is missing or not an object', '$/root');
  }

  const ctx: ValidateContext = { config, seenIds: new Map() };
  const error = validateTreeNodeRecursive((tree as unknown as { root: TreeNode }).root, '$/root', ctx, new Set());
  if (error) return error;

  return null;
}

export function validateTreeConfig(config: NormalizedDesignerConfig): TreeProjectionError | null {
  const treeConfig = config.treeConfig;
  if (!treeConfig) {
    return makeError('invalid-tree-config', 'treeConfig is required in tree mode', 'treeConfig');
  }
  if (treeConfig.layout.direction !== 'TB' && treeConfig.layout.direction !== 'LR') {
    return makeError('invalid-tree-config', 'treeConfig.layout.direction must be TB or LR', 'treeConfig.layout.direction');
  }
  const nodeSpacingError = validateSpacingValue(treeConfig.layout.nodeSpacing, 'treeConfig.layout.nodeSpacing');
  if (nodeSpacingError) return nodeSpacingError;
  const layerSpacingError = validateSpacingValue(treeConfig.layout.layerSpacing, 'treeConfig.layout.layerSpacing');
  if (layerSpacingError) return layerSpacingError;
  const emptyBranchSize = treeConfig.emptyBranchSize;
  if (emptyBranchSize) {
    const sizeError = validateLayoutSize(emptyBranchSize, 'treeConfig.emptyBranchSize');
    if (sizeError) return sizeError;
    const direction = treeConfig.layout.direction;
    const minWidth = direction === 'TB' ? 120 : 140;
    const minHeight = direction === 'TB' ? 52 : 32;
    if (emptyBranchSize.width < minWidth || emptyBranchSize.height < minHeight) {
      return makeError(
        'invalid-layout-size',
        `emptyBranchSize ${emptyBranchSize.width}x${emptyBranchSize.height} is below the ${direction} minimum ${minWidth}x${minHeight}`,
        'treeConfig.emptyBranchSize',
      );
    }
  }

  for (const nodeType of config.nodeTypes.values()) {
    if (nodeType.tree?.layoutSize) {
      const sizeError = validateLayoutSize(nodeType.tree.layoutSize, `nodeTypes.${nodeType.id}.tree.layoutSize`);
      if (sizeError) return sizeError;
    }
  }

  return null;
}

const ALLOWED_EDGE_APPEARANCE_KEYS = new Set(['stroke', 'strokeWidth', 'strokeStyle', 'color']);

export function validateTreeEdgeDecorations(
  tree: TreeDocument,
  config: NormalizedDesignerConfig,
  edgeTypes: Set<string>,
): TreeProjectionError | null {
  for (const edgeTypeId of edgeTypes) {
    const edgeType = config.edgeTypes.get(edgeTypeId);
    if (!edgeType) {
      return makeError(
        'invalid-tree-config',
        `Unknown tree edge type "${edgeTypeId}"`,
        `edgeTypes.${edgeTypeId}`,
      );
    }
    const appearance = edgeType.appearance;
    if (appearance) {
      for (const key of Object.keys(appearance)) {
        if (!ALLOWED_EDGE_APPEARANCE_KEYS.has(key)) {
          return makeError(
            'unsupported-tree-edge-decoration',
            `Tree edge type "${edgeTypeId}" uses unsupported appearance key "${key}"`,
            `edgeTypes.${edgeTypeId}.appearance.${key}`,
          );
        }
      }
      if (appearance.markerEnd !== undefined && appearance.markerEnd !== 'none') {
        return makeError(
          'unsupported-tree-edge-decoration',
          `Tree edge type "${edgeTypeId}" declares markerEnd`,
          `edgeTypes.${edgeTypeId}.appearance.markerEnd`,
        );
      }
      if (appearance.animated) {
        return makeError(
          'unsupported-tree-edge-decoration',
          `Tree edge type "${edgeTypeId}" declares animated`,
          `edgeTypes.${edgeTypeId}.appearance.animated`,
        );
      }
    }
    if (edgeType.body) {
      return makeError(
        'unsupported-tree-edge-decoration',
        `Tree edge type "${edgeTypeId}" declares a label body`,
        `edgeTypes.${edgeTypeId}.body`,
      );
    }
    const defaults = edgeType.defaults ?? {};
    if (defaults.label !== undefined || defaults.body !== undefined) {
      return makeError(
        'unsupported-tree-edge-decoration',
        `Tree edge type "${edgeTypeId}" declares default label/body data`,
        `edgeTypes.${edgeTypeId}.defaults`,
      );
    }
  }
  return null;
}

