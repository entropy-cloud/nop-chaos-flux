/**
 * Shared step-style index resolution (cq-3 Phase 5) — previously duplicated
 * across steps-renderer/timeline-renderer. `keyOf` absorbs the one semantic
 * difference: steps matches `item.value ?? item.key`, timeline matches
 * `item.value` only. The ownership hooks stay per-renderer on purpose (their
 * fallback chains diverge by documented adjudication).
 */
function clampIndex(idx: number, count: number): number {
  if (count <= 0) return 0;
  if (idx < 0) return 0;
  if (idx > count - 1) return count - 1;
  return idx;
}

function asNumericIndex(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function resolveCurrentIndex<T>(
  value: unknown,
  items: T[],
  keyOf: (item: T) => unknown,
): number {
  if (items.length === 0) return -1;
  if (value !== undefined && value !== null) {
    const target = String(value);
    for (let i = 0; i < items.length; i++) {
      const key = keyOf(items[i]);
      if (key !== undefined && key !== null && String(key) === target) return i;
    }
  }
  const numeric = asNumericIndex(value);
  if (numeric !== undefined) return clampIndex(numeric, items.length);
  return -1;
}

export function resolveFinalIndex<T>(
  current: unknown,
  fallback: unknown,
  items: T[],
  keyOf: (item: T) => unknown,
): number {
  let idx = resolveCurrentIndex(current, items, keyOf);
  if (idx < 0) idx = resolveCurrentIndex(fallback, items, keyOf);
  if (idx < 0) idx = 0;
  return idx;
}
