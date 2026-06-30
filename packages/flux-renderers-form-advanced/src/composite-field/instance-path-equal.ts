import type { InstanceFrame } from '@nop-chaos/flux-core';

/**
 * Value-equality check for render instance paths.
 *
 * Composite-item `React.memo` comparators use this instead of reference equality
 * because an item's `itemInstancePath` array is rebuilt (new reference) whenever
 * the owning collection re-derives its item entries — even for unchanged sibling
 * items. Reference equality would therefore force every sibling to re-render on
 * any single-item mutation (breaking array-item locality), while value equality
 * only triggers a re-render when the path *content* actually drifts (e.g. an
 * outer collection re-parents so the ancestor instance path changes — the O-01
 * correctness case).
 */
export function instancePathEqual(
  a: readonly InstanceFrame[] | undefined,
  b: readonly InstanceFrame[] | undefined,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    const af = a[i]!;
    const bf = b[i]!;
    if (af.repeatedTemplateId !== bf.repeatedTemplateId || af.instanceKey !== bf.instanceKey) {
      return false;
    }
  }
  return true;
}
