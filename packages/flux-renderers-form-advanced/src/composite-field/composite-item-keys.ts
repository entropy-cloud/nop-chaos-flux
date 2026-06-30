import React from 'react';
import { getIn } from '@nop-chaos/flux-core';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Resolve the preferred (data-derived) identity key for an object array item.
 * Returns `undefined` when the item carries no usable id / __rowKey / itemKey so
 * the caller can substitute a stable compatibility id.
 */
export function resolvePreferredObjectKey(
  item: unknown,
  itemKeyField?: string,
): string | undefined {
  if (!isRecord(item)) {
    return undefined;
  }
  const explicitValue = itemKeyField ? getIn(item, itemKeyField) : undefined;
  const compatibilityValue = explicitValue ?? item.__rowKey ?? item.id;
  if (
    compatibilityValue !== null &&
    compatibilityValue !== undefined &&
    compatibilityValue !== ''
  ) {
    return String(compatibilityValue);
  }
  return undefined;
}

export interface ObjectItemKeyResolution {
  itemKeys: string[];
  duplicatePreferredKeys: string[];
}

/**
 * Build stable React-key identities for an object array. Items that expose a
 * unique data-derived key keep it; items with a missing OR duplicated preferred
 * key fall back to `fallbackKey(index)`, which the caller supplies from a
 * stable compatibility-id source so structural edits do not left-shift sibling
 * identities (the G18 row-remount / focus-loss defect).
 */
export function buildStableObjectItemKeys(
  items: unknown[],
  itemKeyField: string | undefined,
  fallbackKey: (index: number) => string,
): ObjectItemKeyResolution {
  const preferredKeys = items.map((item) => resolvePreferredObjectKey(item, itemKeyField));
  const counts = new Map<string, number>();
  for (const key of preferredKeys) {
    if (key !== undefined) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return {
    itemKeys: preferredKeys.map((preferredKey, sourceIndex) =>
      preferredKey !== undefined && (counts.get(preferredKey) ?? 0) === 1
        ? preferredKey
        : fallbackKey(sourceIndex),
    ),
    duplicatePreferredKeys: Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key),
  };
}

/**
 * Maintains a list of stable, monotonically-growing compatibility ids aligned
 * to item positions. This is the repo reference solution (modeled on
 * `array-field` scalar `compatibilityItemKeys`) generalized to object-kind
 * composite editors.
 *
 * Stability contract:
 *  - `removeAt(index)` drops the id at `index`, so surviving items keep their
 *    id when they shift left (a remove does not left-shift sibling identities).
 *  - `append()` mints a fresh id for a newly added item.
 *  - The resync effect grows/slices when the item count changes from an
 *    external source (e.g. form data refresh).
 *
 * The transient positional fallback (`${prefix}${index}`) is only used for one
 * render until the resync effect catches up to an external length change; it is
 * never the persistent identity, so it does not reintroduce G18.
 */
export function useCompatibilityItemKeys(itemCount: number, prefix: string): {
  keys: string[];
  keyAt: (index: number) => string;
  removeAt: (index: number) => void;
  append: () => void;
  move: (from: number, to: number) => void;
} {
  const nextKeyRef = React.useRef(itemCount);
  const [keys, setKeys] = React.useState<string[]>(() =>
    Array.from({ length: itemCount }, (_, i) => `${prefix}${i}`),
  );

  React.useEffect(() => {
    setKeys((current) => {
      if (current.length === itemCount) {
        return current;
      }
      if (current.length < itemCount) {
        return [
          ...current,
          ...Array.from(
            { length: itemCount - current.length },
            () => `${prefix}${nextKeyRef.current++}`,
          ),
        ];
      }
      return current.slice(0, itemCount);
    });
  }, [itemCount, prefix]);

  const keyAt = React.useCallback(
    (index: number) => keys[index] ?? `${prefix}${index}`,
    [keys, prefix],
  );

  const removeAt = React.useCallback((index: number) => {
    setKeys((current) => current.filter((_, i) => i !== index));
  }, []);

  const append = React.useCallback(() => {
    setKeys((current) => [...current, `${prefix}${nextKeyRef.current++}`]);
  }, [prefix]);

  const move = React.useCallback((from: number, to: number) => {
    setKeys((current) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= current.length ||
        to >= current.length
      ) {
        return current;
      }
      const next = current.slice();
      const [moved] = next.splice(from, 1);
      if (moved) {
        next.splice(to, 0, moved);
      }
      return next;
    });
  }, []);

  return { keys, keyAt, removeAt, append, move };
}
