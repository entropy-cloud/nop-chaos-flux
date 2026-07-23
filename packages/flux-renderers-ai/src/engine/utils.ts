/**
 * Framework-agnostic engine utilities. MUST NOT import 'react' or DOM globals.
 *
 * `combineDeltaData` is the core streaming-accumulation algorithm ported from
 * tiny-robot (`message/utils.ts`). It merges an incremental chunk (`source`)
 * into the accumulated target, with these rules (`engine.md` §8.4):
 *
 * - string + string → concatenation
 * - array + array → if every source element carries an `index` field, merge by
 *   index (OpenAI tool_calls streaming shape); otherwise concatenate
 * - object + object → recursive merge
 * - the `type` field is identity: once set on target it is never overwritten
 * - a source key absent from target is assigned directly (cloned)
 */

export type AnyRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is AnyRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }
  const out: AnyRecord = {};
  for (const key of Object.keys(value as AnyRecord)) {
    out[key] = deepClone((value as AnyRecord)[key]);
  }
  return out as unknown as T;
}

function arrayItemsAreIndexed(arr: unknown[]): boolean {
  return (
    arr.length > 0 &&
    arr.every((item) => isPlainObject(item) && typeof item.index === 'number')
  );
}

function mergeArrayInPlace(target: unknown[], source: unknown[]): void {
  // OpenAI tool_calls streaming: source items carry an `index` field that
  // identifies which call they belong to → merge by index.
  if (arrayItemsAreIndexed(source)) {
    for (const srcItem of source) {
      const idx = (srcItem as AnyRecord).index as number;
      if (target[idx] === undefined) {
        target[idx] = deepClone(srcItem);
      } else {
        target[idx] = combineDeltaData(target[idx], srcItem);
      }
    }
    return;
  }
  // Otherwise: plain concatenation (clone objects to avoid shared references).
  for (const item of source) {
    target.push(item !== null && typeof item === 'object' ? deepClone(item) : item);
  }
}

/**
 * Merge `source` into `target`, mutating `target` in place where possible.
 * Returns the merged value (for the string-concat / undefined-target cases the
 * returned reference replaces the old one — callers should always reassign the
 * result).
 */
export function combineDeltaData<T>(target: T, source: unknown): T {
  if (source === null || source === undefined) {
    return target;
  }

  // Both strings → concatenate.
  if (typeof target === 'string' && typeof source === 'string') {
    return (target + source) as unknown as T;
  }

  // Both arrays → merge / concatenate in place.
  if (Array.isArray(target) && Array.isArray(source)) {
    mergeArrayInPlace(target, source);
    return target;
  }

  // Both plain objects → recursive merge.
  if (isPlainObject(target) && isPlainObject(source)) {
    const obj = target as AnyRecord;
    for (const key of Object.keys(source)) {
      // The `type` field identifies a content part; never overwrite once set.
      if (key === 'type' && obj[key] !== undefined) {
        continue;
      }
      obj[key] = combineDeltaData(obj[key], source[key]);
    }
    return target;
  }

  // target is empty but source has a value → adopt source (cloned if complex).
  if (target === undefined || target === null) {
    if (source !== null && typeof source === 'object') {
      return deepClone(source) as unknown as T;
    }
    return source as unknown as T;
  }

  // Primitive source (number/boolean/other) overwrites.
  return source as unknown as T;
}

let messageSeq = 0;

/**
 * Generate a stable message id (engine-internal; React key + scope binding).
 * Deterministic prefix keeps ids readable in tests.
 */
export function generateMessageId(prefix = 'msg'): string {
  messageSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${messageSeq.toString(36)}`;
}

/** Reset the internal id counter (test-only). */
export function _resetMessageIdCounterForTests(): void {
  messageSeq = 0;
}
