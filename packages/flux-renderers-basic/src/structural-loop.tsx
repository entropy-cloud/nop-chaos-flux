import type { InstanceFrame, RendererHelpers, ScopeRef } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import type { LoopSchema, RecurseSchema } from './schemas';
import type { StructuralLoopBindings } from './structural-loop-context';

export interface StructuralLoopRenderOptions {
  helpers: RendererHelpers;
  items: unknown;
  hasBody: boolean;
  hasEmpty?: boolean;
  bindings: StructuralLoopBindings;
  itemData?: Record<string, unknown>;
  keyBy?: unknown;
  basePath: string;
  ownerId: string;
  parentScope: ScopeRef;
  parentInstancePath?: readonly InstanceFrame[];
  repeatedTemplateId: string;
  maxDepth?: number;
  currentDepth?: number;
  renderItem(input: {
    item: unknown;
    index: number;
    itemKey: string;
    scope: ScopeRef;
    instancePath: readonly InstanceFrame[];
    depth: number;
  }): React.ReactNode;
  renderEmpty?(): React.ReactNode;
}

const DEFAULT_ITEM_NAME = 'item';
const DEFAULT_INDEX_NAME = 'index';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toItemsArray(items: unknown): unknown[] {
  return Array.isArray(items) ? items : [];
}

export function resolveLoopBindings(input: Pick<LoopSchema | RecurseSchema, 'itemName' | 'indexName' | 'keyName'>): StructuralLoopBindings {
  return {
    itemName: input.itemName?.trim() || DEFAULT_ITEM_NAME,
    indexName: input.indexName?.trim() || DEFAULT_INDEX_NAME,
    keyName: input.keyName?.trim() || undefined
  };
}

function resolveItemKey(input: { item: unknown; index: number; keyBy?: unknown }): string {
  const { item, index, keyBy } = input;

  if (typeof keyBy === 'string' && keyBy.length > 0) {
    const path = keyBy.startsWith('${') && keyBy.endsWith('}') ? keyBy.slice(2, -1).trim() : keyBy;

    if (path.startsWith('item.')) {
      const value = isRecord(item) ? getIn(item, path.slice(5)) : undefined;

      if (value !== undefined && value !== null && value !== '') {
        return String(value);
      }
    }

    if (path === 'item' && (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')) {
      return String(item);
    }
  }

  if (isRecord(item)) {
    const fallback = item.id ?? item.key ?? item.name;

    if (fallback !== undefined && fallback !== null && fallback !== '') {
      return String(fallback);
    }
  }

  return String(index);
}

function createItemPatch(input: {
  item: unknown;
  index: number;
  itemKey: string;
  bindings: StructuralLoopBindings;
  itemData?: Record<string, unknown>;
}): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    [input.bindings.itemName]: input.item,
    [input.bindings.indexName]: input.index
  };

  if (input.bindings.keyName) {
    patch[input.bindings.keyName] = input.itemKey;
  }

  if (input.itemData) {
    Object.assign(patch, input.itemData);
  }

  return patch;
}

export function createStructuralRepeatedTemplateId(ownerId: string): string {
  return `loop:${ownerId}`;
}

export function createStructuralItemScope(input: {
  helpers: RendererHelpers;
  basePath: string;
  ownerId: string;
  bindings: StructuralLoopBindings;
  item: unknown;
  index: number;
  itemData?: Record<string, unknown>;
  itemKey: string;
}): ScopeRef {
  return input.helpers.createScope(
    createItemPatch({
      item: input.item,
      index: input.index,
      itemKey: input.itemKey,
      bindings: input.bindings,
      itemData: input.itemData
    }),
    {
      scopeKey: `${input.ownerId}:item:${input.itemKey}`,
      pathSuffix: `${input.basePath}.itemsByKey.${input.itemKey}`,
      source: 'custom'
    }
  );
}

export function renderStructuralLoop(options: StructuralLoopRenderOptions): React.ReactNode {
  const items = toItemsArray(options.items);
  const depth = options.currentDepth ?? 0;

  if (options.maxDepth !== undefined && depth >= options.maxDepth) {
    return null;
  }

  if (items.length === 0) {
    return options.hasEmpty ? options.renderEmpty?.() ?? null : null;
  }

  if (!options.hasBody) {
    return null;
  }

  return items.map((item, index) => {
    const itemKey = resolveItemKey({ item, index, keyBy: options.keyBy });
    const scope = createStructuralItemScope({
      helpers: options.helpers,
      basePath: options.basePath,
      ownerId: options.ownerId,
      bindings: options.bindings,
      item,
      index,
      itemData: options.itemData,
      itemKey
    });
    const instancePath = [
      ...(options.parentInstancePath ?? []),
      { repeatedTemplateId: options.repeatedTemplateId, instanceKey: itemKey }
    ] as const;

    return options.renderItem({
      item,
      index,
      itemKey,
      scope,
      instancePath,
      depth: depth + 1
    });
  });
}
