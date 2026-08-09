import { formatDate, toStorageDate, type DateOptions } from './date-utils.js';

// ---------------------------------------------------------------------------
// Relative presets (date-range `presets` — BI 相对时间预设)
// ---------------------------------------------------------------------------

/** 相对时间预设档位。运行期解析为绝对区间写入字段值。 */
export type RelativePresetKey =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth';

export interface ResolvedPresetRange {
  start: Date;
  end: Date;
}

function startOfDay(date: Date): Date {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(date: Date): Date {
  const out = new Date(date);
  out.setHours(23, 59, 59, 999);
  return out;
}

/**
 * Resolve a relative preset key into an absolute [start, end] pair (wall-clock
 * local). Day bounds: `today`/`yesterday`/`last7days`/`last30days` are
 * inclusive day ranges anchored at `now`; `thisMonth` spans month start →
 * now; `lastMonth` spans the full previous calendar month. Unknown keys return
 * `undefined` (caller degrades to no preset — Failure Path
 * date-range-preset-invalid). `now` is injectable for deterministic tests.
 */
export function resolveRelativePreset(
  key: string,
  now: Date = new Date(),
): ResolvedPresetRange | undefined {
  switch (key) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'yesterday': {
      const day = new Date(now);
      day.setDate(day.getDate() - 1);
      return { start: startOfDay(day), end: endOfDay(day) };
    }
    case 'last7days': {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case 'last30days': {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    default:
      return undefined;
  }
}

export interface DateRangePresetEntry {
  label: string;
  value:
    | { start: string; end: string }
    | { relative: string };
}

/**
 * Validate raw `presets` schema input. Entries must have a non-empty label and
 * either absolute `{ start, end }` strings or a `{ relative }` key; anything
 * else is dropped (Failure Path date-range-preset-invalid — never throws).
 */
export function sanitizePresets(value: unknown): DateRangePresetEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: DateRangePresetEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const candidate = entry as Record<string, unknown>;
    const label = typeof candidate.label === 'string' && candidate.label !== '' ? candidate.label : undefined;
    if (label === undefined) {
      continue;
    }
    const rawValue = candidate.value as Record<string, unknown> | undefined;
    if (rawValue && typeof rawValue === 'object') {
      if (
        typeof rawValue.start === 'string' &&
        rawValue.start !== '' &&
        typeof rawValue.end === 'string' &&
        rawValue.end !== ''
      ) {
        out.push({ label, value: { start: rawValue.start, end: rawValue.end } });
        continue;
      }
      if (typeof rawValue.relative === 'string' && rawValue.relative !== '') {
        out.push({ label, value: { relative: rawValue.relative } });
        continue;
      }
    }
  }
  return out;
}

/**
 * Resolve a preset entry into storage-formatted absolute range strings.
 * Relative entries go through {@link resolveRelativePreset}; absolute entries
 * pass through unchanged. Unresolvable entries yield `undefined` ends (the
 * caller treats them as no-op / degrade, never throws).
 */
export function resolvePresetEntry(
  entry: DateRangePresetEntry,
  format: string,
  options?: DateOptions,
  now: Date = new Date(),
): { start: string | undefined; end: string | undefined } {
  if ('relative' in entry.value) {
    const resolved = resolveRelativePreset(entry.value.relative, now);
    if (!resolved) {
      return { start: undefined, end: undefined };
    }
    const utc = options?.utc === true;
    return {
      start: formatDate(toStorageDate(resolved.start, utc), format, options),
      end: formatDate(toStorageDate(resolved.end, utc), format, options),
    };
  }
  return { start: entry.value.start, end: entry.value.end };
}
