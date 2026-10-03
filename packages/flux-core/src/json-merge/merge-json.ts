import { isJsonObject } from './identity.js';
import { classifyListWithContext, identityCompositeKey, readIdentityWithContext } from './identity.js';
import { planListMerge } from './list-order.js';
import type { JsonMergeOptions, MergeContext, MergeDiagnostic, MergeResult } from './types.js';
import { joinPath, resolveContext } from './types.js';

const REMOVE = Symbol('json-merge.remove');

type Marker = 'remove' | 'replace' | undefined;

function readMarker(value: Record<string, unknown>, ctx: MergeContext): Marker {
  const raw = value[ctx.overrideKey];
  if (raw === 'remove') return 'remove';
  if (raw === 'replace') return 'replace';
  return undefined;
}

function isMarkerKey(key: string, ctx: MergeContext): boolean {
  return key === ctx.overrideKey || key === ctx.virtualKey || key === ctx.uniqueAttrKey;
}

function stripMarkers(value: Record<string, unknown>, ctx: MergeContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    if (isMarkerKey(key, ctx)) continue;
    out[key] = value[key];
  }
  return out;
}

/**
 * Merge `delta` onto `base`.
 *
 * - objects merge key by key, delta wins on conflict
 * - lists match elements by identity and rebuild order from `planListMerge`
 * - `undefined` or an absent key leaves the base value untouched
 * - `null` sets the value to `null`
 * - the `remove` operator drops the subtree, the `replace` operator swaps it whole
 *
 * Pure: neither argument is mutated and the result shares no references with them.
 * Never throws — every degradation is reported through `diagnostics`.
 */
export function mergeJson(
  base: unknown,
  delta: unknown,
  options: JsonMergeOptions = {},
): MergeResult {
  const ctx = resolveContext(options);
  const diagnostics: MergeDiagnostic[] = [];
  const value = mergeValue(base, delta, ctx, diagnostics, '');
  return { value: value === REMOVE ? undefined : value, diagnostics };
}

function mergeValue(
  base: unknown,
  delta: unknown,
  ctx: MergeContext,
  diagnostics: MergeDiagnostic[],
  path: string,
): unknown {
  if (delta === undefined) return base;
  if (delta === null) return null;

  if (isJsonObject(delta)) {
    const marker = readMarker(delta, ctx);
    if (marker === 'remove') return REMOVE;
    if (marker === 'replace') return stripMarkers(delta, ctx);
  }

  if (isJsonObject(base) && isJsonObject(delta)) {
    return mergeObject(base, delta, ctx, diagnostics, path);
  }
  if (Array.isArray(base) && Array.isArray(delta)) {
    return mergeList(base, delta, ctx, diagnostics, path);
  }
  if (Array.isArray(base) && isJsonObject(delta) && readIdentityWithContext(delta, ctx)) {
    return mergeList(base, [delta], ctx, diagnostics, path);
  }
  if (isJsonObject(base) && Array.isArray(delta) && readIdentityWithContext(base, ctx)) {
    return mergeList([base], delta, ctx, diagnostics, path);
  }
  if (isJsonObject(delta)) {
    return stripMarkers(delta, ctx);
  }
  return delta;
}

function mergeObject(
  base: Record<string, unknown>,
  delta: Record<string, unknown>,
  ctx: MergeContext,
  diagnostics: MergeDiagnostic[],
  path: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(base)) {
    if (isMarkerKey(key, ctx)) continue;
    out[key] = base[key];
  }

  for (const rawKey of Object.keys(delta)) {
    if (isMarkerKey(rawKey, ctx)) continue;

    const forced = ctx.forcePrefix !== undefined && rawKey.startsWith(ctx.forcePrefix);
    const key = forced ? rawKey.slice(ctx.forcePrefix.length) : rawKey;
    if (forced) {
      out[key] = stripIfRecord(delta[rawKey], ctx);
      continue;
    }

    const merged = mergeValue(out[key], delta[rawKey], ctx, diagnostics, joinPath(path, key));
    if (merged === REMOVE) {
      delete out[key];
    } else {
      out[key] = merged;
    }
  }

  return out;
}

function stripIfRecord(value: unknown, ctx: MergeContext): unknown {
  return isJsonObject(value) ? stripMarkers(value, ctx) : value;
}

function mergeList(
  base: readonly unknown[],
  delta: readonly unknown[],
  ctx: MergeContext,
  diagnostics: MergeDiagnostic[],
  path: string,
): unknown[] {
  if (base.length === 0) return delta.slice();
  if (delta.length === 0) return [];

  const kind = classifyListWithContext(base, ctx);
  if (kind !== 'all') {
    diagnostics.push({ code: 'list-not-keyed', path, listKind: kind });
    return delta.slice();
  }

  const baseIndexes = new Map<string, number>();
  for (let i = 0; i < base.length; i++) {
    const key = identityCompositeKey(base[i], ctx);
    if (key === undefined) continue;
    if (baseIndexes.has(key)) {
      const ref = readIdentityWithContext(base[i], ctx);
      diagnostics.push({
        code: 'duplicate-identity',
        path,
        listKind: kind,
        identityKey: ref?.key,
        identityValue: ref?.value,
      });
      continue;
    }
    baseIndexes.set(key, i);
  }

  if (classifyListWithContext(delta, ctx) === 'none') {
    return [...base, ...delta];
  }

  const deltaIndexes = delta.map((item) => {
    const key = identityCompositeKey(item, ctx);
    if (key === undefined) return -1;
    const index = baseIndexes.get(key);
    return index === undefined ? -1 : index;
  });

  const out: unknown[] = [];
  for (const slot of planListMerge(base.length, deltaIndexes)) {
    if (slot.baseIndex >= 0 && slot.deltaIndex >= 0) {
      const merged = mergeValue(
        base[slot.baseIndex],
        delta[slot.deltaIndex],
        ctx,
        diagnostics,
        path,
      );
      if (merged !== REMOVE) out.push(merged);
      continue;
    }
    if (slot.baseIndex >= 0) {
      out.push(base[slot.baseIndex]);
      continue;
    }
    const item = delta[slot.deltaIndex];
    if (isJsonObject(item) && item[ctx.virtualKey] === true) continue;
    out.push(stripIfRecord(item, ctx));
  }

  return out;
}