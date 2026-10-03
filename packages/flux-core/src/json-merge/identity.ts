import { isPlainObject } from '../utils/object.js';

/**
 * JSON 语义域的对象判定：仅接受原型为 Object.prototype（或 null）的普通对象。
 * Date / class instance 等按标量处理（plan 526 Failure Paths「非 plain object
 * 输入视为标量」）——toString tag 无法区分 class instance，故按原型链判定。
 */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
import type { IdentityRef, JsonMergeOptions, ListIdentityKind, MergeContext } from './types.js';
import { resolveContext } from './types.js';

function compositeKey(ref: IdentityRef): string {
  return `${ref.key}\u0000${ref.value}`;
}

function readIdentityWithContext(value: unknown, ctx: MergeContext): IdentityRef | undefined {
  if (!isPlainObject(value)) return undefined;

  const attrKey = value[ctx.uniqueAttrKey];
  if (typeof attrKey === 'string' && attrKey.length > 0) {
    const inner = value[attrKey];
    if (inner === undefined || inner === null || inner === '' || typeof inner === 'object') {
      return undefined;
    }
    return { key: attrKey, value: String(inner) };
  }

  for (const key of ctx.identityKeys) {
    const raw = value[key];
    if (raw === undefined || raw === null || raw === '' || typeof raw === 'object') continue;
    return { key, value: String(raw) };
  }

  return undefined;
}

function classifyListWithContext(
  list: readonly unknown[],
  ctx: MergeContext,
): ListIdentityKind {
  if (list.length === 0) return 'none';
  let keyed = 0;
  for (const item of list) {
    if (readIdentityWithContext(item, ctx)) keyed++;
  }
  if (keyed === 0) return 'none';
  return keyed === list.length ? 'all' : 'some';
}

/**
 * Resolve an element's identity from the data. The indirect-addressing key wins
 * first, then the configured chain in order. Empty, null, and non-scalar values
 * carry no identity — an element may legitimately omit one.
 */
export function readIdentity(value: unknown, options?: JsonMergeOptions): IdentityRef | undefined {
  return readIdentityWithContext(value, resolveContext(options));
}

/** How much of a list carries identity, decided at runtime from the elements. */
export function classifyList(
  list: readonly unknown[],
  options?: JsonMergeOptions,
): ListIdentityKind {
  return classifyListWithContext(list, resolveContext(options));
}

export function identityCompositeKey(value: unknown, ctx: MergeContext): string | undefined {
  const ref = readIdentityWithContext(value, ctx);
  return ref ? compositeKey(ref) : undefined;
}

export { classifyListWithContext, readIdentityWithContext };