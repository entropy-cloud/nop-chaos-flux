import type { InstanceFrame } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import type { LoopSchema, RecurseSchema } from './schemas';
import type { StructuralLoopBindings } from './structural-loop-context';

export interface StructuralLoopRenderOptions {
  items: unknown;
  hasBody: boolean;
  hasEmpty?: boolean;
  bindings: StructuralLoopBindings;
  itemData?: Record<string, unknown>;
  keyBy?: unknown;
  ownerId: string;
  parentInstancePath?: readonly InstanceFrame[];
  repeatedTemplateId: string;
  maxDepth?: number;
  currentDepth?: number;
  renderItem(input: {
    item: unknown;
    index: number;
    itemKey: string;
    slotBindings: Record<string, unknown>;
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

export function buildSlotBindings(input: {
  item: unknown;
  index: number;
  itemKey: string;
  bindings: StructuralLoopBindings;
  itemData?: Record<string, unknown>;
}): Record<string, unknown> {
  const slotBindings: Record<string, unknown> = {
    [input.bindings.itemName]: input.item,
    [input.bindings.indexName]: input.index
  };

  if (input.bindings.keyName) {
    slotBindings[input.bindings.keyName] = input.itemKey;
  }

  if (input.itemData) {
    Object.assign(slotBindings, input.itemData);
  }

  return slotBindings;
}

export function createStructuralRepeatedTemplateId(ownerId: string): string {
  return `loop:${ownerId}`;
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
    const slotBindings = buildSlotBindings({
      item,
      index,
      itemKey,
      bindings: options.bindings,
      itemData: options.itemData
    });
    const instancePath = [
      ...(options.parentInstancePath ?? []),
      { repeatedTemplateId: options.repeatedTemplateId, instanceKey: itemKey }
    ] as const;

    return options.renderItem({
      item,
      index,
      itemKey,
      slotBindings,
      instancePath,
      depth: depth + 1
    });
  });
}
