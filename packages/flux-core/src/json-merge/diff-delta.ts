import { isJsonObject } from './identity.js';
import { classifyListWithContext, readIdentityWithContext } from './identity.js';
import type { DeltaResult, IdentityRef, JsonMergeOptions, MergeContext, MergeDiagnostic } from './types.js';
import { joinPath, resolveContext } from './types.js';

const NO_CHANGE = Symbol('json-delta.no-change');

function isMarkerKey(key: string, ctx: MergeContext): boolean {
  return key === ctx.overrideKey || key === ctx.virtualKey || key === ctx.uniqueAttrKey;
}

function identityKeyOf(ref: IdentityRef): string {
  return `${ref.key}\u0000${ref.value}`;
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((item, index) => deepEqual(item, right[index]));
  }
  if (!isJsonObject(left) || !isJsonObject(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(right, key) && deepEqual(left[key], right[key]),
  );
}

/**
 * Extract the delta document `d` such that `mergeJson(base, d)` deep-equals
 * `resolved`.
 *
 * Identity-keyed lists are emitted in full, in resolved order, with every element
 * stamped with its identity so the merge can locate it; elements dropped from the
 * list are appended as `remove` operators. Emitting the complete list is what
 * makes reordering expressible — a partial list cannot carry order information.
 *
 * Returns `value: undefined` when `resolved` already equals `base`.
 */
export function diffToDelta(
  resolved: unknown,
  base: unknown,
  options: JsonMergeOptions = {},
): DeltaResult {
  const ctx = resolveContext(options);
  const diagnostics: MergeDiagnostic[] = [];
  const value = diffValue(resolved, base, ctx, diagnostics, '');
  return { value: value === NO_CHANGE ? undefined : value, diagnostics };
}

function diffValue(
  resolved: unknown,
  base: unknown,
  ctx: MergeContext,
  diagnostics: MergeDiagnostic[],
  path: string,
): unknown {
  if (isJsonObject(resolved) && isJsonObject(base)) {
    return diffObject(resolved, base, ctx, diagnostics, path);
  }
  if (Array.isArray(resolved) && Array.isArray(base)) {
    return diffList(resolved, base, ctx, diagnostics, path);
  }
  return deepEqual(resolved, base) ? NO_CHANGE : resolved;
}

function diffObject(
  resolved: Record<string, unknown>,
  base: Record<string, unknown>,
  ctx: MergeContext,
  diagnostics: MergeDiagnostic[],
  path: string,
): unknown {
  const out: Record<string, unknown> = {};
  let changed = false;

  for (const key of Object.keys(resolved)) {
    if (isMarkerKey(key, ctx)) continue;
    const child = diffValue(
      resolved[key],
      base[key],
      ctx,
      diagnostics,
      joinPath(path, key),
    );
    if (child === NO_CHANGE) continue;
    out[key] = child;
    changed = true;
  }

  for (const key of Object.keys(base)) {
    if (isMarkerKey(key, ctx)) continue;
    if (Object.prototype.hasOwnProperty.call(resolved, key)) continue;
    out[key] = buildRemoveMarker(base[key], ctx);
    changed = true;
  }

  return changed ? out : NO_CHANGE;
}

function diffList(
  resolved: readonly unknown[],
  base: readonly unknown[],
  ctx: MergeContext,
  diagnostics: MergeDiagnostic[],
  path: string,
): unknown {
  if (classifyListWithContext(base, ctx) !== 'all') {
    return deepEqual(resolved, base) ? NO_CHANGE : resolved.slice();
  }

  const baseIndexes = new Map<string, number>();
  for (let i = 0; i < base.length; i++) {
    const ref = readIdentityWithContext(base[i], ctx);
    if (!ref) continue;
    const composite = identityKeyOf(ref);
    if (baseIndexes.has(composite)) continue;
    baseIndexes.set(composite, i);
  }

  const out: unknown[] = [];
  const consumed = new Set<number>();

  for (let i = 0; i < resolved.length; i++) {
    const item = resolved[i];
    const ref = readIdentityWithContext(item, ctx);
    const baseIndex = ref ? baseIndexes.get(identityKeyOf(ref)) : undefined;
    if (baseIndex === undefined) {
      out.push(item);
      continue;
    }
    consumed.add(baseIndex);
    const child = diffValue(item, base[baseIndex], ctx, diagnostics, joinPath(path, i));
    out.push(child === NO_CHANGE || ref === undefined ? item : stampIdentity(child, ref));
  }

  for (let i = 0; i < base.length; i++) {
    if (consumed.has(i)) continue;
    out.push(buildRemoveMarker(base[i], ctx));
  }

  return deepEqual(out, base) ? NO_CHANGE : out;
}

/** Re-attach identity to a partial delta element so the merge can locate it. */
function stampIdentity(value: unknown, ref: IdentityRef): unknown {
  if (!isJsonObject(value)) return value;
  if (value[ref.key] === ref.value) return value;
  return { [ref.key]: ref.value, ...value };
}

function buildRemoveMarker(value: unknown, ctx: MergeContext): Record<string, unknown> {
  const marker: Record<string, unknown> = {};
  const ref = readIdentityWithContext(value, ctx);
  if (ref) marker[ref.key] = ref.value;
  marker[ctx.overrideKey] = 'remove';
  return marker;
}